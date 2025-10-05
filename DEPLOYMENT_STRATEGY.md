# Nest Family Organizer - Multi-Environment Deployment Strategy

## Overview
This document outlines the deployment strategy for the Nest Family Organizer across multiple environments: Development, QA, Staging, UAT, and Production.

## Environment Definitions

### 1. **Development (dev)**
- **Purpose**: Active development and feature testing
- **Branch**: `develop`
- **Stability**: Unstable - frequent changes
- **Data**: Test data, can be reset anytime
- **Access**: Development team only
- **Deployment**: Automatic on push to `develop` branch

### 2. **QA (qa)**
- **Purpose**: Quality assurance and automated testing
- **Branch**: `qa`
- **Stability**: Semi-stable - changes after feature completion
- **Data**: Test data with defined test scenarios
- **Access**: QA team and developers
- **Deployment**: Manual trigger or automatic on push to `qa` branch

### 3. **Staging (staging)**
- **Purpose**: Pre-production testing with production-like setup
- **Branch**: `staging`
- **Stability**: Stable - release candidate testing
- **Data**: Production-like data (sanitized)
- **Access**: QA, Product team, stakeholders
- **Deployment**: Manual approval required

### 4. **UAT (uat)**
- **Purpose**: User acceptance testing with actual users
- **Branch**: `uat`
- **Stability**: Very stable - approved releases only
- **Data**: Production-like or actual production data (read-only)
- **Access**: End users, product team, stakeholders
- **Deployment**: Manual approval required

### 5. **Production (prod)**
- **Purpose**: Live production environment
- **Branch**: `main`
- **Stability**: Highly stable - tested and approved releases only
- **Data**: Real production data
- **Access**: All users
- **Deployment**: Manual approval with staged rollout

## Branching Strategy

```
main (prod)
  ↑
  └── uat
       ↑
       └── staging
            ↑
            └── qa
                 ↑
                 └── develop
                      ↑
                      └── feature/* branches
```

### Branch Protection Rules

#### `main` (Production)
- ✅ Require pull request reviews (2 approvers)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Require signed commits
- ✅ No force pushes
- ✅ No deletions
- ✅ Require deployment approval

#### `uat` (User Acceptance Testing)
- ✅ Require pull request reviews (1 approver)
- ✅ Require status checks to pass
- ✅ No force pushes
- ✅ Require deployment approval

#### `staging` (Staging)
- ✅ Require pull request reviews (1 approver)
- ✅ Require status checks to pass
- ✅ No force pushes

#### `qa` (Quality Assurance)
- ✅ Require status checks to pass
- ⚠️ Allow force pushes (for test fixes)

#### `develop` (Development)
- ✅ Require status checks to pass
- ⚠️ Allow force pushes (for development)

### Git Workflow

1. **Feature Development**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/new-feature
   # ... make changes ...
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   # Create PR to develop
   ```

2. **QA Deployment**
   ```bash
   git checkout qa
   git merge develop
   git push origin qa
   # Automatic deployment to QA
   ```

3. **Staging Deployment**
   ```bash
   git checkout staging
   git merge qa
   git push origin staging
   # Manual approval → deployment to Staging
   ```

4. **UAT Deployment**
   ```bash
   git checkout uat
   git merge staging
   git push origin uat
   # Manual approval → deployment to UAT
   ```

5. **Production Deployment**
   ```bash
   git checkout main
   git merge uat
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin main --tags
   # Manual approval → staged deployment to Production
   ```

## Environment URLs

### Development
- **Website**: `http://nest-family-organizer-website-dev.s3-website-us-east-1.amazonaws.com`
- **API**: `https://api-dev.nest-family.com` (or API Gateway URL)
- **Docs**: `http://nest-family-organizer-website-dev.s3-website-us-east-1.amazonaws.com/api-docs.html`

### QA
- **Website**: `http://nest-family-organizer-website-qa.s3-website-us-east-1.amazonaws.com`
- **API**: `https://api-qa.nest-family.com`
- **Docs**: `http://nest-family-organizer-website-qa.s3-website-us-east-1.amazonaws.com/api-docs.html`

### Staging
- **Website**: `http://nest-family-organizer-website-staging.s3-website-us-east-1.amazonaws.com`
- **API**: `https://api-staging.nest-family.com`
- **Docs**: `http://nest-family-organizer-website-staging.s3-website-us-east-1.amazonaws.com/api-docs.html`

### UAT
- **Website**: `http://nest-family-organizer-website-uat.s3-website-us-east-1.amazonaws.com`
- **API**: `https://api-uat.nest-family.com`
- **Docs**: `http://nest-family-organizer-website-uat.s3-website-us-east-1.amazonaws.com/api-docs.html`

