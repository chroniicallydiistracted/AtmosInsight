# AtmosInsight Production Readiness Checklist

**Date:** September 9, 2025  
**Version:** 1.0  
**Purpose:** Comprehensive checklist for production deployment verification

## 🚨 CRITICAL: Must Complete Before Production

### ✅ Phase 1: S3 Bucket Configuration Verification
**Status: ✅ COMPLETED**

#### ✅ Completed Actions:
- [x] **✅ Bucket verification completed via AWS Open Data Registry**
  - Sources: https://registry.opendata.aws/noaa-hrrr-pds/ and https://registry.opendata.aws/sentinel-2-l2a-cogs/

- [x] **✅ HRRR Zarr bucket configuration RESOLVED**
  - [x] Verified bucket: `hrrrzarr` in `us-west-1`
  - [x] Confirmed public access (no authentication required)
  - [x] Updated `packages/providers/providers.json` with verified config
  - [x] Removed `"status": "todo"` marker

- [x] **✅ Sentinel-2 COG bucket configuration RESOLVED**
  - [x] Verified bucket: `sentinel-cogs` in `us-west-2`
  - [x] Confirmed public access with SNS notifications
  - [x] Updated `packages/providers/providers.json` with verified config
  - [x] Removed `"status": "todo"` marker

- [x] **✅ Provider manifest validation PASSED**
  ```bash
  jq '[.providers[] | select(.status == "todo")] | length' packages/providers/providers.json
  # Returns: 0 ✅ ZERO TODO ITEMS
  ```

### Phase 2: Infrastructure Deployment
**Status: ❌ UNKNOWN**

#### Pre-deployment Requirements:
- [ ] **AWS credentials configured**
  ```bash
  aws sts get-caller-identity
  ```

- [ ] **Terraform available and initialized**
  ```bash
  cd infra && terraform init
  ```

- [ ] **Environment variables configured**
  - [ ] `AWS_REGION=us-east-1`
  - [ ] `ALLOWED_ORIGINS=https://weather.westfam.media`
  - [ ] `NODE_ENV=production`

#### Deployment Steps:
- [ ] **Run comprehensive deployment script**
  ```bash
  ./scripts/deploy-production-comprehensive.sh
  ```

- [ ] **Verify infrastructure deployment**
  ```bash
  cd infra && terraform plan
  # Should show: "No changes. Your infrastructure matches the configuration."
  ```

- [ ] **Confirm Lambda functions deployed**
  ```bash
  aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `atmosinsight`)].FunctionName'
  ```

### Phase 3: Production Configuration Audit
**Status: ❌ UNKNOWN**

#### Run Configuration Audit:
- [ ] **Execute production configuration audit**
  ```bash
  ./scripts/audit-production-config.sh
  ```

#### Required Secrets (AWS Secrets Manager):
- [ ] **atmosinsight/api-keys** - Bundle of all API keys
- [ ] **atmosinsight/openweather** - OpenWeatherMap API key
- [ ] **atmosinsight/airnow** - AirNow API key
- [ ] **atmosinsight/tracestrack** - TracesTrack API key
- [ ] **atmosinsight/firms** - NASA FIRMS map key (optional)

#### Environment Variables (Lambda):
- [ ] **ALLOWED_ORIGINS** - `https://weather.westfam.media`
- [ ] **NODE_ENV** - `production`
- [ ] **AWS_REGION** - `us-east-1`
- [ ] **NWS_USER_AGENT** - Required for NWS API compliance

## 🔍 Production Verification Tests

### Phase 4: Endpoint Testing
**Status: ❌ UNKNOWN**

#### Health Checks:
- [ ] **Primary health endpoint**
  ```bash
  curl https://weather.westfam.media/api/health
  # Expected: HTTP 200, JSON response with status
  ```

- [ ] **Provider health endpoint**
  ```bash
  curl https://weather.westfam.media/health/providers
  # Expected: HTTP 200, provider summary
  ```

#### S3 Provider Endpoints:
- [ ] **GOES-19 ABI endpoint**
  ```bash
  curl -I https://weather.westfam.media/api/s3/goes19-abi/
  # Expected: HTTP 400 (missing path), NOT 500
  ```

- [ ] **HRRR model endpoint**
  ```bash
  curl -I https://weather.westfam.media/api/s3/hrrr/
  # Expected: HTTP 400 (missing path), NOT 500
  ```

- [ ] **MRMS radar endpoint**
  ```bash
  curl -I https://weather.westfam.media/api/s3/mrms/
  # Expected: HTTP 400 (missing path), NOT 500
  ```

#### Non-S3 Provider Endpoints:
- [ ] **NASA GIBS endpoint**
  ```bash
  curl -I https://weather.westfam.media/api/gibs/redirect?layer=test
  # Expected: HTTP 400 (bad params), NOT 500
  ```

- [ ] **AirNow endpoint**
  ```bash
  curl -I https://weather.westfam.media/api/air/airnow/current?lat=40&lon=-74
  # Expected: HTTP 200 or 403 (depending on API key), NOT 500
  ```

