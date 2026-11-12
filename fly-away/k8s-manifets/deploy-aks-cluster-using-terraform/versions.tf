terraform {
    required_version = ">= 1.6.0"

    required_providers {
        azurearm = {
            source = "hashicorp/azurearm"
            version = "~> 4.60"
        }

        random = {
            source = "hashicorp/random"
            version = "~> 3.6"
        }
    }

    # Remote tfstate file
    backend "azurerm" {
        resource_group_name = "rg-prod-flyaway"
        storage_account_name = "tfsate-prod-flyaway"
        container_name = "flyaway-cluster-manager"
        key = "flyaway-prod.tfstate"
        use_oid = true
        use_azuread_auth = true
    }
}