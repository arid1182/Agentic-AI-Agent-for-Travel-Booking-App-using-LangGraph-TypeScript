# 📦 Kubernetes Manifests — FlyAway Application
## ✅ Current Cluster Status
---
## 📋 Available Manifests
**Description:** Deploys the FlyAway Next.js application with Azure workload identity and CSI driver integration.
### 2. `clusterIP-service.yaml`
**Description:** Internal ClusterIP service for intra-cluster communication.
### 3. `secretProviderClass.yaml`
**Description:** Azure Secrets Store CSI Driver configuration to inject secrets from Azure Key Vault.
### 4. `service-account.yaml`
**Description:** Azure Workload Identity Service Account for federation with Azure AD.
## 🚀 Deployment Instructions
## 🔧 Troubleshooting: ContainerCreating State
### 2. Common Causes & Fixes:
### 3. Debug Commands:
### 4. Successful Deployment Signs:
## 📝 Notes

- All manifests use consistent labeling: `app.kubernetes.io/name: appflyaway`, `app.kubernetes.io/instance: nextjs`, `app.kubernetes.io/component: app_ui`, `app.kubernetes.io/owner: capclouds.com`
- The deployment uses **Azure Workload Identity** — no container secrets are stored in Docker/ACR; all secrets come from Azure Key Vault at runtime
- The `secretProviderClass` uses `usePodIdentity: "false"` with explicit `clientID` for pod-level identity federation
- **Startup probe** has `initialDelaySeconds: 10` and `periodSeconds: 5` to avoid premature restarts during app initialization
- **Resources** are set with equal requests and limits (512Mi memory, 500m CPU) for predictable scheduling
- Pod status: `Running` with `READY 1/1`
- Secrets visible inside the container at `/mnt/secrets-store/`
- Application responding at `/api/health` endpoint
- Service ClusterIP reachable within the cluster
```bash
# View all events in the namespace
kubectl get events -n default --sort-by=.metadata.creationTimestamp

# Check the CSI driver pods
kubectl get pods -n kube-system -l k8s-app=secrets-store-csi-driver

# Verify secret injection
kubectl exec <pod-name> -n default -- ls -la /mnt/secrets-store/

# Check Key Vault access
az keyvault secret list --vault-name kv-aks-flyaway-20698
```

| Issue | Solution |
|-------|----------|
| **CSI driver not available** | Ensure `secrets-store-csi-driver` is installed and the `driver` name matches (`secrets-store.csi.k8s.io`) |
| **Key Vault access issues** | Verify Key Vault name (`kv-aks-flyaway-20698`), tenant ID, and client ID are correct. Ensure the managed identity has `Key Vault Secrets User` role assignment |
| **Workload Identity not configured** | Verify `azure.workload.identity/use: "true"` annotations on SA and pod template. Ensure the Azure AD app registration exists and has federated credentials |
| **Image pull issues** | Verify the container image `arid1182/flyaway:1.2.0` is accessible and `imagePullPolicy` is correct |
| **Node resource constraints** | Check node availability and resource quotas |
| **Pod Security Standards** | Ensure `runAsNonRoot`, `readOnlyRootFilesystem`, and capability restrictions are compatible with your node image |
```

### 1. Check Pod Events:
```bash
kubectl describe pod <pod-name> -n default
```

### Apply All Manifests:
```bash
kubectl apply -f k8s-manifets/
```

### Recommended Order:
1. **ServiceAccount** first — Required for workload identity
2. **SecretProviderClass** — Configures CSI secrets driver
3. **Deployment** — Deploys the application
4. **Service** — Creates ClusterIP service

```bash
kubectl apply -f k8s-manifets/service-account.yaml
kubectl apply -f k8s-manifets/secretProviderClass.yaml
kubectl apply -f k8s-manifets/deployment.yaml
kubectl apply -f k8s-manifets/clusterIP-service.yaml
```

**Configuration:**
- **Name:** `flyaway-sa`
- **Annotation:** `azure.workload.identity/client-id: "17b3a136-24dc-42bc-a0c7-58f9cd5fedae"`
- **Purpose:** Binds the Kubernetes service account to a Azure AD app registration for workload identity federation

**Provider Configuration:**
- **Provider:** `azure`
- **Secret Name:** `flyaway-secrets`
- **Tenanted:** Uses pod identity (`usePodIdentity: "false"` with explicit `clientID`)
- **Client ID:** `17b3a136-24dc-42bc-a0c7-58f9cd5fedae`
- **Key Vault Name:** `kv-aks-flyaway-20698`
- **Tenant ID:** `65a98dc0-7ee5-451c-9a05-61a30b4b9f48`

**Secret Objects Injected:**
| Secret Name | Key | Alias |
|-------------|-----|-------|
| `flyaway-secrets` | `NEXT_PUBLIC_OSRM_PROFILE` | `NEXT_PUBLIC_OSRM_PROFILE` |
| | `NEXT_PUBLIC_OSRM_BASE_URL` | `NEXT_PUBLIC_OSRM_BASE_URL` |
| | `PHOTON_API_REVERSE_URL` | `PHOTON_API_REVERSE_URL` |
| | `PHOTON_API_URL` | `PHOTON_API_URL` |
| | `OPENWEATHER_API_KEY` | `OPENWEATHER_API_KEY` |
| | `DUFFEL_VERSION` | `DUFFEL_VERSION` |
| | `DUFFEL_ACCESS_TOKEN` | `DUFFEL_ACCESS_TOKEN` |
| | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| | `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` |

**Configuration:**
- **Type:** ClusterIP (`10.245.77.228`)
- **Port:** 80/TCP → targetPort: 3000
- **Selector:** `app.kubernetes.io/name: appflyaway`, `app.kubernetes.io/instance: nextjs`
- **Name:** `appflyaway-ingress-service`

**Key Features:**
- **1 replica** of the `arid1182/flyaway:1.2.0` container
- **Azure Workload Identity** enabled (`azure.workload.identity/use: "true"`)
- **Service Account:** `flyaway-sa` with federated workload identity client ID `17b3a136-24dc-42bc-a0c7-58f9cd5fedae`
- **CSI Secrets Store:** Mounts secrets from Azure Key Vault via `secretProviderClass: flyaway-sp-class`
- **Security Context:** `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, capabilities dropped
- **Probes:** liveness, readiness, and startup HTTP probes at `/api/health` on port 3000
- **Resources:** 512Mi memory request/limit, 500m CPU request/limit

**Container Paths:**
- `/mnt/secrets-store` — Mounted read-only for Azure Key Vault secrets

### 1. `deployment.yaml`

The cluster is running and the application pods are operational:

| Resource | Status |
|----------|--------|
| **Pods** | `appflyaway-bb9f99446-jgdpv` — **Running** (1/1 ready, 0 restarts) |
| **Services** | `appflyaway-ingress-service` — ClusterIP `10.245.77.228`, Port 80/TCP |
| **Endpoints** | `appflyaway-ingress-service` — `10.244.1.118:3000` |

This directory contains the Kubernetes manifest files for deploying the FlyAway application on AKS (Azure Kubernetes Service).
