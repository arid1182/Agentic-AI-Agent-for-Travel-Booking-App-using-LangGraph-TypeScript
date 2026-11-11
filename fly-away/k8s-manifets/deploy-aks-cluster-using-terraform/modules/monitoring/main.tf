resource "azurerm_log_analytics_workspace" "main" {
    name                = "law-${var.name_prefix}-aks"
    location            = var.location
    resource_group_name = var.resource_group_name
    sku                 = "PerGB2018"
    retention_in_days   = var.retention_days
    daily_quota_gb      = 3 # 3 GB per day is sufficient for dev/test environments. For production, consider increasing this limit based on your monitoring needs.
    tags                = var.tags
}

resource "azurerm_monitor_workspace" "prom" {
    count = var.enable_prometheus ? 1 : 0

    name                = "amw-${var.name_prefix}-aks"
    resource_group_name = var.resource_group_name
    location            = var.location
    tags                = var.tags
}