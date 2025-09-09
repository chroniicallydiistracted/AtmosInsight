# AtmosInsight Manual Configuration Requirements

**Purpose**: This document outlines the specific manual inputs and configurations required from the user to complete the AtmosInsight production deployment.

## 🔴 CRITICAL - Required Before Deployment

### 1. Domain & SSL Certificate Configuration
**Required Information**:
- **Production Domain**: Confirm `weather.westfam.media` as the target domain
- **ACM Certificate ARN**: Provide the ARN of the SSL certificate in `us-east-1` region
  - Format: `arn:aws:acm:us-east-1:ACCOUNT:certificate/CERTIFICATE-ID`
  - Status: Certificate must be validated and active
- **DNS Strategy**: Confirm approach:
  - ✅ **Recommended**: DNS-only CNAME in Cloudflare → CloudFront
  - ⚠️ **Advanced**: Subdomain delegation to Route53

### 2. AWS Access & Deployment
**Required Information**:
- **AWS Account ID**: Target AWS account for deployment
- **IAM Role/User**: Role or user ARN for Terraform deployment access
- **AWS Region**: Confirm primary deployment region (recommend `us-east-1` for ACM)
- **S3 Bucket Name**: Name for static website hosting bucket

### 3. API Keys & Service Credentials
**⚠️ DO NOT SHARE ACTUAL KEYS IN CHAT - PROVIDE PATHS/NAMES ONLY**

#### Required API Keys:
- **OpenWeatherMap API Key**
  - Usage: Weather tiles and forecast data
  - Storage Path: AWS SSM Parameter Store path or name
  - Format: String value
  
- **Tracestrack API Key**  
  - Usage: Basemap tiles
  - Storage Path: AWS SSM Parameter Store path or name
  - Format: String value

#### Required Configuration:
- **NWS User-Agent String**
  - Required format: `"AtmosInsight/v0.1.0 (contact: YOUR-EMAIL@domain.com)"`
  - Must include contact email as required by NWS
  - Storage Path: AWS SSM Parameter Store path or name

#### Optional API Keys (for enhanced features):
- **GLM Lightning Service URL** (`GLM_TOE_PY_URL`)
  - Usage: Lightning visualization tiles
  - Can be disabled for MVP if not available

### 4. API Gateway & Catalog Service
**Required Information**:
- **Catalog API Base URL**: Full URL of deployed catalog API
  - Format: `https://API-ID.execute-api.REGION.amazonaws.com/catalog`
  - Will be used for `CATALOG_API_BASE` environment variable
- **API Gateway Configuration**: Confirm single API origin preference vs. multiple origins

### 5. Cloudflare DNS Configuration
**Required Actions**:
- **DNS Record Creation**: 
  - Type: CNAME
  - Name: `weather.westfam.media`
  - Target: CloudFront distribution domain (will be provided after Terraform deployment)
  - Proxy Status: **DNS Only** (disable orange cloud initially)
  
- **Cloudflare Caching Rules**:
  - **Recommended**: Add bypass rule for `/api/*` paths
  - **Reason**: Prevent double-caching (CloudFront + Cloudflare)

### 6. Cache TTL Policy Confirmation
**Current Recommendations** (confirm or override):
- NWS Alerts: 60 seconds
- OpenWeatherMap Tiles: 300-900 seconds
- CyclOSM/Tracestrack Tiles: 300 seconds
- GIBS Tiles (timestamped): 86400 seconds (1 day)
- GIBS Tiles (current): 3600 seconds (1 hour)
- GLM Tiles: 60-300 seconds
- Forecast Data: 300-600 seconds

## 🟡 IMPORTANT - Configuration Preferences

### 7. Feature Scope for MVP
**Confirm which features to enable**:
- ✅ Basemaps: CyclOSM + Tracestrack
- ✅ Weather Alerts: NWS alerts overlay  
- ✅ Satellite: NASA GIBS tiles
- ✅ Weather Tiles: OpenWeatherMap layers
- ❓ Lightning: GLM tiles (requires service URL)
- ❓ Forecast: Location-based weather popover
- ❓ Timeline: Time-series data navigation

### 8. Monitoring & Observability
**Preferences**:
- **Logging**: CloudWatch (default) or external service
- **Metrics**: CloudWatch (default) or custom solution
- **Alarms**: Specify 4xx/5xx rate thresholds and latency limits
- **Error Notifications**: SNS topic or email for alerts

### 9. Security & Access Control
**Configuration**:
- **CORS Policy**: Confirm allowed origins (domain whitelist)
- **API Rate Limiting**: Specify limits for public API endpoints
- **IP Restrictions**: Any geographic or IP-based access controls

## 🟢 OPTIONAL - Enhanced Configuration

### 10. Additional Weather Providers
**If desired for future expansion**:
- Meteomatics credentials
- Apple WeatherKit setup
- NASA Earthdata authentication
- AirNow air quality API access
- Additional satellite data sources

### 11. Performance Optimization
**Advanced options**:
- CloudFront edge location preferences
- Lambda memory/timeout adjustments
- S3 transfer acceleration
- Multi-region deployment strategy

## Configuration Checklist

### Before Implementation Can Begin:
- [ ] Domain confirmation (`weather.westfam.media`)
- [ ] ACM certificate ARN provided
- [ ] AWS account and access details confirmed
- [ ] API keys stored in AWS SSM/Secrets Manager (paths provided)
- [ ] NWS User-Agent string configured
- [ ] Catalog API deployment confirmed

### Before DNS Cutover:
- [ ] CloudFront distribution deployed and tested
- [ ] SSL certificate validation completed
- [ ] Smoke tests passing on all endpoints
- [ ] Cloudflare DNS record prepared (not activated)

### For Go-Live:
- [ ] Cloudflare CNAME activated
- [ ] Monitoring and alerting configured
- [ ] Performance baseline established
- [ ] Rollback plan documented

## Security Reminders

1. **Never share actual API keys in chat or documentation**
2. **Use AWS SSM Parameter Store or Secrets Manager for all secrets**
3. **Rotate any credentials that may have been exposed**
4. **Enable CloudTrail logging for deployment activities**
5. **Review IAM permissions for least-privilege access**

## Communication Protocol

**For providing required information**:
1. **AWS Resource ARNs**: Safe to share in chat
2. **Domain names**: Safe to share in chat  
3. **API key paths/names**: Safe to share (not the actual keys)
4. **Configuration preferences**: Safe to discuss in detail

**For sensitive data**:
- Store in AWS and provide resource paths only
- Use secure channels if direct transfer needed
- Confirm proper IAM access for automated systems

---

**Next Steps**: Please review this document and provide the required information. Implementation will begin once critical requirements (sections 1-6) are confirmed.