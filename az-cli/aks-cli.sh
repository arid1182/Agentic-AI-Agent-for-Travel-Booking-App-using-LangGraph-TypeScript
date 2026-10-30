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
    --vnet-subnet-id "/subscriptions/subscription-id/resourceGroups/.../vnet-aks-prod/subnets/snet-aks-prod" \
    --pod-cidr "$POD_CIDR" \
    --service-cidr "$SERVICE_CIDR" \
    --dns-service-ip "$DNS_SERVICE_IP" \
    --outbound-type userDefinedRouting \
    \
    --node-vm-size "$SYSTEM_NODE_SIZE" \
    --node-count "$SYSTEM_NODE_COUNT" \
    --nodepool-name systempool \
    --os-disk-size-gb 30 \
    --os-disk-type Managed \
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
    --enable-private-cluster \
    --private-dns-zone system \
    \
    --tags \
        environment=production \
        owner=capclouds.com