### Production
- **Website**: `https://app.nest-family.com` (with custom domain)
- **API**: `https://api.nest-family.com`
- **Docs**: `https://docs.nest-family.com`

## AWS Resource Naming Convention

### DynamoDB Tables
- `nest-family-organizer-todos-dev`
- `nest-family-organizer-todos-qa`
- `nest-family-organizer-todos-staging`
- `nest-family-organizer-todos-uat`
- `nest-family-organizer-todos-prod`

### S3 Buckets
- `nest-family-organizer-website-dev`
- `nest-family-organizer-website-qa`
- `nest-family-organizer-website-staging`
- `nest-family-organizer-website-uat`
- `nest-family-organizer-website-prod`

### Lambda Functions
- `nest-family-organizer-dev-login`
- `nest-family-organizer-qa-login`
- `nest-family-organizer-staging-login`
- `nest-family-organizer-uat-login`
- `nest-family-organizer-prod-login`

### API Gateway
- `nest-family-organizer-dev`
- `nest-family-organizer-qa`
- `nest-family-organizer-staging`
- `nest-family-organizer-uat`
- `nest-family-organizer-prod`

## Environment Variables

### Development
```bash
NODE_ENV=development
STAGE=dev
API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
JWT_SECRET=dev-secret-key-change-in-production
LOG_LEVEL=debug
ENABLE_DEBUG=true
```

### QA
```bash
NODE_ENV=qa
STAGE=qa
API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/qa
JWT_SECRET=qa-secret-key-change-in-production
LOG_LEVEL=debug
ENABLE_DEBUG=true
```

### Staging
```bash
NODE_ENV=staging
STAGE=staging
API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/staging
JWT_SECRET=staging-secret-key-from-aws-secrets-manager
LOG_LEVEL=info
ENABLE_DEBUG=false
```

### UAT
```bash
NODE_ENV=uat
STAGE=uat
API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/uat
JWT_SECRET=uat-secret-key-from-aws-secrets-manager
LOG_LEVEL=info
ENABLE_DEBUG=false
```

### Production
```bash
NODE_ENV=production
STAGE=prod
API_URL=https://api.nest-family.com
JWT_SECRET=prod-secret-key-from-aws-secrets-manager
LOG_LEVEL=warn
ENABLE_DEBUG=false
ENABLE_MONITORING=true
ENABLE_ALERTING=true
```

## Deployment Process

### Manual Deployment Commands

```bash
# Deploy to Development
npm run deploy:dev
# or
serverless deploy --stage dev

# Deploy to QA
npm run deploy:qa
# or
serverless deploy --stage qa

# Deploy to Staging
npm run deploy:staging
# or
serverless deploy --stage staging

# Deploy to UAT
npm run deploy:uat
# or
serverless deploy --stage uat

# Deploy to Production
npm run deploy:prod
# or
serverless deploy --stage prod
```

### Rollback Commands

```bash
# Rollback to previous version
serverless rollback --stage prod --timestamp <timestamp>

# List deployments
serverless deploy list --stage prod
```

## CI/CD Pipeline (GitHub Actions)

### Workflow Triggers

1. **Development**: Auto-deploy on push to `develop`
2. **QA**: Auto-deploy on push to `qa`
3. **Staging**: Manual approval required
4. **UAT**: Manual approval required
5. **Production**: Manual approval + tagged release

### Pipeline Stages

```yaml
1. Code Checkout
2. Install Dependencies
3. Run Linting
4. Run Unit Tests
5. Run Integration Tests (QA+)
6. Security Scan
7. Build Application
8. Deploy to Environment
9. Run Smoke Tests
10. Notify Team (Slack/Email)
```

## Monitoring & Alerting

### CloudWatch Alarms (per environment)

- API Gateway 5xx errors > 1%
- Lambda errors > 5 in 5 minutes
- DynamoDB throttling events
- API response time > 3 seconds (p99)
- Memory utilization > 80%

### Logging

- **Development/QA**: CloudWatch with 7-day retention
- **Staging/UAT**: CloudWatch with 30-day retention
- **Production**: CloudWatch with 90-day retention + S3 archive

## Testing Strategy

### Development
- Unit tests (mandatory)
- Manual testing

### QA
- Unit tests
- Integration tests
- API contract tests
- End-to-end tests (Cypress/Playwright)

### Staging
- Full regression suite
- Performance tests
- Load tests
- Security scans

### UAT
- User acceptance tests
- Business workflow validation
- Data migration validation

### Production
- Smoke tests post-deployment
- Canary deployment (10% → 50% → 100%)
- Rollback plan ready

## Cost Optimization

### Development/QA
- Use smaller Lambda memory sizes
- Shorter CloudWatch log retention
- On-demand DynamoDB billing

