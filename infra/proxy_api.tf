data "archive_file" "proxy_api" {
  type        = "zip"
  source_file = "${path.module}/../tiling-services/proxy-api/index.mjs"
  output_path = "${path.module}/../tiling-services/proxy-api/function.zip"
}

resource "aws_iam_role" "proxy_api" {
  name = "weather-proxy-api-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "lambda.amazonaws.com" },
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "proxy_api_logs" {
  role = aws_iam_role.proxy_api.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect   = "Allow",
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      Resource = "arn:aws:logs:*:*:*"
    }]
  })
}

resource "aws_iam_role_policy" "proxy_api_secrets" {
  role = aws_iam_role.proxy_api.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "secretsmanager:GetSecretValue"
      ],
      Resource = [
        "arn:aws:secretsmanager:${var.region}:*:secret:atmosinsight/*"
      ]
    }]
  })
}

resource "aws_lambda_function" "proxy_api" {
  function_name    = "weather-proxy-api"
  role             = aws_iam_role.proxy_api.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.proxy_api.output_path
  source_code_hash = data.archive_file.proxy_api.output_base64sha256
  timeout          = 20
  lifecycle {
    ignore_changes = [
      environment, # Preserve env vars managed outside Terraform
    ]
  }
  environment {
    variables = {
      NWS_USER_AGENT              = var.nws_user_agent
      OPENWEATHER_API_KEY_SECRET  = "atmosinsight/openweather-api-key"
      TRACESTRACK_API_KEY_SECRET  = "atmosinsight/tracestrack-api-key"
      RAINVIEWER_ENABLED          = "true"
      GIBS_ENABLED                = "true"
      GLM_TOE_PY_URL              = var.glm_toe_py_url
      CATALOG_API_BASE            = var.catalog_api_base
      # Fallback to direct env vars if secrets are not available
      OPENWEATHER_API_KEY         = var.openweather_api_key
      TRACESTRACK_API_KEY         = var.tracestrack_api_key
    }
  }
}

resource "aws_apigatewayv2_api" "proxy" {
  name          = "weather-proxy-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "proxy" {
  api_id                 = aws_apigatewayv2_api.proxy.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.proxy_api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proxy_any" {
  api_id    = aws_apigatewayv2_api.proxy.id
  route_key = "ANY /api/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.proxy.id}"
}

resource "aws_apigatewayv2_stage" "proxy" {
  api_id      = aws_apigatewayv2_api.proxy.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "proxy_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.proxy_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.proxy.execution_arn}/*/*"
}

output "proxy_api_endpoint" {
  value = aws_apigatewayv2_api.proxy.api_endpoint
}
