variable "name_prefix" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "tenant_id" { type = string }
variable "aks_subnet_id" { type = string }
variable "api_server_subnet_id" { 
    type = string
    default = null 
    }
variable "kubernetes_version" { 
    type = string
    default = null 
    }
variable "service_cidr" { type = string }
variable "pod_cidr" { type = string }
variable "dns_service_ip" { type = string }
variable "outbound_type" { 
    type = string
    default = "userDefinedRouting" 
    }
variable "ebpf_data_plane" { 
    type = string
    default = null 
    }
variable "private_cluster_enabled" { 
    type = bool
    default = true 
    }
variable "enable_api_server_vnet_integration" { 
    type = bool
    default = true 
    }
variable "api_server_authorized_ip_ranges" { 
    type = list(string)
    default = [] 
    }
variable "admin_group_object_ids" { type = list(string) }
variable "log_analytics_workspace_id" { type = string }
variable "enable_prometheus_data_collection" { 
    type = bool
    default = true
    }
variable "monitor_workspace_id" { 
    type = string
    default = null 
    }
variable "system_node_pool" {
    type = object({
        vm_size         = optional(string, "Standard_D4s_v5")
        min_count       = optional(number, 3)
        max_count       = optional(number, 6)
        max_pods        = optional(number, 250)
        os_disk_size_gb = optional(number, null)
        os_sku          = optional(string, "AzureLinux")
    })
    default = {}
}
variable "user_node_pools" {
    type = map(object({
        vm_size         = string
        min_count       = number
        max_count       = number
        max_pods        = optional(number, 250)
        os_disk_size_gb = optional(number, null)
        os_sku          = optional(string, "AzureLinux")
        node_labels     = optional(map(string), {})
        node_taints     = optional(list(string), [])
        zones           = optional(list(string), ["1", "2", "3"])
    }))
    default = {}
}
variable "tags" { 
    type = map(string)
    default = {} 
    }
