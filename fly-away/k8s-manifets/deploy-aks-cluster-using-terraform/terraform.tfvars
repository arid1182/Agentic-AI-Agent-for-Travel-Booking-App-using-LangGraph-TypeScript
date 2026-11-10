# terraform.tfvars
subscription_id = "00000000-0000-0000-0000-000000000000"
tenant_id       = "00000000-0000-0000-0000-000000000000"

prefix      = "flyaway"
environment = "prod"
location    = "eastus"

# Entra group with cluster-admin (Azure RBAC). REQUIRED.
admin_group_object_ids = ["00000000-0000-0000-0000-000000000000"]

# Force-tunnel egress via Azure Firewall; set outbound_type accordingly
firewall_private_ip = "10.0.0.4"   # set "" for plain load balancer outbound
outbound_type = "userDefinedRouting"  # "loadBalancer" or "userDefinedRouting"
vnet_address_space = "10.100.0.0/16"
service_cidr = "172.16.0.0/16"
pod_cidr = "192.168.0.0/16"
dns_service_ip = "172.16.0.10"
ebpf_data_plane = null  # null = standard, "cilium" = eBPF data plane
enable_managed_prometheus = false
create_acr = false
log_retention_days = 10


kubernetes_version = 1.34            # null = latest

private_cluster_enabled = false # true for private cluster
enable_api_server_vnet_integration = false  # true for private cluster
api_server_authorized_ip_ranges = ["154.57.209.206/32", "58.65.160.53/32"] # only used if private_cluster_enabled = false

user_node_pools = {
    apps = {
        vm_size   = "Standard_B2s"
        min_count = 1
        max_count = 2
        node_labels = { workload = "apps" }
        zones = ["1"]
    }
    gpu = {
        vm_size     = "Standard_NC8as_T4_v3"
        min_count   = 0
        max_count   = 5
        node_taints = ["nvidia.com/gpu=true:NoSchedule"]
    }
}

system_node_pool = {
    api-server = {
        vm_size   = "Standard_B2s"
        min_count = 1
        max_count = 2
        os_disk_size_gb = 30
        node_labels = { workload = "api-server" }
    }
}