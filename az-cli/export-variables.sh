!#/bin/bash
# ── Identity ─────────────────────────────────────
export SUBSCRIPTION_ID="your-subscription-id" \
    export TENANT_ID="your-tenant-id" \

# ── Resource Group ────────────────────────────────
export RESOURCE_GROUP="rg-flyaway" \
    export LOCATION="eastus" \

# ── Networking ────────────────────────────────────
export VNET_NAME="vnet-aks-prod"
export VNET_CIDR="10.0.0.0/8"
export AKS_SUBNET_NAME="snet-aks-prod"
export AKS_SUBNET_CIDR="10.240.0.0/16"
export SVC_SUBNET_NAME="snet-svc-prod"
export SVC_SUBNET_CIDR="10.241.0.0/16"
export POD_CIDR="10.244.0.0/16"
export SERVICE_CIDR="10.245.0.0/16"
export DNS_SERVICE_IP="10.245.0.10"

# ── AKS Cluster ───────────────────────────────────
export CLUSTER_NAME="aks-prod-flyaway"
export KUBERNETES_VERSION="1.30.0"
export DNS_PREFIX="aks-prod-flyaway"

# ── Node Pools ────────────────────────────────────
export SYSTEM_NODE_SIZE="Standard_D4s_v5"
export  SYSTEM_NODE_COUNT=3
export WORKER_NODE_SIZE="Standard_D8s_v5"
export WORKER_MIN_COUNT=2
export WORKER_MAX_COUNT=10

# ── Container Registry ────────────────────────────
export ACR_NAME="acrflyawayprod"

# ── Log Analytics ─────────────────────────────────
export LOG_WORKSPACE="law-aks-prod-flyaway"

# ── Key Vault ─────────────────────────────────────
export KEY_VAULT_NAME="kv-aks-prod-flyaway"