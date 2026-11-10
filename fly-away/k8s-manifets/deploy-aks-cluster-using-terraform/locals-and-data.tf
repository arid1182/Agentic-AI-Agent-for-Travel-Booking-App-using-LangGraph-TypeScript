locals {
    name_prefix = "${var.prefix}-${var.environment}"

    common_tags = merge(var.tags, {
            Environment = var.environment
            ManagedBy   = "Terraform"
            Project     = "aks-cluster-flyaway"
        }
    )
    # VNet CIDR plan (single source of truth, sliced here)
    vnet_cidr = var.vnet_address_space[0]
    aks_subnet = cidrsubnet(local.vnet_cidr, 8, 1) # /24 node subnet (overlay: pods don't consume VNet IPs)
    api_subnet = cidrsubnet(local.vnet_cidr, 8, 2) # /24 API server VNet integration
    fw_subnet = cidrsubnet(local.vnet_cidr, 8, 3) # /24 firewall VNet integration
    firewall_hop = var.firewall_private_ip != null && var.firewall_private_ip != "" ? var.firewall_private_ip : null
}
