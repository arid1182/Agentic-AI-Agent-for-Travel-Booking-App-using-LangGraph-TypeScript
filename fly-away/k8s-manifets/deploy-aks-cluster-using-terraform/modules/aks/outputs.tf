output "cluster_id" { value = azurerm_kubernetes_cluster.main.id }
output "cluster_name" { value = azurerm_kubernetes_cluster.main.name }
output "private_fqdn" { value = azurerm_kubernetes_cluster.main.private_fqdn }
output "oidc_issuer_url" { value = azurerm_kubernetes_cluster.main.oidc_issuer_url }
output "kubelet_identity_object_id" { value = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id }
output "etcd_key_vault_id" { value = azurerm_key_vault.etcd.id }
output "cluster_identity_principal_id" { value = azurerm_kubernetes_cluster.main.identity[0].principal_id }