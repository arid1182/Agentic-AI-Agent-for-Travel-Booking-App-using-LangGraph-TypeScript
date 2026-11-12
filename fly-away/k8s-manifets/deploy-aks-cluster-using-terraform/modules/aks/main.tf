# ---------------------------------------------------------------------------
# Key Vault + key for etcd (KMSv2) encryption at rest
# ---------------------------------------------------------------------------
resource "random_string" "kv_suffix" {
    length  = 4
    upper   = false
    lower   = true
    numeric = true
    special = false
}

resource "azurerm_key_vault" "etcd" {
    name                = "kv-${var.name_prefix}-${random_string.kv_suffix.result}"
    location            = var.location
    resource_group_name = var.resource_group_name
    tenant_id           = var.tenant_id
    sku_name            = "standard"

    rbac_authorization_enabled   = true
    purge_protection_enabled    = true
    soft_delete_retention_days  = 90
    public_network_access_enabled = true # deny-by-default ACLs below; add your pipeline runner IP via ip_rules if needed

    network_acls {
        default_action = "Deny"
        bypass         = "AzureServices"
    }

    tags = var.tags
}

resource "azurerm_user_assigned_identity" "kms" {
    name                = "id-${local.cluster_name}-kms"
    location            = var.location
    resource_group_name = var.resource_group_name
    tags                = var.tags
}

resource "azurerm_key_vault_key" "etcd" {
    name         = "etcd-encryption"
    key_vault_id = azurerm_key_vault.etcd.id
    key_type     = "RSA-HSM"
    key_size     = 2048
    key_opts     = ["decrypt", "encrypt", "sign", "unwrapKey", "verify", "wrapKey"]

    rotation_policy {
        automatic {
        time_before_expiry = "P30D"
        }
        expire_after         = "P2Y"
        notify_before_expiry = "P29D"
    }
}

resource "azurerm_role_assignment" "kms_key_access" {
    scope                = azurerm_key_vault.etcd.id
    role_definition_name = "Key Vault Crypto User"
    principal_id         = azurerm_user_assigned_identity.kms.principal_id
}

# ---------------------------------------------------------------------------
# AKS cluster
# ---------------------------------------------------------------------------
resource "azurerm_kubernetes_cluster" "main" {
    name                = local.cluster_name
    location            = var.location
    resource_group_name = var.resource_group_name
    dns_prefix          = local.cluster_name
    kubernetes_version  = local.k8s_version
    node_resource_group = "rg-${local.cluster_name}-nodes"

    sku_tier                    = "Standard" # financially-backed 99.95% SLA
    automatic_channel_upgrade   = "patch"
    node_os_upgrade_channel     = "NodeImage"
    node_provisioning_mode      = "Auto"
    image_cleaner_enabled       = true
    image_cleaner_interval_hours = 24
    run_command_enabled         = false
    local_account_disabled      = true
    cost_analysis_enabled       = true

    # --- API server access ---
    private_cluster_enabled       = var.private_cluster_enabled
    private_dns_zone_id           = var.private_cluster_enabled ? "System" : null
    public_network_access_enabled = var.private_cluster_enabled ? false : true

    api_server_access_profile {
        authorized_ip_ranges     = var.private_cluster_enabled ? [] : var.api_server_authorized_ip_ranges
        vnet_integration_enabled = var.private_cluster_enabled && var.enable_api_server_vnet_integration
        subnet_id                = var.enable_api_server_vnet_integration ? var.api_server_subnet_id : null
    }

    # --- Identity & security ---
    identity { type = "SystemAssigned" }

    role_based_access_control_enabled = true
    azure_active_directory_role_based_access_control {
        managed                = true
        tenant_id              = var.tenant_id
        admin_group_object_ids = var.admin_group_object_ids
        azure_rbac_enabled     = true
    }

    workload_identity_enabled = true
    oidc_issuer_enabled       = true

    azure_policy_profile {
        enabled = true
    }

    microsoft_defender {
        log_analytics_workspace_id = var.log_analytics_workspace_id
    }

    key_vault_secrets_provider {
        secret_rotation_enabled  = true
        secret_rotation_interval = "2m"
    }

    key_management_service {
        key_vault_key_id = azurerm_key_vault_key.etcd.id
        identity_uai     = azurerm_user_assigned_identity.kms.id
    }

    oms_agent {
        log_analytics_workspace_id      = var.log_analytics_workspace_id
        msi_auth_for_monitoring_enabled = true
    }

    dynamic "monitor_metrics" {
        for_each = var.enable_prometheus_data_collection ? [1] : []
        content {
        annotations_allowed = "*"
        labels_allowed      = "*"
        }
    }

    # --- Networking (Azure CNI Overlay) ---
    network_profile {
        network_plugin      = "azure"
        network_plugin_mode = "overlay"
        ebpf_data_plane     = var.ebpf_data_plane
        pod_cidr            = var.pod_cidr
        service_cidr        = var.service_cidr
        dns_service_ip      = var.dns_service_ip
        outbound_type       = var.outbound_type
        load_balancer_sku   = "standard"
    }

    auto_scaler_profile {
        balance_similar_node_groups      = true
        expander                         = "least-waste"
        max_graceful_termination_sec     = 600
        scale_down_utilization_threshold = 0.5
        skip_nodes_with_local_storage    = false
        skip_nodes_with_system_pods      = true
        }
        node_provisioning_profile {
        mode               = "Auto"
        default_node_pools = "Auto" # Creates default Karpenter pools automatically
    }

    # --- System node pool ---
    default_node_pool {
        name                          = "system"
        vm_size                       = var.system_node_pool.vm_size
        vnet_subnet_id                = var.aks_subnet_id
        zones                         = ["1", "2", "3"]
        enable_auto_scaling           = true
        min_count                     = var.system_node_pool.min_count
        max_count                     = var.system_node_pool.max_count
        max_pods                      = var.system_node_pool.max_pods
        os_disk_type                  = "Ephemeral"
        os_disk_size_gb               = var.system_node_pool.os_disk_size_gb
        os_sku                        = var.system_node_pool.os_sku
        node_labels                   = { "kubernetes.azure.com/mode" = "system" }
        node_taints                   = ["CriticalAddonsOnly=true:NoSchedule"]
        only_critical_addons_enabled  = true
        orchestrator_version          = local.k8s_version
        temporary_name_for_rotation   = "systemtmp"

        upgrade_settings {
        max_surge                     = "33%"
        drain_timeout_in_minutes      = 30
        node_soak_duration_in_minutes = 0
        }
    }

    # --- Maintenance windows ---
    maintenance_window_auto_upgrade {
        frequency   = "Weekly"
        interval    = 1
        duration    = 4
        day_of_week = "Sunday"
        start_time  = "02:00"
        utc_offset  = "+01:00"
    }

    maintenance_window_node_os {
        frequency   = "Weekly"
        interval    = 1
        duration    = 4
        day_of_week = "Sunday"
        start_time  = "06:00"
        utc_offset  = "+01:00"
    }

    lifecycle {
        ignore_changes = [default_node_pool[0].node_count]
        precondition {
        condition     = var.private_cluster_enabled || length(var.api_server_authorized_ip_ranges) > 0
        error_message = "api_server_authorized_ip_ranges must be set when the cluster is not private."
        }
        precondition {
        condition     = !var.enable_api_server_vnet_integration || (var.private_cluster_enabled && var.api_server_subnet_id != null)
        error_message = "API server VNet integration requires a private cluster and api_server_subnet_id."
        }
        precondition {
        condition     = var.system_node_pool.max_count >= var.system_node_pool.min_count
        error_message = "System node pool max_count must be >= min_count."
        }
        precondition {
        condition     = alltrue([for p in var.user_node_pools : p.max_count >= p.min_count])
        error_message = "Every user node pool must have max_count >= min_count."
        }
    }

    tags = var.tags

    depends_on = [azurerm_role_assignment.kms_key_access]
    }

