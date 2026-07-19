output "aws_region" {
  description = "AWS region where Terraform created the PocketPlates lab."
  value       = var.aws_region
}

output "ec2_instance_id" {
  description = "ID of the EC2 Docker host."
  value       = aws_instance.app.id
}

output "ec2_public_ip" {
  description = "Public IPv4 address for the EC2 Docker host."
  value       = var.create_elastic_ip ? aws_eip.app[0].public_ip : aws_instance.app.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS name for the EC2 Docker host."
  value       = aws_instance.app.public_dns
}

output "app_http_url" {
  description = "HTTP URL to test after a container and Caddy are deployed."
  value       = "http://${var.create_elastic_ip ? aws_eip.app[0].public_ip : aws_instance.app.public_ip}"
}

output "ecr_repository_name" {
  description = "Name of the ECR repository for PocketPlates images."
  value       = aws_ecr_repository.app.name
}

output "ecr_repository_url" {
  description = "URL of the ECR repository for Docker push and pull commands."
  value       = aws_ecr_repository.app.repository_url
}

output "app_log_group_name" {
  description = "CloudWatch Logs group reserved for PocketPlates application logs."
  value       = aws_cloudwatch_log_group.app.name
}

output "caddy_log_group_name" {
  description = "CloudWatch Logs group reserved for Caddy access/proxy logs."
  value       = aws_cloudwatch_log_group.caddy.name
}

output "ssm_start_session_command" {
  description = "Command for connecting to the EC2 host through AWS Systems Manager Session Manager."
  value       = "aws ssm start-session --target ${aws_instance.app.id} --region ${var.aws_region}"
}
