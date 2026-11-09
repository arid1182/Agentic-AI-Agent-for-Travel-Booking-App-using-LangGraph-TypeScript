### Configure AKS with Azure Firewall (FWaaS) for Egress Traffic Filtering

Standard AKS deployments allow unrestricted outbound internet traffic from all pods. To meet strict security and compliance standards, you must monitor and restrict these external connections. Azure Firewall provides this control by acting as a centralized egress point where you can enforce FQDN-based allowlists. In this guide, you will learn how to route AKS egress through Azure Firewall and configure the essential rules the cluster needs to operate successfully.

### Architecture Diagram
![Alternate Text](egress-fw-arc-1.webp)

### Export Azure Environment Variables

```
#!/bin/bash
source export-variables.sh
```
### Create Vnets, Peering, Firewall, Egress UDR and Policy using Azure Cli

```
#!/bin/bash
bash egress-az-cli.sh
```
### Create the AKS Cluster
```
#!/bin/bash
bash aks-cli.sh
```
### Verify Egress Through Firewall
```
#!/bin/bash

# Deploy a debug pod
kubectl run test-egress --image=busybox --rm -it

# Inside the pod, check your external IP
curl -s ifconfig.me
# This should show the Azure Firewall's public IP, not a load balancer IP
```

### Monitor Firewall Logs
```
# Enable diagnostic logging to Log Analytics
az monitor diagnostic-settings create \
  --resource /subscriptions/<sub-id>/resourceGroups/aks-firewall-rg/providers/Microsoft.Network/azureFirewalls/aks-firewall \
  --name aks-firewall-logs \
  --workspace <log-analytics-workspace-id> \
  --logs '[{"category": "AzureFirewallApplicationRule", "enabled": true}, {"category": "AzureFirewallNetworkRule", "enabled": true}]'
```

# AKS Egress through Azure Firewall(FWaaS) using UDR

> 🚀 **Live Case Study:** Read the full project breakdown and architecture overview on my [Portfolio Website](https://capclouds.com/portfolio-archive/egress-through-azure-firewall-using-udr/).
