!#/bin/bash

export SUBSCRIPTION_ID="your-subscription-id" \
    export TENANT_ID="your-tenant-id" \


export RESOURCE_GROUP="rg-flyaway" \
    export LOCATION="eastus" \


export VNET_NAME="vnet-aks-prod"
export VNET_CIDR="10.0.0.0/8"
export AKS_SUBNET_NAME="snet-aks-prod"
export AKS_SUBNET_CIDR="10.240.0.0/16"
export SVC_SUBNET_NAME="snet-svc-prod"
export SVC_SUBNET_CIDR="10.241.0.0/16"
export POD_CIDR="10.244.0.0/16"
export SERVICE_CIDR="10.245.0.0/16"
export DNS_SERVICE_IP="10.245.0.10"


export CLUSTER_NAME="aks-prod-flyaway"
export KUBERNETES_VERSION="1.30.0"
export DNS_PREFIX="aks-prod-flyaway"


export SYSTEM_NODE_SIZE="Standard_B2ats_v2"
export SYSTEM_NODE_COUNT=1
export WORKER_NODE_SIZE="Standard_B2ats_v2"
export WORKER_MIN_COUNT=1
export WORKER_MAX_COUNT=2


export ACR_NAME="acr-flyaway-prod"


export LOG_WORKSPACE="law-aks-prod-flyaway"


export KEY_VAULT_NAME="kv-aks-prod-flyaway"