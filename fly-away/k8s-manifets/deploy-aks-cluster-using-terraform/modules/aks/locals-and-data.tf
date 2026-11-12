data "azurerm_client_config" "current" {
}
output "account_id" {
    value = data.azurerm_client_config.current.client_id
}

data "azurerm_kubernetes_service_versions" "current" {
    location = var.location
    version_prefix = var.kubernetes_version != null ? var.kubernetes_version : ""
    include_preview = false
}

locals {
    cluster_name = "aks-${var.name_prefix}"
    k8s_version = var.kubernetes_version != null ? var.kubernetes_version : data.azurerm_kubernetes_service_versions.current.latest_version
}