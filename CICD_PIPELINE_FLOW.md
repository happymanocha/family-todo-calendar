# CI/CD Pipeline Flow - Nest Family Organizer

## 🔄 Complete Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DEVELOPER WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

1. Developer creates feature branch from 'develop'
   │
   ├─→ git checkout develop
   ├─→ git pull origin develop
   ├─→ git checkout -b feature/new-awesome-feature
   └─→ ... make changes, commit ...

2. Developer pushes feature branch to GitHub
   │
   └─→ git push origin feature/new-awesome-feature

3. Developer creates Pull Request to 'develop'
   │
   └─→ GitHub PR created (code review required)

┌─────────────────────────────────────────────────────────────────────────┐
│                    DEV ENVIRONMENT (Automatic)                           │
└─────────────────────────────────────────────────────────────────────────┘

4. PR merged to 'develop' branch
   │
   ├─→ Triggers: .github/workflows/deploy-dev.yml
   │
   ├─→ GitHub Actions Workflow Starts
   │   │
   │   ├── JOB 1: Run Tests
   │   │   ├─→ Checkout code
   │   │   ├─→ Setup Node.js 18.x
   │   │   ├─→ npm ci (install dependencies)
   │   │   ├─→ npm run lint (if configured)
   │   │   └─→ npm test (unit tests)
   │   │
   │   └── JOB 2: Deploy to DEV (runs after tests pass)
   │       ├─→ Checkout code
   │       ├─→ Setup Node.js 18.x
   │       ├─→ npm ci
   │       ├─→ Configure AWS credentials (from GitHub Secrets)
   │       ├─→ Install Serverless Framework
   │       ├─→ serverless deploy --stage dev
   │       │   │
   │       │   ├─→ CloudFormation creates/updates:
   │       │   │   ├─→ DynamoDB Tables (todos-dev, users-dev, families-dev)
   │       │   │   ├─→ Lambda Functions (all 30 functions)
   │       │   │   ├─→ API Gateway (REST API)
   │       │   │   └─→ S3 Bucket (website-dev)
   │       │   │
   │       │   └─→ S3 Sync (upload frontend files)
   │       │
   │       ├─→ Get deployment info (API URL, Website URL)
   │       ├─→ Run smoke tests
   │       │   ├─→ curl API_URL/api/health
   │       │   └─→ curl API_URL/api/info
   │       │
   │       └─→ Notify deployment status ✅
   │
   └─→ DEV Environment Live: http://nest-family-organizer-website-dev...

┌─────────────────────────────────────────────────────────────────────────┐
│                     QA ENVIRONMENT (Automatic)                           │
└─────────────────────────────────────────────────────────────────────────┘

5. Merge 'develop' → 'qa' (when dev testing complete)
   │
   ├─→ git checkout qa
   ├─→ git merge develop
   ├─→ git push origin qa
   │
   ├─→ Triggers: .github/workflows/deploy-qa.yml
   │
   ├─→ GitHub Actions Workflow Starts
   │   │
   │   ├── JOB 1: Run Tests
   │   │   ├─→ Checkout code
   │   │   ├─→ Setup Node.js 18.x
   │   │   ├─→ npm ci
   │   │   ├─→ npm run lint
   │   │   ├─→ npm test (unit tests)
   │   │   └─→ npm run test:integration (integration tests)
   │   │
   │   └── JOB 2: Deploy to QA (runs after tests pass)
   │       ├─→ Configure AWS credentials
   │       ├─→ serverless deploy --stage qa
   │       ├─→ Run smoke tests
   │       ├─→ npm run test:e2e (E2E tests with Cypress/Playwright)
   │       └─→ Notify deployment status ✅
   │
   └─→ QA Environment Live: http://nest-family-organizer-website-qa...

┌─────────────────────────────────────────────────────────────────────────┐
│                  STAGING ENVIRONMENT (Manual Approval)                   │
└─────────────────────────────────────────────────────────────────────────┘

6. Merge 'qa' → 'staging' (when QA testing passes)
   │
   ├─→ git checkout staging
   ├─→ git merge qa
   ├─→ git push origin staging
   │
   ├─→ Triggers: .github/workflows/deploy-staging.yml
   │
   ├─→ GitHub Actions Workflow Starts
   │   │
   │   ├── JOB 1: Run Tests
   │   │   ├─→ All tests (lint, unit, integration)
   │   │   └─→ npm audit --audit-level=moderate
   │   │
   │   └── JOB 2: Deploy to STAGING
   │       │
   │       ├─→ ⏸️  PAUSES for manual approval
   │       │   │
   │       │   └─→ GitHub Environment Protection Rule:
   │       │       "staging" environment requires 1 reviewer
   │       │       │
   │       │       ├─→ Reviewer gets notification
   │       │       ├─→ Reviewer checks test results
   │       │       ├─→ Reviewer approves/rejects
   │       │       │
   │       │       └─→ ✅ Approved → Deployment continues
   │       │
   │       ├─→ Get JWT secret from AWS Parameter Store
   │       ├─→ serverless deploy --stage staging
   │       ├─→ Run smoke tests
   │       ├─→ npm run test:regression (full regression suite)
   │       ├─→ npm run test:performance (load/performance tests)
   │       └─→ Notify deployment status ✅
   │
   └─→ STAGING Environment Live: http://nest-family-organizer-website-staging...

