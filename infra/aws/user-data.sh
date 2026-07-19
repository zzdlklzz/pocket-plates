#!/bin/bash
set -euxo pipefail

dnf update -y
dnf install -y docker amazon-cloudwatch-agent || dnf install -y docker

systemctl enable --now docker

mkdir -p /opt/pocketplates

cat >/opt/pocketplates/README.txt <<EOT
PocketPlates AWS lab host

Project: ${project_name}
Environment: ${environment}

Terraform created this instance and prepared Docker. The app container,
compose.yml, Caddyfile, and runtime .env file are added in the deployment phase.
Do not store long-lived credentials or secrets in this directory outside a
managed deployment workflow.
EOT

chown -R ec2-user:ec2-user /opt/pocketplates
