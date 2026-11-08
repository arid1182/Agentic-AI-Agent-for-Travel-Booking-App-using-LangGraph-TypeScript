#!/bin/bash
set -eua pipefail

echo "-----------------------------------------------------------"
echo "Step 1 - Create a Virtual Network for AKS and Azure Firewal"
echo "-----------------------------------------------------------"

az group create --name $RESOURCE_GROUP --location $LOCATION

# Create the "fw-vnet" for Azure Firewall
az network vnet create \
    --resource-group $RESOURCE_GROUP \
    --name fw-vnet \
    --address-prefix 10.0.0.0/16 \
    --subnet-name AzureFirewallSubnet \
    --subnet-prefix 10.0.1.0/24

# Create the "aks-vnet" for AKS
az network vnet create \
    --resource-group $RESOURCE_GROUP \
    --name aks-vnet \
    --address-prefix 10.1.0.0/16 \
    --subnet-name aks-subnet \
    --subnet-prefix 10.1.0.0/24

# Peer firewall to aks vnet
az network vnet peering create \
    --resource-group $RESOURCE_GROUP \
    --name fw-to-aks \
    --vnet-name fw-vnet \
    --remote-vnet aks-vnet \
    --allow-forwarded-traffic \
    --allow-vnet-access

# Peer aks to firewall
az network vnet peering create \
    --resource-group $RESOURCE_GROUP \
    --name aks-to-fw \
    --vnet-name aks-vnet \
    --remote-vnet fw-vnet \
    --allow-forwarded-traffic \
    --allow-vnet-access

echo "---------------------------------------------------"
echo "Step 2 - Create Azure Firewall-as-a-service (FWaaS)"
echo "---------------------------------------------------"

# Create a public IP for the firewall
az network public-ip create \
    --resource-group $RESOURCE_GROUP \
    --name firewall-pip \
    --sku Standard \
    --allocation-method Static

# Create a firewall policy
az network firewall policy create \
    --resource-group $RESOURCE_GROUP \
    --name aks-firewall-policy \
    --location $LOCATION

# Create the Azure Firewall
az network firewall create \
    --resource-group $RESOURCE_GROUP \
    --name aks-firewall \
    --location $LOCATION \
    --vnet-name fw-vnet \
    --firewall-policy aks-firewall-policy

# Configure the firewall IP
az network firewall ip-config create \
    --resource-group $RESOURCE_GROUP \
    --firewall-name aks-firewall \
    --name firewall-ipconfig \
    --public-ip-address firewall-pip \
    --vnet-name fw-vnet

# Get the firewall private IP for routing
FIREWALL_PRIVATE_IP=$(az network firewall show \
    --resource-group $RESOURCE_GROUP \
    --name aks-firewall \
    --query "ipConfigurations[0].privateIPAddress" -o tsv)

echo "Firewall Private IP: $FIREWALL_PRIVATE_IP"


echo "-----------------------------------------"
echo "Step 3: Create Route Table for AKS Subnet"
echo "-----------------------------------------"

# Create a route table
az network route-table create \
    --resource-group $RESOURCE_GROUP \
    --name aks-route-table \
    --location $LOCATION

# Add a default route pointing to the firewall
az network route-table route create \
    --resource-group $RESOURCE_GROUP \
    --route-table-name aks-route-table \
    --name default-route \
    --address-prefix 0.0.0.0/0 \
    --next-hop-type VirtualAppliance \
    --next-hop-ip-address $FIREWALL_PRIVATE_IP

# Associate the route table with the AKS subnet
az network vnet subnet update \
    --resource-group $RESOURCE_GROUP\
    --vnet-name aks-vnet \
    --name aks-subnet \
    --route-table aks-route-table


echo "----------------------------------------"
echo "Step 4: Configure Firewall Rules for AKS"
echo "----------------------------------------"

# Create a rule collection group
az network firewall policy rule-collection-group create \
    --resource-group $RESOURCE_GROUP \
    --policy-name aks-firewall-policy \
    --name AKSRules \
    --priority 100

# Allow AKS required FQDN destinations
az network firewall policy rule-collection-group collection add-filter-collection \
    --resource-group $RESOURCE_GROUP \
    --policy-name aks-firewall-policy \
    --rule-collection-group-name AKSRules \
    --name AKSRequired \
    --rule-name aks-required \
    --collection-priority 200 \
    --action Allow \
    --rule-type ApplicationRule \
    --protocols Http=80 Https=443 \
    --source-addresses "10.1.0.0/24" \
    --fqdn-tags AzureKubernetesService

# Add specific FQDN rules for microsoft container services
az network firewall policy rule-collection-group collection add-filter-collection \
    --resource-group $RESOURCE_GROUP \
    --policy-name aks-firewall-policy \
    --rule-collection-group-name AKSRules \
    --name ContainerServices \
    --rule-name container-services \
    --collection-priority 300 \
    --action Allow \
    --rule-type ApplicationRule \
    --protocols Https=443 \
    --source-addresses "10.1.0.0/24" \
    --target-fqdns \
        "*.blob.core.windows.net" \
        "://microsoft.com" \
        "*.data.://microsoft.com" \
        "://docker.com" \
        "registry-1.docker.io" \
        "://docker.com"

# Allow Docker Hub image
az network firewall policy rule-collection-group collection add-filter-collection \
    --resource-group $RESOURCE_GROUP \
    --policy-name aks-firewall-policy \
    --rule-collection-group-name AKSRules \
    --name DockerHub \
    --rule-name docker-hub \
    --collection-priority 400 \
    --action Allow \
    --rule-type ApplicationRule \
    --protocols Https=443 \
    --source-addresses "10.1.0.0/24" \
    --target-fqdns \
        "*.docker.io" \
        "production.cloudflare.docker.com" \
        "registry-1.docker.io"

# Allow SupaBase Postgress remote database 
az network firewall policy rule-collection-group collection add-filter-collection \
    --resource-group $RESOURCE_GROUP \
    --policy-name aks-firewall-policy \
    --rule-collection-group-name AKSRules \
    --name SupaBase \
    --rule-name supabase \
    --collection-priority 450 \
    --action Allow \
    --rule-type ApplicationRule \
    --protocols Https=443 \
    --source-addresses "10.1.0.0/24" \
    --target-fqdns \
        "*.supabase.co" \
        "db.supabase.co" \
        "*.supabase.net"

# Network rules for UDP traffic (NTP and AKS tunnel)
az network firewall policy rule-collection-group collection add-filter-collection \
    --resource-group $RESOURCE_GROUP \
    --policy-name aks-firewall-policy \
    --rule-collection-group-name AKSRules \
    --name AKSNetworkUdp \
    --rule-name aks-network-udp \
    --collection-priority 500 \
    --action Allow \
    --rule-type NetworkRule \
    --ip-protocols UDP \
    --source-addresses "10.1.0.0/24" \
    --destination-addresses "*" \
    --destination-ports 123 1194

# Network rule for TCP AKS tunnel traffic
az network firewall policy rule-collection-group collection add-filter-collection \
    --resource-group $RESOURCE_GROUP \
    --policy-name aks-firewall-policy \
    --rule-collection-group-name AKSRules \
    --name AKSNetworkTcp \
    --rule-name aks-network-tcp \
    --collection-priority 550 \
    --action Allow \
    --rule-type NetworkRule \
    --ip-protocols TCP \
    --source-addresses "10.1.0.0/24" \
    --destination-addresses "*" \
    --destination-ports 9000
