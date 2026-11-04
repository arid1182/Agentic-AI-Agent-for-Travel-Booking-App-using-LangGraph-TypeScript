#!/bin/bash
set -euo pipefail

az aks create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --location "$LOCATION" \
  --kubernetes-version "$KUBERNETES_VERSION" \
  --dns-name-prefix "$DNS_PREFIX" \
  \
  --enable-managed-identity \
  --enable-oidc-issuer \
  --enable-workload-identity \
  \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --network-policy azure \
  --vnet-subnet-id "/subscriptions/917502bc-868d-4be8-ad09-68d765b05516/resourceGroups/rg-flyaway/providers/Microsoft.Network/virtualNetworks/vnet-aks-prod/subnets/snet-aks-prod" \
  --pod-cidr "$POD_CIDR" \
  --service-cidr "$SERVICE_CIDR" \
  --dns-service-ip "$DNS_SERVICE_IP" \
  --outbound-type loadBalancer \
  \
  --node-vm-size "$SYSTEM_NODE_SIZE" \
  --node-count "$SYSTEM_NODE_COUNT" \
  --nodepool-name systempool \
  --node-osdisk-size 32 \
  --node-osdisk-type Managed \
  \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 2 \
  --zones 1 \
  \
  --enable-aad \
  --enable-azure-rbac \
  --disable-local-accounts \
  \
  --auto-upgrade-channel patch \
  --node-os-upgrade-channel NodeImage \
  \
  --enable-addons azure-keyvault-secrets-provider \
  --enable-secret-rotation \
  \
  --api-server-authorized-ip-ranges "58.65.160.53/32" \
  \
  --tags \
    environment=production \
    owner=capclouds.com

# Add Production Worker Node Pool
az aks nodepool add \
  --resource-group $RESOURCE_GROUP \
  --cluster-name $CLUSTER_NAME \
  --name workerpool \
  --node-vm-size $WORKER_NODE_SIZE \
  --node-count $WORKER_MIN_COUNT \
  --min-count $WORKER_MIN_COUNT \
  --max-count $WORKER_MAX_COUNT \
  --enable-cluster-autoscaler \
  --zones 1 \
  --node-osdisk-size 32 \
  --node-osdisk-type Managed \
  --mode User \
  --node-taints "" \
  --labels \
      node-role=worker \
      environment=production \
  --tags \
      environment=production \
      owner=capclouds.com
