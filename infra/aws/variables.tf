variable "project_name" {
  description = "Short project name used in AWS resource names and tags."
  type        = string
  default     = "pocketplates"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}[a-z0-9]$", var.project_name))
    error_message = "project_name must be 3-32 lowercase letters, numbers, or hyphens, and start with a letter."
  }
}

variable "environment" {
  description = "Deployment environment name used in AWS resource names and tags."
  type        = string
  default     = "dev"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.environment))
    error_message = "environment must be 3-22 lowercase letters, numbers, or hyphens, and start with a letter."
  }
}

variable "aws_region" {
  description = "AWS region where the learning environment will be created."
  type        = string
  default     = "ap-southeast-1"
}

variable "availability_zone" {
  description = "Optional fixed Availability Zone. Leave null to use the first available AZ in aws_region."
  type        = string
  default     = null
}

variable "vpc_cidr_block" {
  description = "CIDR block for the dedicated PocketPlates VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "public_subnet_cidr_block" {
  description = "CIDR block for the single public subnet that hosts the EC2 instance."
  type        = string
  default     = "10.42.1.0/24"
}

variable "instance_type" {
  description = "EC2 instance type for the Docker host. Use a micro instance while learning."
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "Optional AMI override. Leave null to use the latest Amazon Linux 2023 x86_64 AMI."
  type        = string
  default     = null
}

variable "root_volume_size_gb" {
  description = "Size of the encrypted EC2 root volume in GB."
  type        = number
  default     = 12

  validation {
    condition     = var.root_volume_size_gb >= 8 && var.root_volume_size_gb <= 30
    error_message = "root_volume_size_gb must be between 8 and 30 for the low-cost lab environment."
  }
}

variable "ssh_key_name" {
  description = "Optional existing EC2 key pair name. Leave null to avoid SSH and use SSM later."
  type        = string
  default     = null
}

variable "ssh_cidr_blocks" {
  description = "CIDR blocks allowed to SSH to the instance. Leave empty to keep port 22 closed."
  type        = list(string)
  default     = []
}

variable "create_elastic_ip" {
  description = "Whether to allocate an Elastic IP for a stable address. Public IPv4 charges apply either way."
  type        = bool
  default     = false
}

variable "ecr_repository_name" {
  description = "Optional ECR repository name override. Leave null to use project-environment-app."
  type        = string
  default     = null
}

variable "ecr_force_delete" {
  description = "Whether terraform destroy should delete the ECR repository even when it contains images."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention period for app and Caddy log groups."
  type        = number
  default     = 14

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30], var.log_retention_days)
    error_message = "log_retention_days must be one of 1, 3, 5, 7, 14, or 30."
  }
}

variable "budget_alert_email" {
  description = "Optional email address for an AWS Budget. Leave null if you already manage budgets manually."
  type        = string
  default     = null
}

variable "monthly_budget_limit_usd" {
  description = "Monthly AWS Budget limit used when budget_alert_email is set."
  type        = number
  default     = 5

  validation {
    condition     = var.monthly_budget_limit_usd >= 1 && var.monthly_budget_limit_usd <= 50
    error_message = "monthly_budget_limit_usd must stay between 1 and 50 for this lab."
  }
}