### Staging/UAT
- Moderate Lambda memory
- Medium log retention
- On-demand DynamoDB billing

### Production
- Optimized Lambda memory
- Reserved capacity for DynamoDB (if needed)
- CloudFront CDN for static assets
- S3 intelligent tiering

## Security

### Secrets Management
- **Development**: Environment variables (for convenience)
- **QA**: AWS Secrets Manager
- **Staging/UAT/Prod**: AWS Secrets Manager with rotation

### Access Control
- Development: Open to dev team
- QA: Dev team + QA team
- Staging: Limited access with approval
- UAT: Product team + selected users
- Production: Role-based access control (RBAC)

### SSL/TLS
- Development: HTTP (S3 website)
- QA: HTTP (S3 website)
- Staging: HTTPS with AWS certificate
- UAT: HTTPS with AWS certificate
- Production: HTTPS with custom domain certificate

## Disaster Recovery

### Backup Strategy
- **Development/QA**: No backups (can recreate)
- **Staging**: Daily backups, 7-day retention
- **UAT**: Daily backups, 30-day retention
- **Production**:
  - Point-in-time recovery enabled
  - Daily backups, 90-day retention
  - Cross-region replication for critical data

### RTO/RPO
- **Production RTO**: < 1 hour
- **Production RPO**: < 5 minutes
- **UAT/Staging RTO**: < 4 hours
- **UAT/Staging RPO**: < 1 day

## Promotion Path

```
feature/* → develop → qa → staging → uat → main (prod)
     ↓          ↓        ↓        ↓        ↓        ↓
   local      dev      qa    staging    uat     prod
```

### Promotion Criteria

#### develop → qa
- ✅ All unit tests pass
- ✅ Code review approved
- ✅ Feature complete

#### qa → staging
- ✅ All integration tests pass
- ✅ API contract tests pass
- ✅ No critical bugs
- ✅ QA sign-off

#### staging → uat
- ✅ Full regression suite pass
- ✅ Performance tests pass
- ✅ Security scan clean
- ✅ Product owner approval

#### uat → main (prod)
- ✅ User acceptance tests pass
- ✅ Business validation complete
- ✅ Release notes prepared
- ✅ Stakeholder approval
- ✅ Rollback plan ready

## Documentation Requirements

### Each Release Must Include:
1. Release notes (features, fixes, breaking changes)
2. API documentation updates
3. User documentation updates
4. Database migration scripts (if any)
5. Configuration changes
6. Rollback procedure

## Tools & Services

### Required
- **Version Control**: GitHub
- **CI/CD**: GitHub Actions
- **Cloud Provider**: AWS
- **IaC**: Serverless Framework
- **Secrets**: AWS Secrets Manager
- **Monitoring**: CloudWatch
- **APM**: AWS X-Ray (optional)

### Optional
- **Error Tracking**: Sentry
- **Log Management**: CloudWatch Insights
- **Performance**: CloudWatch Synthetics
- **Security**: AWS Security Hub
- **Cost Management**: AWS Cost Explorer

## Getting Started

### Initial Setup

1. **Create branches**:
   ```bash
   git checkout -b develop
   git push origin develop

   git checkout -b qa
   git push origin qa

   git checkout -b staging
   git push origin staging

   git checkout -b uat
   git push origin uat
   ```

2. **Set up AWS environments**:
   ```bash
   ./scripts/setup-environments.sh
   ```

3. **Configure secrets**:
   ```bash
   aws secretsmanager create-secret --name nest-family-organizer/qa/jwt-secret --secret-string "..."
   aws secretsmanager create-secret --name nest-family-organizer/staging/jwt-secret --secret-string "..."
   # ... repeat for each environment
   ```

4. **Deploy to each environment**:
   ```bash
   npm run deploy:dev
   npm run deploy:qa
   npm run deploy:staging
   npm run deploy:uat
   npm run deploy:prod
   ```

5. **Set up CI/CD**:
   - Configure GitHub Actions workflows
   - Add environment secrets to GitHub
   - Test automated deployments

## Support & Contacts

- **Development Issues**: Dev team Slack channel
- **QA Issues**: QA team email
- **Production Incidents**: On-call rotation (PagerDuty)
- **Documentation**: Confluence/Notion

## Appendix

### Useful Commands

```bash
# Check current environment
aws sts get-caller-identity

# List all stacks
serverless info --stage dev
serverless info --stage qa
serverless info --stage staging
serverless info --stage uat
serverless info --stage prod

# View logs
serverless logs -f login --stage prod --tail

# Remove environment (dangerous!)
serverless remove --stage dev
```

### Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

---

**Last Updated**: 2024-01-05
**Version**: 1.0.0
**Owner**: DevOps Team
