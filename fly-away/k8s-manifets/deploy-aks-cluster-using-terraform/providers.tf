provider "azurerm" {
    subscription_id = var.subscription_id
    
    features {
        resource_group {
            prevent_deletion_if_contains_resources = false # true for prod
        }
        key_vault {
            purge_soft_delete_on_destroy               = true # false for prod
            recover_soft_deleted_key_vaults            = false # true for prod
            purge_soft_deleted_certificates_on_destroy = true # false for prod
            purge_soft_deleted_keys_on_destroy         = true # false for prod
            purge_soft_deleted_secrets_on_destroy      = true # false for prod
            }
    }
}