### Phase 5: Security & Performance
**Status: ❌ UNKNOWN**

#### Security Tests:
- [ ] **CORS headers verification**
  ```bash
  curl -H "Origin: https://weather.westfam.media" -I https://weather.westfam.media/api/health
  # Expected: Access-Control-Allow-Origin header present
  ```

- [ ] **Security headers verification**
  ```bash
  curl -I https://weather.westfam.media/api/health | grep -i security
  # Expected: Security headers present (X-Frame-Options, etc.)
  ```

- [ ] **No information disclosure**
  ```bash
  curl https://weather.westfam.media/api/health | grep -i -E "(error|debug|stack|trace)"
  # Expected: No debug information exposed
  ```

#### Performance Tests:
- [ ] **Response time verification**
  ```bash
  curl -w "%{time_total}" -o /dev/null -s https://weather.westfam.media/api/health
  # Expected: < 2.0 seconds
  ```

- [ ] **Cost headers verification**
  ```bash
  curl -I https://weather.westfam.media/api/s3/landsat-pds/ | grep x-cost-note
  # Expected: x-cost-note: cross-region
  ```

### Phase 6: Frontend Integration
**Status: ❌ UNKNOWN**

#### Web Application Tests:
- [ ] **Frontend accessibility**
  ```bash
  curl -I https://weather.westfam.media/
  # Expected: HTTP 200, proper content-type
  ```

- [ ] **Provider manifest consumption**
  - [ ] Open browser developer tools
  - [ ] Navigate to https://weather.westfam.media
  - [ ] Verify no console errors related to provider loading
  - [ ] Confirm map loads with base layers

- [ ] **Map functionality**
  - [ ] Verify base map renders correctly
  - [ ] Test layer toggles work
  - [ ] Confirm no JavaScript errors in console

## 📊 Success Criteria

### All Systems Go Checklist:
- [ ] **Zero TODO providers** in `packages/providers/providers.json`
- [ ] **All infrastructure deployed** via Terraform
- [ ] **All Lambda functions responding** with correct status codes
- [ ] **All health endpoints returning 200**
- [ ] **Security headers present** on all responses
- [ ] **CORS configured correctly** for production origin
- [ ] **Response times under 2 seconds** for health checks
- [ ] **Cost awareness headers** present for cross-region providers
- [ ] **Frontend loading without errors**
- [ ] **No sensitive information exposed** in API responses

### Performance Benchmarks:
- [ ] **API response time** < 2 seconds
- [ ] **Frontend load time** < 5 seconds
- [ ] **S3 provider request time** < 10 seconds
- [ ] **Cross-region latency** documented and acceptable

### Monitoring Setup:
- [ ] **CloudWatch logs** configured for Lambda functions
- [ ] **CloudWatch alarms** set up for critical metrics
- [ ] **Cost monitoring** enabled for cross-region and requester-pays
- [ ] **Error tracking** configured for frontend application

## 🚀 Post-Deployment Actions

### Immediate (0-24 hours):
- [ ] **Monitor CloudWatch logs** for any errors or warnings
- [ ] **Test each provider endpoint** with real data requests
- [ ] **Verify cost tracking** is working correctly
- [ ] **Confirm DNS propagation** if using custom domain

### Short-term (1-7 days):
- [ ] **Performance monitoring** - track response times and errors
- [ ] **Cost analysis** - review AWS billing for unexpected charges
- [ ] **User acceptance testing** - verify all features work as expected
- [ ] **Load testing** - ensure system handles expected traffic

### Long-term (1-4 weeks):
- [ ] **Security audit** - review access logs and security headers
- [ ] **Performance optimization** - analyze and optimize slow endpoints
- [ ] **Monitoring setup** - configure comprehensive alerting
- [ ] **Documentation update** - finalize operational runbooks

## 📞 Emergency Contacts & Rollback

### Emergency Procedures:
- [ ] **Rollback plan documented** for critical failures
- [ ] **Emergency contact list** established
- [ ] **Incident response procedures** defined

### Rollback Commands:
```bash
# Emergency rollback (if needed)
cd infra
terraform plan -destroy -out=destroy.tfplan
# Review plan carefully before applying
terraform apply destroy.tfplan
```

## 📋 Sign-off

### Technical Review:
- [ ] **Backend Engineer** - API endpoints verified
- [ ] **Frontend Engineer** - Web application verified  
- [ ] **DevOps Engineer** - Infrastructure verified
- [ ] **Security Engineer** - Security measures verified

### Business Review:
- [ ] **Product Owner** - Features verified
- [ ] **QA Lead** - Testing completed
- [ ] **Operations Manager** - Monitoring verified

---

**Production Deployment Authorization:**

**Date:** _______________  
**Approved by:** _______________  
**Deployment Lead:** _______________  

**Notes:**
_Use this space to document any deviations from standard process or special considerations for this deployment._