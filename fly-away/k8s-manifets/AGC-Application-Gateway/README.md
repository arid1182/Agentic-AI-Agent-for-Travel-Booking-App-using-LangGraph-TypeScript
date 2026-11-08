# Azure Application Gateway for Containers (AGC) ALB Deployment on AKS

Azure Application Gateway for Containers is a managed Layer 7 load balancing and ingress service designed specifically for containerized workloads in Azure Kubernetes Service (AKS). It represents the architectural evolution of the older Application Gateway Ingress Controller (AGIC), delivering near-instantaneous configuration updates and offloading data-plane traffic processing completely outside your cluster.

The system relies directly on an ALB Controller (Application Load Balancer Controller), which is an in-cluster operator that translates Kubernetes-native configuration into Azure load-balancing rules


![Alternative Text](AGC-Data%20Plane.webp)

### Step 1 – Export the Azure Cli environment variable in local environment

```
#!/bin/bash
source export-variables.sh
```

### Step 2 – Create AKS Cluster using azure cli 

```
#!/bin/bash
bash aks-cli.sh
```
### Step 3 – Create a Managed Identity with role assignment "Key Vault Secret User"

```
#!/bin/bash
bash managed-identity.sh
```
### Step 4 – Install Application Load Balancer controller per-requisities 

```
#!/bin/bash
bash ALB-cli.sh
```
### Step 5 – Deploy the flyaway Kubernetes application

```
kubectl apply -f service-account.yaml
kubectl apply -f secretProviderClass.yaml
kubectl apply -f secretProviderClass.yaml
kubectl apply -f deployment.yaml
kubectl apply -f clusterIP-service.yaml
```
### Step 6 – Create Application Gateway Controller and Gateway

```
kubectl apply -f alb-namespace.yaml
kubectl apply -f application-load-balancer.yaml
kubectl apply -f flyaway-gateway.yaml

```
![Alternative Text](application-gateway-for-containers-kubernetes-addon-1024x829.webp)
### Step 7 – Create http-route for flyaway service

```
kubectl apply -f flyaway-http-routes.yaml

```
### Step 8 – Create WAF Policy

```
#!/bin/bash
bash waf-policy.sh

```
```
kubectl apply -f flyaway-waf.yaml

```


