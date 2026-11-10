# Production-grade AKS Terraform

Three-layer module layout: **network** -> **monitoring** -> **aks** (+ optional ACR).

## Layout

```
.
├── versions.tf / providers.tf / main.tf / variables.tf / outputs.tf / locals.tf
├── terraform.tfvars
└── modules/
    ├── network/    # VNet, node + API-server subnets, NSG, UDR via firewall
    ├── aks/        # cluster, node pools, etcd KMS, KV CSI, Defender, locks, diagnostics
    └── monitoring/ # Log Analytics + Azure Monitor workspace (managed Prometheus)
```

## Production features

| Area | Implementation |
|---|---|
| API server | Private cluster (`System` private DNS), VNet-integrated API subnet, no public access |
| Identity | System-assigned cluster identity; local accounts disabled; run command disabled |
| AuthN/Z | Azure RBAC via Entra ID, admin group required, Kubernetes local accounts off |
| Networking | Azure CNI **Overlay** (scalable pod CIDR, no VNet IP exhaustion), UDR egress via firewall or LB outbound |
| Encryption | etcd encrypted at rest with **KMSv2** (RSA-HSM key in Key Vault, auto-rotation, purge protection) |
| Secrets | Key Vault Secrets Provider CSI driver with auto-rotation (2m) |
| Scaling | Cluster autoscaler with `least-waste` expander, 3-zone pools, ephemeral OS disks, surge upgrades |
| Supply chain | Defender for Containers, image cleaner, optional Premium ACR with AcrPull |
| Policy | Azure Policy (baseline) enabled |
| Observability | Container Insights via AMA/MSI auth, control-plane diagnostic logs, managed Prometheus |
| Operations | Weekly maintenance windows (upgrades Sun 02:00, node OS Sun 06:00 UTC+1), CanNotDelete lock, cost analysis |

## Prerequisites

1. **State backend**: create the storage account referenced in `versions.tf` and
   disable shared-key access / enable Azure AD auth:
   ```bash
   az group create -n rg-tfstate-prod-weu -l westeurope
   az storage account create -n sttfstateprodweu -g rg-tfstate-prod-weu --https-only --min-tls-version TLS1_2
   az storage container create -n tfstate --account-name sttfstateprodweu --auth-mode login
   ```
2. **Firewall** (for UDR mode): deploy Azure Firewall and pass its private IP as
   `firewall_private_ip`; add an application/network rule for `*.hcp.<location>.azmk8s.io`
   (API server) and required FQDNs, or set `outbound_type = "loadBalancer"`.
3. **Key Vault access**: the vault has default-deny network ACLs. Your Terraform
   runner needs RBAC `Key Vault Crypto Officer` (or `Key Vault Secrets Officer`+`Key Vault Crypto User`)
   and its IP allowed. Add `ip_rules` under `network_acls` in `modules/aks/main.tf`,
   or run from a build agent inside the VNet/hub.

## Usage

```bash
terraform.tfvars   # fill out
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Access (from a host that can resolve the private DNS zone, e.g. hub/bastion):
az aks get-credentials -g rg-plat-prod-aks -n aks-plat-prod --overwrite-existing
```

## Operations notes

- **Upgrades**: `automatic_channel_upgrade = "patch"` applies K8s patches automatically;
  minor upgrades go through the maintenance window. To pin an exact version, set
  `kubernetes_version` (e.g. `"1.31"`); Terraform rolling the version triggers a surge upgrade.
- **Ephemeral disks**: if `os_disk_size_gb` is set, it must be <= the VM's cache
  size (e.g. D4s_v5: 96 GiB). Leave null to let the provider auto-select.
- **Breaking-change safety**: the default node pool uses `temporary_name_for_rotation`,
  so future SKU changes recreate the pool gracefully instead of forcing replacement.
- **Maintenance windows** use `utc_offset = "+01:00"` (CET/CEST); adjust to your region.


# Create AKS Resource using Terraform

> 🚀 **Live Case Study:** Read the full project breakdown and architecture overview on my [Portfolio Website](https://capclouds.com/portfolio-archive/azure-kubernetes-service-aks-cluster-using-terraform/).
