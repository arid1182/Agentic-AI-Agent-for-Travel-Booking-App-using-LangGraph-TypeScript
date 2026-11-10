variable "name_prefix" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "address_space" { type = string }
variable "aks_subnet_cidr" { type = string }
variable "api_subnet_cidr" { type = string }
variable "firewall_private_ip" { 
    type = string 
    default = null 
    }
variable "enable_api_server_subnet" { 
    type = bool
    default = true 
    }
variable "tags" { 
    type = map(string)
    default = {} 
    }