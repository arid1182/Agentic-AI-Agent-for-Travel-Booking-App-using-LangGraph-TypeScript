subscription_id = "917502bc-868d-4be8-ad09-68d765b05516"
tenant_id = "65a98dc0-7ee5-451c-9a05-61a30b4b9f48"
admin_group_object_ids = ["8a676178-5855-43cb-a086-23de09826898"]

vnet_address_space = ["10.100.0.0/15"]
environment = "prod"
prefix = "flyaway"
location = "eastus"
enable_managed_prometheus = false
log_retention_days = "30"
kubernetes_version = "1.35"
create_acr = false
private_cluster_enabled = false
enable_api_server_vnet_integration = false # true if "private_cluster_enabled" is set
api_server_authorized_ip_ranges = [] # only used if private_cluster_enabled = false

firewall_private_ip = "10.0.0.4"   # set "" for plain loadbalancer outbound
outbound_type = "userDefinedRouting"
tags = {
    name        = "Flyaway"
    environment = "Prod"
    owner       = "Capclouds.com"
}

# stand alone kubernetes cluster management 

user_node_pools = {
    apps = {
        vm_size   = "Standard_B2s"
        min_count = 2
        max_count = 2
        node_labels = { workload = "apps" }
        os_disk_size_gb = 30
        zones     = ["1"]
    }
}


system_node_pool = {
    api = {
        vm_size   = "Standard_B2s"
        min_count = 1
        max_count = 2
        node_labels = { workload = "api" }
        os_disk_size_gb = 30
    }
}