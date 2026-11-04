# 📖 Azure CLI Scripts — AKS Cluster Management

This directory contains Bash scripts for managing Azure Kubernetes Service (AKS) clusters used by the FlyAway application. These scripts automate the creation and configuration of production-grade AKS clusters with identity federation.

---

## 📋 Available Scripts

### 1. `export-variables.sh`
**Purpose:** Sets all required environment variables for Azure AKS operations.

This script exports the following variables:
- `SUBSCRIPTION_ID` - Azure subscription GUID
- `TENANT_ID` - Azure tenant GUID
- `RESOURCE_GROUP` - Resource group name (`rg-flyaway`)
- `LOCATION` - Azure region (`eastus`)
- `VNET_NAME` - Virtual network name
- `VNET_CIDR` - VNet CIDR block
- `AKS_SUBNET_NAME` - AKS subnet name
- `AKS_SUBNET_CIDR` - AKS subnet CIDR
- `SVC_SUBNET_NAME` - Service subnet name
- `SVC_SUBNET_CIDR` - Service subnet CIDR
- `POD_CIDR` - Pod IP range
- `SERVICE_CIDR` - Service CIDR
- `DNS_SERVICE_IP` - DNS service IP
- `CLUSTER_NAME` - AKS cluster name (`aks-prod-flyaway`)
- `KUBERNETES_VERSION` - Kubernetes version (`1.34.0`)
- `DNS_PREFIX` - DNS prefix for the cluster
- `NETWORK_PLUGIN` - Network plugin (`azure`)
- `NETWORK_PLUGIN_MODE` - Network plugin mode (`overlay`)
- `SYSTEM_NODE_SIZE` - System node VM size (`Standard_B2s`)
- `SYSTEM_NODE_COUNT` - System node count (`1`)
- `WORKER_NODE_SIZE` - Worker node VM size (`Standard_B2s`)
- `WORKER_MIN_COUNT` - Minimum worker count (`1`)
- `WORKER_MAX_COUNT` - Maximum worker count (`2`)
- `ACR_NAME` - Azure Container Registry name (with random suffix)
- `LOG_WORKSPACE` - Log Analytics workspace name
- `KEY_VAULT_NAME` - Key Vault name (with random suffix)

**Usage:**
```bash
source az-cli/export-variables.sh
```

---

### 2. `aks-cli.sh`
**Purpose:** Creates a production-grade AKS cluster and configures worker node pools.

This script performs the following actions:

**Cluster Creation:**
- Creates an AKS cluster with managed identity and OIDC issuer
- Enables workload identity for Azure resource integration
- Configures Azure CNI network plugin with overlay mode
- Sets Azure network policy
- Configures VNet subnet, CIDRs, and DNS settings
- Enables cluster autoscaler (min: 1, max: 2 nodes)
- Enables AAD integration and Azure RBAC
- Configures API server authorized IP ranges
- Sets node OS disk size (32GB, Managed Disk)
- Enables key vault secrets provider and secret rotation
- Applies production tags (`environment=production`, `owner=capclouds.com`)

**Worker Node Pool Addition:**
- Adds a worker node pool named `workerpool`
- Configures worker VM size and auto-scaling (min: 1, max: 2)
- Enables cluster autoscaler for the worker pool
- Adds user taints and labels (`node-role=worker`, `environment=production`)
- Applies production tags

**Credentials:**
- Retrieves and overwrites Kubernetes credentials

**Prerequisites:**
- Azure CLI must be logged in (`az login`)
- All environment variables must be set (from `export-variables.sh`)
- Sufficient Azure permissions for AKS creation

**Usage:**
```bash
source az-cli/export-variables.sh
bash az-cli/aks-cli.sh
```

**⚠️ Important Note:** The script uses `set -euo pipefail`, which means it will exit with code 1 if any command fails or if required variables are unset. Ensure `export-variables.sh` is sourced first.

---

### 3. `managed-identity.sh`
**Purpose:** Sets up Azure AD OIDC federation between AKS and Key Vault for secret rotation.

This script performs the following actions:

**OIDC Configuration:**
- Retrieves the AKS OIDC issuer URL
- Creates a user-assigned managed identity named `kv-reader-identity`
- Extracts the client ID and principal ID from the identity

**Key Vault Integration:**
- Retrieves the Key Vault resource ID (name pattern: `kv-aks-flyaway-<random>`)
- Assigns "Key Vault Secrets User" role to the managed identity
- Creates a federated credential linking the AKS OIDC issuer to the managed identity
- Configures the federated credential for `api://AzureADTokenExchange` audience
- Subject: `system:serviceaccount:default:flyaway-sa`

**Purpose:** This enables the application to securely read secrets from Azure Key Vault using AKS workload identity federation, eliminating the need for service principal secrets.

**Prerequisites:**
- AKS cluster must be created first (via `aks-cli.sh`)
- Key Vault must exist with the expected naming convention
- OIDC issuer must be enabled on the AKS cluster (enabled in `aks-cli.sh`)

**Usage:**
```bash
source az-cli/export-variables.sh
bash az-cli/managed-identity.sh
```

---

## 🔄 Full Workflow

Here's the recommended sequence for setting up the AKS environment:

```bash
# 1. Source environment variables
source az-cli/export-variables.sh

# 2. Create the AKS cluster
bash az-cli/aks-cli.sh

# 3. Set up managed identity and Key Vault federation
bash az-cli/managed-identity.sh
```

---

## 🛠️ Development & Maintenance

- **Variables:** All environment variables are defined in `export-variables.sh` and can be customized for different environments
- **Idempotency:** Scripts can be re-run, but some operations (like AKS creation) may have side effects
- **Logging:** Consider redirecting output to log files for troubleshooting
- **Permissions:** Ensure the executing user has `Contributor` or higher role on the subscription/resource group

---

## 📝 Notes

- The `aks-cli.sh` script uses `set -euo pipefail` for strict error handling
- All scripts depend on environment variables from `export-variables.sh`
- Random suffixes (`$RANDOM`) are used for ACR and Key Vault names to ensure uniqueness
- The setup is designed for **production** environment with specific security configurations

