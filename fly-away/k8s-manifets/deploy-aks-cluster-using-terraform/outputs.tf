output "resource_group_name" {
    description = "Resource group holding the AKS platform."
    value       = azurerm_resource_group.main.name
}

output "cluster_name" {
    description = "AKS cluster name."
    value       = module.aks.cluster_name
}

output "cluster_id" {
    description = "AKS cluster resource ID."
    value       = module.aks.cluster_id
}

output "private_fqdn" {
    description = "Private API server FQDN (empty when public)."
    value       = module.aks.private_fqdn
}

output "oidc_issuer_url" {
    description = "OIDC issuer URL for workload identity federation."
    value       = module.aks.oidc_issuer_url
}

output "kubelet_identity_object_id" {
    description = "Object ID of the kubelet managed identity."
    value       = module.aks.kubelet_identity_object_id
}

output "etcd_key_vault_id" {
    description = "Key Vault holding the etcd KMS key."
    value       = module.aks.etcd_key_vault_id
}

output "log_analytics_workspace_id" {
    description = "Log Analytics workspace resource ID."
    value       = module.monitoring.log_analytics_workspace_id
}

output "monitor_workspace_id" {
    description = "Azure Monitor workspace ID for managed Prometheus (empty if disabled)."
    value       = module.monitoring.monitor_workspace_id
}

output "acr_login_server" {
    description = "ACR login server (empty if not created)."
    value       = var.create_acr ? azurerm_container_registry.main[0].login_server : ""
}
