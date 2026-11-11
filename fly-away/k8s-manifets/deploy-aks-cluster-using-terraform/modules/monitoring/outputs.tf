output "log_analytics_workspace_id" { value = azurerm_log_analytics_workspace.main.id }
output "monitor_workspace_id" { value = var.enable_prometheus ? azurerm_monitor_workspace.prom[0].id : "" }