┌─────────────────────────────────────────────────────────────────────────┐
│                    UAT ENVIRONMENT (Manual Approval)                     │
└─────────────────────────────────────────────────────────────────────────┘

7. Merge 'staging' → 'uat' (when staging validated)
   │
   ├─→ git checkout uat
   ├─→ git merge staging
   ├─→ git push origin uat
   │
   ├─→ Triggers: .github/workflows/deploy-uat.yml
   │
   ├─→ GitHub Actions Workflow Starts
   │   │
   │   ├── JOB 1: Run Full Test Suite
   │   │   └─→ All tests (lint, unit, integration, regression)
   │   │
   │   └── JOB 2: Deploy to UAT
   │       │
   │       ├─→ ⏸️  PAUSES for manual approval
   │       │   │
   │       │   └─→ GitHub Environment Protection Rule:
   │       │       "uat" environment requires 1 reviewer
   │       │
   │       ├─→ Get JWT secret from AWS Parameter Store
   │       ├─→ serverless deploy --stage uat
   │       ├─→ Run smoke tests
   │       ├─→ npm run test:uat (user acceptance validation)
   │       ├─→ Create deployment report (artifact)
   │       └─→ Notify deployment status ✅
   │
   └─→ UAT Environment Live: http://nest-family-organizer-website-uat...
       │
       └─→ Business users perform acceptance testing

┌─────────────────────────────────────────────────────────────────────────┐
│                 PRODUCTION ENVIRONMENT (Strict Approval)                 │
└─────────────────────────────────────────────────────────────────────────┘

8. Merge 'uat' → 'main' + Create Release Tag (when UAT approved)
   │
   ├─→ git checkout main
   ├─→ git merge uat
   ├─→ git tag -a v1.2.3 -m "Release v1.2.3"
   ├─→ git push origin main --tags
   │
   ├─→ Triggers: .github/workflows/deploy-production.yml
   │
   ├─→ GitHub Actions Workflow Starts
   │   │
   │   ├── JOB 1: Validate Production Deployment
   │   │   │
   │   │   ├─→ If manual trigger: Check confirmation text
   │   │   │   └─→ Must type "DEPLOY TO PRODUCTION"
   │   │   │
   │   │   └─→ If tag trigger: Verify release tag format (v*.*.*)
   │   │
   │   ├── JOB 2: Run Comprehensive Tests
   │   │   ├─→ All tests (lint, unit, integration, regression)
   │   │   ├─→ npm audit --audit-level=high
   │   │   └─→ npm audit signatures
   │   │
   │   ├── JOB 3: Deploy to Production
   │   │   │
   │   │   ├─→ ⏸️  PAUSES for manual approval
   │   │   │   │
   │   │   │   └─→ GitHub Environment Protection Rule:
   │   │   │       "production" requires 2 reviewers
   │   │   │       │
   │   │   │       ├─→ Senior team members review
   │   │   │       ├─→ Check all test results
   │   │   │       ├─→ Verify release notes
   │   │   │       └─→ ✅✅ Both approve → Continues
   │   │   │
   │   │   ├─→ Backup current deployment
   │   │   │   └─→ serverless deploy list --stage prod
   │   │   │
   │   │   ├─→ Get JWT secret from AWS Parameter Store
   │   │   ├─→ serverless deploy --stage prod --verbose
   │   │   │   └─→ ENABLE_MONITORING=true, ENABLE_ALERTING=true
   │   │   │
   │   │   ├─→ Wait 30 seconds for stabilization
   │   │   ├─→ Run production smoke tests
   │   │   │   ├─→ Health check
   │   │   │   └─→ API info check
   │   │   │
   │   │   ├─→ Monitor error rates (5 minutes)
   │   │   ├─→ Create production deployment report
   │   │   ├─→ Upload artifact (90-day retention)
   │   │   ├─→ Create GitHub Release
   │   │   └─→ Notify deployment status ✅
   │   │
   │   └── JOB 4: Rollback on Failure (if deploy fails)
   │       │
   │       ├─→ Get previous deployment timestamp
   │       ├─→ serverless rollback --stage prod --timestamp <previous>
   │       ├─→ Wait 30 seconds
   │       ├─→ Verify rollback (smoke tests)
   │       └─→ Notify rollback completed ⚠️
   │
   └─→ PRODUCTION Live: https://app.nest-family.com 🎉
