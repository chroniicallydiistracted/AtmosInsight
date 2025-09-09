data "archive_file" "catalog_api" {
  type        = "zip"
  source_dir  = "${path.module}/../tiling-services/catalog-api"
  output_path = "${path.module}/../tiling-services/catalog-api/function.zip"
}

resource "aws_iam_role" "catalog_api" {
  name = "catalog-api-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "catalog_api" {
  role = aws_iam_role.catalog_api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan"],
      Resource = module.layer_index.table_arn
      }, {
      Effect   = "Allow"
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      Resource = "arn:aws:logs:*:*:*"
    }]
  })
}

resource "aws_lambda_function" "catalog_api" {
  function_name    = "catalog-api"
  role             = aws_iam_role.catalog_api.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.catalog_api.output_path
  source_code_hash = data.archive_file.catalog_api.output_base64sha256
  environment {
    variables = {
      TABLE_NAME = module.layer_index.table_name
    }
  }
}

resource "aws_apigatewayv2_api" "catalog" {
  name          = "catalog-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "catalog" {
  api_id                 = aws_apigatewayv2_api.catalog.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.catalog_api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "catalog_layers" {
  api_id    = aws_apigatewayv2_api.catalog.id
  route_key = "GET /catalog/layers"
  target    = "integrations/${aws_apigatewayv2_integration.catalog.id}"
}

resource "aws_apigatewayv2_route" "catalog_times" {
  api_id    = aws_apigatewayv2_api.catalog.id
  route_key = "GET /catalog/layers/{id}/times"
  target    = "integrations/${aws_apigatewayv2_integration.catalog.id}"
}

resource "aws_apigatewayv2_stage" "catalog" {
  api_id      = aws_apigatewayv2_api.catalog.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "catalog" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.catalog_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.catalog.execution_arn}/*/*"
}
