#!/bin/bash
set -euo pipefail

export SUBSCRIPTION_ID="917502bc-868d-4be8-ad09-68d765b05516"
export TENANT_ID="65a98dc0-7ee5-451c-9a05-61a30b4b9f48"
export RESOURCE_GROUP="rg-flyaway"
export LOCATION="eastus"

export VNET_NAME="vnet-aks-prod"
export VNET_CIDR="10.240.0.0/15"
export AKS_SUBNET_NAME="snet-aks-prod"
export AKS_SUBNET_CIDR="10.240.0.0/16"
export SVC_SUBNET_NAME="snet-svc-prod"
export SVC_SUBNET_CIDR="10.241.0.0/16"
export POD_CIDR="10.244.0.0/16"
export SERVICE_CIDR="10.245.0.0/16"
export DNS_SERVICE_IP="10.245.0.10"

export CLUSTER_NAME="aks-prod-flyaway"
export KUBERNETES_VERSION="1.34.0"
export DNS_PREFIX="aks-prod-flyaway"
export NETWORK_PLUGIN="azure"
export NETWORK_PLUGIN_MODE="overlay"

export SYSTEM_NODE_SIZE="Standard_B2s"
export SYSTEM_NODE_COUNT=1
export WORKER_NODE_SIZE="Standard_B2s"
export WORKER_MIN_COUNT=1
export WORKER_MAX_COUNT=2

export ACR_NAME="acrflyawayprod$RANDOM"
export LOG_WORKSPACE="law-aks-prod-flyaway"
export KEY_VAULT_NAME="kv-aks-flyaway-$RANDOM"