# ---------------------------------------------------------------------------
# User node pools
# ---------------------------------------------------------------------------
resource "azurerm_kubernetes_cluster_node_pool" "user" {
    for_each = var.user_node_pools

    name                  = each.key
    kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
    vm_size               = each.value.vm_size
    vnet_subnet_id        = var.aks_subnet_id
    zones                 = each.value.zones
    mode                  = "User"
    priority              = "Regular"
    enable_auto_scaling   = true
    min_count             = each.value.min_count
    max_count             = each.value.max_count
    max_pods              = each.value.max_pods
    os_disk_type          = "Ephemeral"
    os_disk_size_gb       = each.value.os_disk_size_gb
    os_sku                = each.value.os_sku
    node_labels           = each.value.node_labels
    node_taints           = each.value.node_taints
    orchestrator_version  = local.k8s_version

    upgrade_settings {
        max_surge                     = "33%"
        drain_timeout_in_minutes      = 30
        node_soak_duration_in_minutes = 0
    }

    tags = var.tags
}

# ---------------------------------------------------------------------------
# RBAC: cluster identity needs Network Contributor on the node subnet
# ---------------------------------------------------------------------------
resource "azurerm_role_assignment" "network_contributor" {
    scope                            = var.aks_subnet_id
    role_definition_name             = "Network Contributor"
    principal_id                     = azurerm_kubernetes_cluster.main.identity[0].principal_id
    skip_service_principal_aad_check = true
}

# ---------------------------------------------------------------------------
# Auditing + guard rail
# ---------------------------------------------------------------------------
resource "azurerm_monitor_diagnostic_setting" "aks" {
    name                       = "diag-aks-control-plane"
    target_resource_id         = azurerm_kubernetes_cluster.main.id
    log_analytics_workspace_id = var.log_analytics_workspace_id

    enabled_log {
        category_group = "audit"
    }
    enabled_log {
        category_group = "allLogs"
    }
    enabled_metric {
        category = "AllMetrics"
    }
}

resource "azurerm_management_lock" "cluster" {
    name       = "CanNotDelete"
    scope      = azurerm_kubernetes_cluster.main.id
    lock_level = "CanNotDelete"
    notes      = "AKS production cluster - deletion requires lock removal by platform team."
}

# ---------------------------------------------------------------------------
# Managed Prometheus: data collection rule + association
# ---------------------------------------------------------------------------
resource "azurerm_monitor_data_collection_rule" "prom" {
    count = var.enable_prometheus_data_collection ? 1 : 0

    name                = "dcr-${local.cluster_name}-prom"
    location            = var.location
    resource_group_name = var.resource_group_name
    kind                = "Linux"

    destinations {
        monitor_account {
        monitor_account_id = var.monitor_workspace_id
        name                 = "prometheus"
        }
    }

    data_sources {
        prometheus_forwarder {
        name    = "prometheus"
        streams = ["Microsoft-PrometheusMetrics"]
        }
    }

    data_flow {
        streams      = ["Microsoft-PrometheusMetrics"]
        destinations = ["prometheus"]
    }

    tags = var.tags
}

resource "azurerm_monitor_data_collection_rule_association" "prom" {
    count = var.enable_prometheus_data_collection ? 1 : 0

    name                    = "dcr-prom-aks"
    target_resource_id      = azurerm_kubernetes_cluster.main.id
    data_collection_rule_id = azurerm_monitor_data_collection_rule.prom[0].id
}
