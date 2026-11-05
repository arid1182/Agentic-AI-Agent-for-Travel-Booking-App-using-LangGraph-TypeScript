!#/bin/bash
set -euo pipefail

# Check the the account status and Resource Providers are enabled 
az account show --output table
az feature list --namespace Microsoft.ContainerService --output table

# Register the required Resource Provider on subscription level
az extension add --name aks-preview --upgrade
az extension add --name alb
az extension update --name aks-preview

# Register the preview features and resource providers
az provider register --namespace Microsoft.ContainerService
az provider register --namespace Microsoft.Network
az provider register --namespace Microsoft.NetworkFunction
az provider register --namespace Microsoft.ServiceNetworking
az feature register --namespace Microsoft.ContainerService --name ApplicationLoadBalancerPreview
az feature register --namespace Microsoft.ContainerService --name ManagedGatewayAPIPreview

# Verify the Privders 
az feature show --namespace Microsoft.ContainerService --name ApplicationLoadBalancerPreview --query properties.state -o tsv
az feature show --namespace Microsoft.ContainerService --name ManagedGatewayAPIPreview --query properties.state -o tsv

# Check the controller
kubectl get pods -n kube-system | grep alb-controller

# Check the GatewayClass
kubectl get gatewayclass
kubectl get gatewayclass azure-alb-external -o yaml

# Find the AKS node resource group
MC_RESOURCE_GROUP=$(az aks show \
    -g "$RESOURCE_GROUP" \
    -n "$CLUSTER_NAME" \
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

echo "$VNET_ID"

VNET_NAME=$(az network vnet show --ids "$VNET_ID" --query name -o tsv)
VNET_RESOURCE_GROUP=$(az network vnet show \
    --ids "$VNET_ID" --query resourceGroup -o tsv)

echo "$VNET_NAME"
echo "$VNET_RESOURCE_GROUP"

# Create the dedicated subnet
ALB_SUBNET_NAME="snet-agc"
ALB_SUBNET_PREFIX="10.241.128.0/24"

az network vnet subnet create \
    --resource-group "$VNET_RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "$ALB_SUBNET_NAME" \
    --address-prefixes "$ALB_SUBNET_PREFIX" \
    --delegations Microsoft.ServiceNetworking/trafficControllers

# Get its Subnet ID
ALB_SUBNET_ID=$(az network vnet subnet show \
    --resource-group "$VNET_RESOURCE_GROUP" \
    --vnet-name "$VNET_NAME" \
    --name "$ALB_SUBNET_NAME" \
    --query id -o tsv)

echo "$ALB_SUBNET_ID"

SUBNET_ID=$(az network vnet subnet show \
    --resource-group rg-flyaway \
    --vnet-name vnet-aks-prod \
    --name snet-agc \
    --query id -o tsv)

# grant the Network Contributor role to the ALB controller's service principal on the subnet
az role assignment create \
    --assignee-object-id 68cef9c2-6e3d-4eca-a38f-cd9f78759e2b \
    --assignee-principal-type ServicePrincipal \
    --role "Network Contributor" \
    --scope "$SUBNET_ID"

kubectl rollout restart deployment alb-controller -n kube-system