terraform {
    required_version = ">= 1.6.0"

    required_providers {
        azurerm = {
            source = "hashicorp/azurerm"
            version = "~> 5.13.0"
        }

        random = {
            source = "hashicorp/random"
            version = "~> 3.6"
        }
    }

    # Remote tfstate file
    backend "azurerm" {
        resource_group_name = "rg-prod-flyaway"
        storage_account_name = "tfsateprodflyaway"
        container_name = "flyaway-cluster-manager"
        key = "flyaway-prod.tfstate"
        use_oidc = true
        use_azuread_auth = true
    }
}