```

## 📋 Detailed Pipeline Steps

### **Step 1: Feature Development → DEV**

```bash
# Developer workflow
git checkout develop
git pull origin develop
git checkout -b feature/add-family-chat
# ... code changes ...
git add .
git commit -m "feat: add family chat feature"
git push origin feature/add-family-chat

# Create PR on GitHub: feature/add-family-chat → develop
# Code review → Approve → Merge
```

**What happens automatically:**
1. ✅ PR merged to `develop`
2. ✅ GitHub Actions triggered (deploy-dev.yml)
3. ✅ Tests run (unit tests)
4. ✅ Deploy to DEV environment
5. ✅ Smoke tests executed
6. ✅ Notification sent

**Result:** Feature live on DEV in ~3-5 minutes

---

### **Step 2: DEV → QA**

```bash
# After DEV testing complete
git checkout qa
git merge develop
git push origin qa
```

**What happens automatically:**
1. ✅ Push to `qa` branch
2. ✅ GitHub Actions triggered (deploy-qa.yml)
3. ✅ Tests run (unit + integration tests)
4. ✅ Deploy to QA environment
5. ✅ Smoke tests + E2E tests
6. ✅ Notification sent

**Result:** Feature live on QA in ~5-8 minutes

---

### **Step 3: QA → STAGING (Manual Approval)**

```bash
# After QA testing passes
git checkout staging
git merge qa
git push origin staging
```

**What happens with manual approval:**
1. ✅ Push to `staging` branch
2. ✅ GitHub Actions triggered (deploy-staging.yml)
3. ✅ All tests run (lint, unit, integration, security)
4. ⏸️  **PAUSES** - Waiting for approval
5. 👤 **Reviewer approves** in GitHub Actions UI
6. ✅ Retrieves secrets from AWS Parameter Store
7. ✅ Deploy to STAGING environment
8. ✅ Regression + performance tests
9. ✅ Notification sent

**Result:** Feature live on STAGING in ~10-15 minutes (after approval)

---

### **Step 4: STAGING → UAT (Manual Approval)**

```bash
# After staging validation
git checkout uat
git merge staging
git push origin uat
```

**What happens with manual approval:**
1. ✅ Push to `uat` branch
2. ✅ GitHub Actions triggered (deploy-uat.yml)
3. ✅ Full test suite runs
4. ⏸️  **PAUSES** - Waiting for approval
5. 👤 **Reviewer approves**
6. ✅ Deploy to UAT environment
7. ✅ UAT validation tests
8. ✅ Deployment report created
9. ✅ Notification sent

**Result:** Feature live on UAT for business users

---

### **Step 5: UAT → PRODUCTION (Strict Approval)**

```bash
# After UAT approval
git checkout main
git merge uat
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin main --tags
```

**What happens with strict approval:**
1. ✅ Push to `main` + tag
2. ✅ GitHub Actions triggered (deploy-production.yml)
3. ✅ Validation checks (tag format, confirmation)
4. ✅ Comprehensive test suite
5. ✅ Security scans
6. ⏸️  **PAUSES** - Waiting for **2 approvers**
7. 👤👤 **Two senior team members approve**
8. ✅ Backup current production
9. ✅ Deploy to PRODUCTION
10. ✅ Wait for stabilization (30 seconds)
11. ✅ Production smoke tests
12. ✅ Monitor error rates (5 minutes)
13. ✅ Create deployment report + GitHub Release
14. ✅ Notification sent
15. 🔄 **Automatic rollback if deployment fails**

**Result:** Feature live in PRODUCTION with full audit trail

---

## 🔐 GitHub Environment Protection

### Setting Up Environments in GitHub:

1. **Go to:** Repository → Settings → Environments

2. **Create Environments:**
   - `development` (no protection)
   - `qa` (no protection)
   - `staging` (1 required reviewer)
   - `uat` (1 required reviewer)
   - `production` (2 required reviewers)

3. **For each environment, configure:**
   - ✅ Required reviewers
   - ✅ Wait timer (optional, e.g., 5 minutes)
   - ✅ Deployment branches (limit to specific branches)
   - ✅ Environment secrets

---

## 📊 Pipeline Metrics

| Metric | DEV | QA | STAGING | UAT | PROD |
|--------|-----|----|---------|----|------|
| **Avg Deployment Time** | 3-5 min | 5-8 min | 10-15 min | 10-15 min | 15-20 min |
| **Manual Steps** | 0 | 0 | 1 (approval) | 1 (approval) | 2 (approvals) |
| **Test Coverage** | Unit | Unit + Integration | Full | Full + UAT | Full + Security |
| **Rollback** | Manual | Manual | Manual | Manual | Automatic |
| **Monitoring** | Basic | Basic | Enhanced | Enhanced | Full |

---

## 🎯 Example: Full Feature Lifecycle

Let's walk through deploying a new "Family Chat" feature:

### **Day 1 - Development**
```bash
# 9:00 AM - Developer starts work
git checkout -b feature/family-chat
# ... coding ...
git push origin feature/family-chat

