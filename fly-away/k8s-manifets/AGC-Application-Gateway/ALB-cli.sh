!#/bin/bash

set -euo pipefail

# OR Modify the cluster if already provisioned
az aks update --name $CLUSTER_NAME --resource-group $RESOURCE_GROUP --enable-gateway-api --enable-application-load-balancer

# Check the the account status and Resource Providers are enabled 
az account show --output table
az feature list --namespace Microsoft.ContainerService --output table

# Register the required Resource Provider on subscription level
az extension add --name aks-preview --upgrade

az feature register \
    --namespace Microsoft.ContainerService \
    --name ApplicationLoadBalancerPreview

az feature register \
    --namespace Microsoft.ContainerService \
    --name ManagedGatewayAPIPreview

# Verify the Privders 
az feature show \
    --namespace Microsoft.ContainerService \
    --name ApplicationLoadBalancerPreview \
    --query properties.state -o tsv

az feature show \
    --namespace Microsoft.ContainerService \
    --name ManagedGatewayAPIPreview \
    --query properties.state -o tsv

# When both report Registered
az provider register --namespace Microsoft.ContainerService

# Check the controller
kubectl get pods -n kube-system | grep alb-controller

# Check the GatewayClass
kubectl get gatewayclass
kubectl get gatewayclass azure-alb-external -o yaml

# Find the AKS node resource group
MC_RESOURCE_GROUP=$(az aks show \
    -g "$RESOURCE_GROUP" \
    -n "$AKS_NAME" \
    --query nodeResourceGroup -o tsv)

echo "$MC_RESOURCE_GROUP"

# Find the subnet used by your AKS node pool:
CLUSTER_SUBNET_ID=$(az vmss list \
    --resource-group "$MC_RESOURCE_GROUP" \
    --query '[0].virtualMachineProfile.networkProfile.networkInterfaceConfigurations[0].ipConfigurations[0].subnet.id' \
    -o tsv)

echo "$CLUSTER_SUBNET_ID"

# Find Existing VNet
VNET_ID=$(az network vnet subnet show \
    --ids "$CLUSTER_SUBNET_ID" \
    --query id -o tsv | sed 's#/subnets/.*##')

VNET_NAME=$(az network vnet show --ids "$VNET_ID" --query name -o tsv)

VNET_RESOURCE_GROUP=$(az network vnet show \
    --ids "$VNET_ID" --query resourceGroup -o tsv)

echo "$VNET_NAME"
echo "$VNET_RESOURCE_GROUP"

# Create the dedicated subnet
ALB_SUBNET_NAME="snet-agc"
ALB_SUBNET_PREFIX="<unused-vnet-address-range-with-at-least-250-available-ips>"

az network vnet subnet create \
    --resource-group "$VNET_RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "$ALB_SUBNET_NAME" \
    --address-prefixes "$ALB_SUBNET_PREFIX" \
    --delegations Microsoft.ServiceNetworking/trafficControllers

# Get its resource ID
ALB_SUBNET_ID=$(az network vnet subnet show \
    --resource-group "$VNET_RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "$ALB_SUBNET_NAME" \
    --query id -o tsv)

echo "$ALB_SUBNET_ID"