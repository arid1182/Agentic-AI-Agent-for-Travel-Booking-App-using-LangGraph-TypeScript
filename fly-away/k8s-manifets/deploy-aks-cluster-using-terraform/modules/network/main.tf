resource "azurerm_virtual_network" "main" {
    name                = "vnet-${var.name_prefix}-aks"
    address_space       = [var.address_space]
    location            = var.location
    resource_group_name = var.resource_group_name
    tags = var.tags
}

resource "azurerm_subnet" "aks" {
    name    = "snet-aks-nodes"
    resource_group_name = var.resource_group_name
    virtual_network_name = azurerm_virtual_network.main.name
    address_prefixes    = [var.aks_subnet_cidr]

}

resource "azurerm_subnet" "api" {
    count = var.enable_api_server_subnet ? 1 : 0
    name = "snet-api-aks"
    resource_group_name = var.resource_group_name
    virtual_network_name = azurerm_virtual_network.main.name
    address_prefixes = [var.api_subnet_cidr]

    delegation {
        name = "aks-apiserver"
        service_delegation {
            name = "Microsoft.ContainerService/managedClusters"
            actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
        }
    }

}

resource "azurerm_network_security_group" "aks" {
    name = "nsg-${var.name_prefix}-aks"
    resource_group_name = var.resource_group_name
    location = var.location
    tags = var.tags
}

# VNet-internal traffic (kubelet, CNI overlay tunnel, NodePort range)
resource "azurerm_network_security_rule" "allow_vnet" {
    name                        = "AllowVnetInbound"
    priority                    = 100
    direction                   = "Inbound"
    access                      = "Allow"
    protocol                    = "*"
    source_port_range           = "*"
    destination_port_range      = "*"
    source_address_prefix       = "VirtualNetwork"
    destination_address_prefix  = "VirtualNetwork"
    resource_group_name         = var.resource_group_name
    network_security_group_name = azurerm_network_security_group.aks.name
}

# Azure Load Balancer health probes (required with UDR / standard LB)
resource "azurerm_network_security_rule" "allow_lb_probes" {
    name                        = "AllowAzureLoadBalancerProbes"
    priority                    = 110
    direction                   = "Inbound"
    access                      = "Allow"
    protocol                    = "Tcp"
    source_port_range           = "*"
    destination_port_range      = "65200-65535"
    source_address_prefix       = "AzureLoadBalancer"
    destination_address_prefix  = "VirtualNetwork"
    resource_group_name         = var.resource_group_name
    network_security_group_name = azurerm_network_security_group.aks.name
}

resource "azurerm_subnet_network_security_group_association" "aks" {
    subnet_id                 = azurerm_subnet.aks.id
    network_security_group_id = azurerm_network_security_group.aks.id
}

# UDR for forced tunneling via Azure Firewall / NVA (optional)
resource "azurerm_route_table" "main" {
    count = var.firewall_private_ip != null ? 1 : 0
    name                = "rt-${var.name_prefix}-aks"
    location            = var.location
    resource_group_name = var.resource_group_name
    tags                = var.tags
}

resource "azurerm_route" "default_via_firewall" {
    count = var.firewall_private_ip != null ? 1 : 0

    name                   = "default-via-firewall"
    resource_group_name    = var.resource_group_name
    route_table_name       = azurerm_route_table.main[0].name
    address_prefix         = "0.0.0.0/0"
    next_hop_type          = "VirtualAppliance"
    next_hop_in_ip_address = var.firewall_private_ip
}

resource "azurerm_subnet_route_table_association" "aks" {
    count = var.firewall_private_ip != null ? 1 : 0

    subnet_id      = azurerm_subnet.aks.id
    route_table_id = azurerm_route_table.main[0].id
}