# 11:00 AM - Create PR to develop
# 11:30 AM - Code review approved, merge to develop
# 11:32 AM - ✅ Auto-deployed to DEV
# 11:35 AM - Testing on DEV environment
```

### **Day 2 - QA Testing**
```bash
# 10:00 AM - Merge develop → qa
git checkout qa && git merge develop && git push

# 10:02 AM - ✅ Auto-deployed to QA
# 10:10 AM - QA team starts testing
# 3:00 PM - QA testing complete, all tests pass
```

### **Day 3 - Staging Validation**
```bash
# 9:00 AM - Merge qa → staging
git checkout staging && git merge qa && git push

# 9:02 AM - Pipeline triggered, tests running
# 9:10 AM - Tests pass, waiting for approval
# 9:15 AM - Tech lead approves in GitHub Actions
# 9:18 AM - ✅ Deployed to STAGING
# 10:00 AM - Product team validates on staging
```

### **Day 4 - UAT**
```bash
# 9:00 AM - Merge staging → uat
git checkout uat && git merge staging && git push

# 9:05 AM - Product owner approves deployment
# 9:08 AM - ✅ Deployed to UAT
# 9:30 AM - Business users test feature
# 4:00 PM - UAT approved by stakeholders
```

### **Day 5 - Production Release**
```bash
# 2:00 PM - Scheduled release window
git checkout main && git merge uat
git tag -a v1.3.0 -m "Release v1.3.0 - Family Chat"
git push origin main --tags

# 2:02 PM - Pipeline triggered
# 2:10 PM - All tests pass
# 2:15 PM - CTO approves (1st approver)
# 2:18 PM - Tech Lead approves (2nd approver)
# 2:20 PM - ✅ Deploying to PRODUCTION
# 2:25 PM - Deployment complete
# 2:30 PM - Monitoring for 5 minutes
# 2:35 PM - 🎉 Production release successful!
# 2:36 PM - GitHub Release created automatically
```

---

## 🚨 Failure Scenarios & Handling

### **Scenario 1: Tests Fail in Pipeline**
```
QA deployment pipeline:
├─→ Tests running
├─→ Integration test fails ❌
└─→ Pipeline STOPS, deployment cancelled

Action: Fix the issue, push to qa branch, pipeline reruns
```

### **Scenario 2: Deployment Fails**
```
Production deployment:
├─→ Tests pass ✅
├─→ Approvals received ✅
├─→ Deployment starts
├─→ Lambda function fails to create ❌
└─→ Automatic rollback triggered 🔄

Result: Previous version restored, team notified
```

### **Scenario 3: Smoke Tests Fail**
```
Staging deployment:
├─→ Deployment complete ✅
├─→ Smoke tests running
├─→ Health check fails ❌
└─→ Pipeline FAILS, manual intervention required

Action: Review logs, fix issue, redeploy
```

---

## 💡 Key Benefits of This CI/CD Setup

1. **Automated Testing** - Every deployment runs tests automatically
2. **Manual Gates** - Critical environments require human approval
3. **Audit Trail** - Every deployment logged with reports
4. **Rollback Protection** - Production auto-rollsback on failure
5. **Progressive Deployment** - Features flow through environments
6. **Environment Isolation** - Each stage has separate AWS resources
7. **Secrets Management** - Secure handling via AWS Parameter Store
8. **Quality Gates** - Can't skip stages, must pass through each

---

## 📞 Quick Reference Commands

```bash
# View pipeline runs
https://github.com/happymanocha/family-todo-calendar/actions

# Manually trigger deployment (if configured)
Go to Actions → Select workflow → Run workflow

# Check deployment status
npm run info:dev
npm run info:prod

# View logs
serverless logs -f login --stage prod --tail

# Manual rollback
serverless rollback --stage prod --timestamp <timestamp>
```

---

**Summary:** The CI/CD pipeline provides a fully automated, safe, and auditable path from development to production, with appropriate testing and approval gates at each stage. Features flow through environments naturally, with increasing levels of validation and protection as they approach production.
