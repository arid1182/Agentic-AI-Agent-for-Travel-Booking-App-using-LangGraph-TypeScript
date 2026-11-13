variable "subscription_id" {
    description = "Azure subscription ID."
    type        = string
}

variable "tenant_id" {
    description = "Entra tenant ID used for Azure RBAC on the cluster."
    type        = string
}

variable "environment" {
    description = "Environment name, e.g. prod."
    type        = string
    default     = "prod"

    validation {
    condition     = can(regex("^(dev|test|staging|prod)$", var.environment))
    error_message = "Environment must be dev, test, staging or prod."
    }
}

variable "prefix" {
    description = "Short naming prefix for all resources."
    type        = string
    default     = "flyaway"

    validation {
        condition     = can(regex("^[a-z0-9]{2,10}$", var.prefix))
        error_message = "Prefix must be 2-10 lowercase alphanumeric characters."
    }
}

variable "location" {
    description = "Azure region for all resources."
    type        = string
    default     = "eastus"
    }

    variable "tags" {
    description = "Additional tags applied to all resources."
    type        = map(string)
    default     = {
        name        = "fly-away"
        environment = "prod"
        owner       = "capclouds.com"
    }
}

variable "resource_group_name" {
    description = "Azure Resource Group"
    type = string
    default = "rg-prod-flyaway"

}

variable "admin_group_object_ids" {
    description = "Entra group object IDs granted cluster-admin via Azure RBAC. Required."
    type        = list(string)
    default     = []

    validation {
        condition     = length(var.admin_group_object_ids) > 0
        error_message = "At least one Entra admin group must be specified for production clusters."
    }
}

variable "vnet_address_space" {
    description = "Address space of the hub/spoke VNet hosting AKS."
    type        = list(string)
    default     = ["10.100.0.0/15"]

    validation {
        condition     = length(var.vnet_address_space) == 1
        error_message = "Exactly one address space is required."
    }
}

variable "kubernetes_version" {
    description = "Kubernetes version prefix, e.g. 1.34."
    type        = string
    default     = null
}

variable "private_cluster_enabled" {
    description = "Enable private AKS API server (recommended for production)."
    type        = bool
    default     = true
}

variable "enable_api_server_vnet_integration" {
    description = "Deploy the API server into a delegated subnet (requires private cluster)."
    type        = bool
    default     = true
}

variable "api_server_authorized_ip_ranges" {
    description = "Allowed source CIDRs for the public API server. Ignored when private_cluster_enabled = true."
    type        = list(string)
    default     = []
}

variable "outbound_type" {
    description = "Outbound networking: loadBalancer or userDefinedRouting (firewall)."
    type        = string
    default     = "userDefinedRouting"

    validation {
        condition     = contains(["loadBalancer", "userDefinedRouting"], var.outbound_type)
        error_message = "outbound_type must be loadBalancer or userDefinedRouting."
    }
}

variable "firewall_private_ip" {
    description = "Private IP of the Azure Firewall (or NVA) used as next hop when outbound_type = userDefinedRouting. Empty string keeps load balancer outbound."
    type        = string
    default     = ""

    validation {
        condition     = var.firewall_private_ip == "" || can(cidrhost("${var.firewall_private_ip}/32", 0))
        error_message = "Must be a valid IPv4 address or empty string."
    }
}

variable "service_cidr" {
    description = "Kubernetes service CIDR (must not overlap the VNet)."
    type        = string
    default     = "172.16.0.0/16"
}

variable "pod_cidr" {
    description = "Overlay pod CIDR."
    type        = string
    default     = "192.168.0.0/16"
}

variable "dns_service_ip" {
    description = "Cluster DNS service IP inside service_cidr."
    type        = string
    default     = "172.16.0.10"
}

variable "ebpf_data_plane" {
    description = "eBPF data plane: null (standard) or cilium."
    type        = string
    default     = null

    validation {
        condition     = var.ebpf_data_plane == null || var.ebpf_data_plane == "cilium"
        error_message = "ebpf_data_plane must be null or cilium."
    }
}

variable "system_node_pool" {
    description = "System node pool configuration."
    type = object({
        vm_size          = optional(string, "Standard_D4s_v5")
        min_count        = optional(number, 1)
        max_count        = optional(number, 2)
        max_pods         = optional(number, 250)
        os_disk_size_gb  = optional(number, 30) # null auto-sizes; ephemeral disks need size <= VM cache
        os_sku           = optional(string, "AzureLinux")
    })
    default = {}

    validation {
        condition     = var.system_node_pool.min_count >= 1
        error_message = "System pool must have at least 2 nodes for HA in prod."
    }
}

variable "user_node_pools" {
    description = "Additional user-mode node pools."
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
    default = {
        user = {
        vm_size   = "Standard_D4s_v5"
        min_count = 1
        max_count = 2
        }
    }
}

variable "enable_managed_prometheus" {
    description = "Deploy Azure Monitor workspace + data collection rule for managed Prometheus."
    type        = bool
    default     = true
}

variable "create_acr" {
    description = "Create a Premium container registry and grant AcrPull to the cluster."
    type        = bool
    default     = true
}

variable "log_retention_days" {
    description = "Log Analytics retention in days."
    type        = number
    default     = 30
}
