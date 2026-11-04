#!/bin/bash
set -euo pipefail

# Retrieve OIDC Issuer URL
OIDC_ISSUER=$(az aks show -g $RESOURCE_GROUP -n $CLUSTER_NAME --query "oidcIssuerProfile.issuerUrl" -o tsv)
