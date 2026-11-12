# ----------------------------------------------------
# Key Vault + key for etcd (KMSv2) encryption at rest
# ----------------------------------------------------

resource "random_string" "kv_suffix" {
    length  = 4
    special = false
    lower = true
    upper = false
    numeric = true
}

resource "azurerm_key_vault" "etcd" {
    name                        = "kv-${var.name_prefix}-${random_string.kv_suffix.result}"
    location                    = var.location
    resource_group_name         = var.resource_group_name
    rbac_authorization_enabled  = true
    enabled_for_disk_encryption = false
    tenant_id                   = var.tenant_id
    soft_delete_retention_days  = 10     # min 90 days for prod
    purge_protection_enabled    = false  
    sku_name = "standard"

    network_acls {
        default_action = "Deny"
        bypass = "AzureServices"
    }

    tags = var.tags
}

resource "azurerm_user_assigned_identity" "kms" {
    location            = var.location
    name                = "id-${local.cluster_name}-kms"
    resource_group_name = var.resource_group_name
    tags = var.tags
}


resource "azurerm_key_vault_key" "etcd" {
    name         = "etcd-encryption"
    key_vault_id = azurerm_key_vault.etcd.id
    key_type     = "RSA-HSM"
    key_size     = 2048
    key_opts = [
        "decrypt",
        "encrypt",
        "sign",
        "unwrapKey",
        "verify",
        "wrapKey",
    ]
    rotation_policy {
        automatic {
        time_before_expiry = "P30D"
        }

        expire_after         = "P2Y"
        notify_before_expiry = "P29D"
    }
}

resource "azurerm_role_assignment" "kms_key_access" {
    scope                = azurerm_key_vault.etcd.id
    role_definition_name = "Key Vault Crypto User"
    principal_id         = azurerm_user_assigned_identity.kms.principal_id
}