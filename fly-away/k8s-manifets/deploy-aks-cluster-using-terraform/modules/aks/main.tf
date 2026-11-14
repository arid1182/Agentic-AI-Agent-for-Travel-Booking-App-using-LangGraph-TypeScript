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

    key_opts = ["decrypt", "encrypt", "sign", "unwrapKey", "verify", "wrapKey"]

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
    role_definition_name = "Key Vault Crypto Officer"
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
    automatic_upgrade_channel   = "patch"
    node_os_upgrade_channel     = "NodeImage"
    image_cleaner_enabled       = true
    image_cleaner_interval_hours = 24
    node_provisioning_profile {
        mode = "Auto"
        default_node_pools = "Auto"
    }
    run_command_enabled         = false
    local_account_disabled      = true
    cost_analysis_enabled       = true

    # --- API server access ---
    private_cluster_enabled       = var.private_cluster_enabled
    private_dns_zone_id           = var.private_cluster_enabled ? "System" : null

    api_server_access_profile {
        authorized_ip_ranges     = var.private_cluster_enabled ? [] : var.api_server_authorized_ip_ranges
    }

    # --- Identity & security ---
    identity { type = "SystemAssigned" }

    role_based_access_control_enabled = true
    azure_active_directory_role_based_access_control {
        tenant_id              = var.tenant_id
        admin_group_object_ids = var.admin_group_object_ids
        azure_rbac_enabled     = true
    }

    workload_identity_enabled = true
    oidc_issuer_enabled       = true

    # --- Networking (Azure CNI Overlay) ---
    network_profile {
        network_plugin      = "azure"
        network_plugin_mode = "overlay"
        pod_cidr            = var.pod_cidr
        service_cidr        = var.service_cidr
        dns_service_ip      = var.dns_service_ip
        outbound_type       = var.outbound_type
        load_balancer_sku   = "standard"
    }

    # --- Auto scaler profile ---
    auto_scaler_profile {
        balance_similar_node_groups      = true
        expander                         = "least-waste"
        max_graceful_termination_sec     = 600
        scale_down_utilization_threshold = 0.5
        skip_nodes_with_local_storage    = false
        skip_nodes_with_system_pods      = true
    }

    # --- Default node pool (required by provider validation) ---
    default_node_pool {
        name                          = "system"
        vm_size                       = var.system_node_pool.vm_size
        vnet_subnet_id                = var.aks_subnet_id
        zones                         = ["1", "2", "3"]
        min_count                     = var.system_node_pool.min_count
        max_count                     = var.system_node_pool.max_count
        os_disk_type                  = "Ephemeral"
        only_critical_addons_enabled  = true

        upgrade_settings {
            max_surge                     = "33%"
            drain_timeout_in_minutes      = 30
            node_soak_duration_in_minutes = 0
        }
    }

    tags = var.tags
}

# ---------------------------------------------------------------------------
# Standalone node pools (required for azurerm provider >= 5.0)
# In provider 5.x+, default node pool and user node pools must be defined as
# standalone azurerm_kubernetes_cluster_node_pool resources instead of inline
# blocks within azurerm_kubernetes_cluster.
# ---------------------------------------------------------------------------

# User node pools (one per entry in var.user_node_pools)
resource "azurerm_kubernetes_cluster_node_pool" "user" {
    for_each = var.user_node_pools

    name                  = each.key
    kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id

    vm_size               = each.value.vm_size
    vnet_subnet_id        = var.aks_subnet_id
    zones                 = each.value.zones != null ? each.value.zones : ["1", "2", "3"]
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
