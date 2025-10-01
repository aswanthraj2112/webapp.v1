locals {
  parameter_path = "/n11817143/app"
}

resource "aws_ssm_parameter" "cognito_user_pool_id" {
  name  = "${local.parameter_path}/cognitoUserPoolId"
  type  = "String"
  value = aws_cognito_user_pool.video_app.id
}

resource "aws_ssm_parameter" "cognito_client_id" {
  name  = "${local.parameter_path}/cognitoClientId"
  type  = "String"
  value = aws_cognito_user_pool_client.webapp.id
}

resource "aws_ssm_parameter" "s3_bucket" {
  name  = "${local.parameter_path}/s3Bucket"
  type  = "String"
  value = aws_s3_bucket.video_storage.id
}

resource "aws_ssm_parameter" "dynamo_table" {
  name  = "${local.parameter_path}/dynamoTable"
  type  = "String"
  value = aws_dynamodb_table.video_metadata.name
}

resource "aws_ssm_parameter" "elasticache_endpoint" {
  name  = "${local.parameter_path}/elasticacheEndpoint"
  type  = "String"
  value = aws_elasticache_cluster.video_cache.configuration_endpoint
}
