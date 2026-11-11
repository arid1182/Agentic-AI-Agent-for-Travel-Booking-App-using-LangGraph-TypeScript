variable "name_prefix" { type = string }
variable "location" { type = string }
variable "resource_group_name" { type = string }
variable "retention_days" { 
    type = number
    default = 7 # 30 min for production, 7 days for dev/test 
    }
variable "enable_prometheus" { 
    type = bool
    default = true 
    }
variable "tags" { 
    type = map(string)
    default = {} 
    }