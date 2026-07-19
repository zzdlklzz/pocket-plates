# PocketPlates AWS Terraform Lab

This folder contains the Phase 5 Terraform project for the PocketPlates AWS learning deployment. It creates the low-cost infrastructure needed to host the Dockerized Next.js app on one public EC2 instance while Supabase remains the auth and database backend.

The AWS stack is intended to be temporary and reproducible. Create it for a practice session, deploy and test the app in later phases, then destroy it when you are done.

## What Terraform Creates

| File | Purpose |
| --- | --- |
| `versions.tf` | Requires Terraform 1.6+ and pins the AWS provider to the stable 5.x provider line. |
| `providers.tf` | Configures the AWS provider region and applies shared tags to supported AWS resources. |
| `variables.tf` | Defines the configurable inputs for region, naming, networking, EC2 size, SSH access, ECR, logs, and the optional budget. |
| `main.tf` | Creates the VPC, public subnet, internet routing, security group, IAM role, ECR repository, CloudWatch log groups, EC2 host, optional Elastic IP, and optional AWS Budget. |
| `outputs.tf` | Prints useful values after `terraform apply`, such as the EC2 public IP, ECR repository URL, and Session Manager command. |
| `user-data.sh` | Runs on first EC2 boot to update packages, install Docker, try to install the CloudWatch agent, start Docker, and prepare `/opt/pocketplates`. |
| `terraform.tfvars.example` | Shows safe placeholder configuration. Copy it to `terraform.tfvars` locally if you want to override defaults. Do not commit real local values. |

## Resource Design

Terraform creates a dedicated VPC with one public subnet, one internet gateway, and one route table. This keeps the lab isolated from default AWS networking and makes the infrastructure easy to destroy.

The security group opens:

- HTTP `80` from the internet for the first Caddy reverse proxy setup.
- HTTPS `443` from the internet for a later domain-backed HTTPS setup.
- SSH `22` only when you explicitly set `ssh_cidr_blocks`.

By default, SSH is closed. The EC2 role includes `AmazonSSMManagedInstanceCore` so you can use AWS Systems Manager Session Manager later without opening SSH, once the instance has registered with SSM.

The EC2 instance uses the latest Amazon Linux 2023 x86_64 AMI unless you set `ami_id`. It uses a small encrypted `gp3` root volume and IMDSv2-only metadata access. The instance profile can pull from ECR and publish through the CloudWatch agent.

The ECR repository stores immutable Docker image tags. Use unique tags, such as the Git commit SHA. Terraform also adds a lifecycle policy that deletes untagged images after 7 days and keeps the last 20 images.

CloudWatch log groups are reserved for future app and Caddy logs with short retention. Later deployment work will wire Docker/Caddy logging into these groups.

The optional AWS Budget is created only when `budget_alert_email` is set. If you already created budgets manually, leave it unset.

## First-Time Setup

Check local tools:

```bash
terraform version
aws --version
```

Authenticate the AWS CLI using your IAM admin user or a short-lived AWS SSO/session workflow. Do not create or use root access keys.

Confirm the caller and region before planning:

```bash
aws sts get-caller-identity
aws configure get region
```

## Configure

Use defaults for the first plan, or create a local `terraform.tfvars` from the example:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Common overrides:

```hcl
aws_region = "ap-southeast-1"

# Optional: only if you intentionally want SSH.
ssh_key_name = "your-existing-key-pair"
ssh_cidr_blocks = ["203.0.113.10/32"]

# Optional: only if you want Terraform to create another budget.
budget_alert_email = "you@example.com"
```

Never commit `terraform.tfvars`, `*.tfstate`, `.terraform/`, or secret values.

## Workflow

Initialize and review:

```bash
cd infra/aws
terraform init
terraform fmt
terraform validate
terraform plan
```

Create the lab only when the plan looks right:

```bash
terraform apply
```

After apply, note the outputs:

- `ec2_instance_id`
- `ec2_public_ip`
- `app_http_url`
- `ecr_repository_url`
- `ssm_start_session_command`

The app will not be live immediately after Phase 5. This phase creates the infrastructure. Later phases push the Docker image to ECR, place the Compose/Caddy files on the host, inject runtime environment variables, and start the container.

## Destroy

Destroy the lab when you are done practicing:

```bash
terraform destroy
```

After destroying, check AWS Billing/Cost Explorer and confirm there are no leftover EC2 instances, EBS volumes, Elastic IPs, load balancers, NAT gateways, or extra Route 53 hosted zones.

## Cost Notes

This first stack intentionally avoids NAT Gateway, Application Load Balancer, RDS, ECS, and EKS. The main expected costs are the public IPv4 address, EC2/EBS if not covered by your account credits or free-tier eligibility, CloudWatch logs if used, and an optional Elastic IP if enabled.

Use `create_elastic_ip = false` unless you need a stable address. Public IPv4 has a charge whether it is auto-assigned to the instance or allocated as an Elastic IP, and idle Elastic IPs can create avoidable cost.
