#!/bin/bash
set -euo pipefail

# Retrieve OIDC Issuer URL
OIDC_ISSUER=$(az aks show -g $RESOURCE_GROUP -n $CLUSTER_NAME --query "oidcIssuerProfile.issuerUrl" -o tsv)

# Create a user-assigned managed identity
az identity create -g $RESOURCE_GROUP -n kv-reader-identity
CLIENT_ID=$(az identity show -g $RESOURCE_GROUP -n kv-reader-identity --query clientId -o tsv)
PRINCIPAL_ID=$(az identity show -g $RESOURCE_GROUP -n kv-reader-identity --query principalId -o tsv)


# Assign the role on the Key Vault
Key_Vault_ID=$(az keyvault show -n kv-aks-flyaway-20698 --query id -o tsv)
az role assignment create \
  --assignee-object-id $PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope $Key_Vault_ID
  

# Create the federated credential
az identity federated-credential create \
  --name flyaway-fed-cred \
  --identity-name kv-reader-identity \
  --resource-group $RESOURCE_GROUP \
  --issuer $OIDC_ISSUER \
  --subject system:serviceaccount:default:flyaway-sa \
  --audience api://AzureADTokenExchange
 
