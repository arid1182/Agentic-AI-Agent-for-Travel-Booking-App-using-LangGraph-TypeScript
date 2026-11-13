resource "azurerm_resource_group" "main" {
    name     = "rg-${local.name_prefix}-aks"
    location = var.location
    tags     = local.common_tags
}

module "network" {
    source = "./modules/network"

    name_prefix        = local.name_prefix
    location           = var.location
    resource_group_name = azurerm_resource_group.main.name
    address_space      = var.vnet_address_space[0]
    aks_subnet_cidr    = local.aks_subnet
    api_subnet_cidr    = local.api_subnet
    firewall_private_ip = local.firewall_hop
    enable_api_server_subnet = var.enable_api_server_vnet_integration

    tags = local.common_tags
    }

module "monitoring" {
    source = "./modules/monitoring"

    name_prefix         = local.name_prefix
    location            = var.location
    resource_group_name = azurerm_resource_group.main.name
    retention_days      = var.log_retention_days
    enable_prometheus   = var.enable_managed_prometheus

    tags = local.common_tags
    }

module "aks" {
    source = "./modules/aks"

    name_prefix         = local.name_prefix
    location            = var.location
    resource_group_name = azurerm_resource_group.main.name
    tenant_id           = var.tenant_id

    aks_subnet_id      = module.network.aks_subnet_id
    api_server_subnet_id = var.enable_api_server_vnet_integration ? module.network.api_server_subnet_id : null

    kubernetes_version  = var.kubernetes_version
    service_cidr        = var.service_cidr
    pod_cidr            = var.pod_cidr
    dns_service_ip      = var.dns_service_ip
    outbound_type       = var.outbound_type
    ebpf_data_plane     = var.ebpf_data_plane

    private_cluster_enabled            = var.private_cluster_enabled
    enable_api_server_vnet_integration = var.enable_api_server_vnet_integration
    api_server_authorized_ip_ranges    = var.api_server_authorized_ip_ranges

    admin_group_object_ids = var.admin_group_object_ids
    log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id
    enable_prometheus_data_collection = var.enable_managed_prometheus
    monitor_workspace_id              = var.enable_managed_prometheus ? module.monitoring.monitor_workspace_id : null

    system_node_pool = var.system_node_pool
    user_node_pools  = var.user_node_pools

    tags = local.common_tags
}

resource "azurerm_container_registry" "main" {
    count = var.create_acr ? 1 : 0

    name                = "acr${replace(local.name_prefix, "-", "")}"
    resource_group_name = azurerm_resource_group.main.name
    location            = var.location
    sku                 = "Premium"
    admin_enabled       = false
    tags                = local.common_tags
}

resource "azurerm_role_assignment" "acr_pull" {
    count = var.create_acr ? 1 : 0

    scope                            = azurerm_container_registry.main[0].id
    role_definition_name             = "AcrPull"
    principal_id                     = module.aks.kubelet_identity_object_id
    skip_service_principal_aad_check = true
}
