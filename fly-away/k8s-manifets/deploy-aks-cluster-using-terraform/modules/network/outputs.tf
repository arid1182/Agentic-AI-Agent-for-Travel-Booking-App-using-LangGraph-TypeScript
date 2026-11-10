output "vnet_id" { value = azurerm_virtual_network.main.id }
output "vnet_name" { value = azurerm_virtual_network.main.name }
output "aks_subnet_id" { value = azurerm_subnet.aks.id }
output "fw_subnet_id" { value = azurerm_subnet.fw.id }
output "api_server_subnet_id" { value = var.enable_api_server_subnet ? azurerm_subnet.api[0].id : null }
