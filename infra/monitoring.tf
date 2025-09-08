# CloudWatch monitoring and alarms for AtmosInsight production infrastructure

# SNS topic for alarm notifications
resource "aws_sns_topic" "alerts" {
  count = var.monitoring_enabled ? 1 : 0
  name  = "atmosinsight-production-alerts"

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

# SNS topic subscription for email alerts (if email provided)
resource "aws_sns_topic_subscription" "email_alerts" {
  count     = var.monitoring_enabled && var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Lambda Function Alarms
resource "aws_cloudwatch_metric_alarm" "proxy_api_errors" {
  count = var.monitoring_enabled ? 1 : 0
  
  alarm_name          = "atmosinsight-proxy-api-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors proxy API lambda errors"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]

  dimensions = {
    FunctionName = aws_lambda_function.proxy_api.function_name
  }

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

resource "aws_cloudwatch_metric_alarm" "proxy_api_duration" {
  count = var.monitoring_enabled ? 1 : 0
  
  alarm_name          = "atmosinsight-proxy-api-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = "10000"  # 10 seconds
  alarm_description   = "This metric monitors proxy API lambda duration"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]

  dimensions = {
    FunctionName = aws_lambda_function.proxy_api.function_name
  }

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

resource "aws_cloudwatch_metric_alarm" "proxy_api_throttles" {
  count = var.monitoring_enabled ? 1 : 0
  
  alarm_name          = "atmosinsight-proxy-api-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors proxy API lambda throttles"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]

  dimensions = {
    FunctionName = aws_lambda_function.proxy_api.function_name
  }

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

# Catalog API Lambda Alarms (if catalog API exists and monitoring enabled)
resource "aws_cloudwatch_metric_alarm" "catalog_api_errors" {
  count = var.monitoring_enabled && var.catalog_api_base != "" ? 1 : 0
  
  alarm_name          = "atmosinsight-catalog-api-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors catalog API lambda errors"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]

  dimensions = {
    FunctionName = aws_lambda_function.catalog_api.function_name
  }

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

# API Gateway Alarms
resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx_errors" {
  count = var.monitoring_enabled ? 1 : 0
  
  alarm_name          = "atmosinsight-api-gateway-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGatewayV2"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors API Gateway 5xx errors"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]

  dimensions = {
    ApiId = aws_apigatewayv2_api.proxy.id
  }

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_4xx_errors" {
  count = var.monitoring_enabled ? 1 : 0
  
  alarm_name          = "atmosinsight-api-gateway-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGatewayV2"
  period              = "300"
  statistic           = "Sum"
  threshold           = "50"  # Higher threshold for 4xx as they may be expected
  alarm_description   = "This metric monitors API Gateway 4xx errors"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]

  dimensions = {
    ApiId = aws_apigatewayv2_api.proxy.id
  }

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_latency" {
  count = var.monitoring_enabled ? 1 : 0
  
  alarm_name          = "atmosinsight-api-gateway-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "IntegrationLatency"
  namespace           = "AWS/ApiGatewayV2"
  period              = "300"
  statistic           = "Average"
  threshold           = "15000"  # 15 seconds
  alarm_description   = "This metric monitors API Gateway integration latency"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]

  dimensions = {
    ApiId = aws_apigatewayv2_api.proxy.id
  }

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

# CloudFront Alarms (if CloudFront is enabled and monitoring enabled)
resource "aws_cloudwatch_metric_alarm" "cloudfront_error_rate" {
  count = var.monitoring_enabled && var.cdn_enabled ? 1 : 0
  
  alarm_name          = "atmosinsight-cloudfront-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "10"  # 10% error rate
  alarm_description   = "This metric monitors CloudFront error rate"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]

  dimensions = {
    DistributionId = module.cdn[0].distribution_id
  }

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

resource "aws_cloudwatch_metric_alarm" "cloudfront_origin_latency" {
  count = var.monitoring_enabled && var.cdn_enabled ? 1 : 0
  
  alarm_name          = "atmosinsight-cloudfront-origin-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "OriginLatency"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5000"  # 5 seconds
  alarm_description   = "This metric monitors CloudFront origin latency"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]

  dimensions = {
    DistributionId = module.cdn[0].distribution_id
  }

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

# DynamoDB Alarms
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttled_requests" {
  count = var.monitoring_enabled ? 1 : 0
  
  alarm_name          = "atmosinsight-dynamodb-throttled-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UserErrors"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors DynamoDB throttled requests"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]

  dimensions = {
    TableName = module.layer_index.table_name
  }

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

# Custom Log Metrics
resource "aws_cloudwatch_log_metric_filter" "proxy_api_fatal_errors" {
  count = var.monitoring_enabled ? 1 : 0
  
  name           = "atmosinsight-proxy-api-fatal-errors"
  log_group_name = aws_cloudwatch_log_group.proxy_api[0].name
  pattern        = "[timestamp, requestId, \"ERROR\", ...]"

  metric_transformation {
    name      = "ProxyApiFatalErrors"
    namespace = "AtmosInsight/Application"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "proxy_api_fatal_errors" {
  count = var.monitoring_enabled ? 1 : 0
  
  alarm_name          = "atmosinsight-proxy-api-fatal-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ProxyApiFatalErrors"
  namespace           = "AtmosInsight/Application"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "This metric monitors fatal errors in proxy API logs"
  alarm_actions       = [aws_sns_topic.alerts[0].arn]
  treat_missing_data  = "notBreaching"

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

# Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  count = var.monitoring_enabled ? 1 : 0
  
  dashboard_name = "AtmosInsight-Production"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.proxy_api.function_name],
            [".", "Errors", ".", "."],
            [".", "Duration", ".", "."],
            [".", "Throttles", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "Lambda Metrics - Proxy API"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApiGatewayV2", "Count", "ApiId", aws_apigatewayv2_api.proxy.id],
            [".", "4XXError", ".", "."],
            [".", "5XXError", ".", "."],
            [".", "IntegrationLatency", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "API Gateway Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", module.layer_index.table_name],
            [".", "ConsumedWriteCapacityUnits", ".", "."],
            [".", "ItemCount", ".", "."],
            [".", "UserErrors", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.region
          title   = "DynamoDB Metrics"
          period  = 300
        }
      }
    ]
  })
}

# Log groups with retention
resource "aws_cloudwatch_log_group" "proxy_api" {
  count = var.monitoring_enabled ? 1 : 0
  
  name              = "/aws/lambda/${aws_lambda_function.proxy_api.function_name}"
  retention_in_days = var.log_retention_days

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

resource "aws_cloudwatch_log_group" "catalog_api" {
  count             = var.monitoring_enabled && var.catalog_api_base != "" ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.catalog_api.function_name}"
  retention_in_days = var.log_retention_days

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  count = var.monitoring_enabled ? 1 : 0
  
  name              = "/aws/apigatewayv2/${aws_apigatewayv2_api.proxy.name}"
  retention_in_days = var.log_retention_days

  tags = {
    Environment = "production"
    Project     = "AtmosInsight"
  }
}

# Outputs for monitoring
output "sns_alerts_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = var.monitoring_enabled ? aws_sns_topic.alerts[0].arn : ""
}

output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = var.monitoring_enabled ? "https://${var.region}.console.aws.amazon.com/cloudwatch/home?region=${var.region}#dashboards:name=${aws_cloudwatch_dashboard.main[0].dashboard_name}" : ""
}