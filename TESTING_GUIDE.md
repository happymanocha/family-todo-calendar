# Nest Family Organizer - Testing Guide

## 🎯 Quick Start

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run with coverage
npm run test:coverage

# Watch mode (for development)
npm run test:watch
```

---

## ✅ What's Been Implemented

### Testing Infrastructure (100% Complete)
- ✅ Jest configured with coverage thresholds (85% target)
- ✅ Playwright configured for E2E tests
- ✅ Artillery configured for load testing
- ✅ ESLint + Prettier + Husky Git hooks
- ✅ 25+ npm test scripts
- ✅ Test directory structure created
- ✅ GitHub Actions workflow updated

### Configuration Files Created
- ✅ `jest.config.js` - Jest configuration with coverage thresholds
- ✅ `.eslintrc.js` - ESLint with Airbnb base rules
- ✅ `.prettierrc.js` - Code formatting rules
- ✅ `playwright.config.js` - E2E test configuration
- ✅ `.husky/pre-commit` - Lint-staged hook
- ✅ `.husky/pre-push` - Unit test hook
- ✅ `.lintstagedrc.js` - Lint-staged configuration

### Test Infrastructure
- ✅ `tests/setup.js` - Global test setup
- ✅ `tests/fixtures/users.js` - User test data
- ✅ `src/models/__tests__/User.test.example.js` - Complete test example (50+ tests)
- ✅ `.github/workflows/test-suite.yml` - PR/Push test workflow
- ✅ `.github/workflows/deploy-dev.yml` - Updated with full test suite

---

## 📁 Test Directory Structure

```
nest-family-organizer/
├── tests/
│   ├── setup.js                    ✅ Global test configuration
│   ├── fixtures/
│   │   ├── users.js                ✅ User test data
│   │   ├── todos.js                ⏳ Todo test data
│   │   └── families.js             ⏳ Family test data
│   ├── helpers/
│   │   ├── dynamoMock.js           ⏳ DynamoDB mock service
│   │   └── testUtils.js            ⏳ Test utility functions
│   ├── e2e/                        ⏳ Playwright E2E tests
│   ├── smoke/                      ⏳ Smoke test scripts
│   ├── health/                     ⏳ Health check scripts
│   └── performance/                ⏳ Artillery load tests
│
├── src/
│   ├── models/__tests__/
│   │   ├── User.test.example.js    ✅ Example test file (50+ tests)
│   │   ├── User.test.js            ⏳ TO DO: Rename from example
│   │   ├── Todo.test.js            ⏳ TO DO
│   │   └── Family.test.js          ⏳ TO DO
│   │
│   ├── services/__tests__/
│   │   ├── AuthService.test.js     ⏳ TO DO
│   │   └── TodoService.test.js     ⏳ TO DO
│   │
│   ├── middleware/__tests__/
│   │   ├── auth.test.js            ⏳ TO DO
│   │   └── validation.test.js      ⏳ TO DO
│   │
│   ├── controllers/__tests__/
│   │   ├── AuthController.integration.test.js   ⏳ TO DO
│   │   └── TodoController.integration.test.js   ⏳ TO DO
│   │
│   └── lambda/__tests__/
│       ├── auth.lambda.test.js     ⏳ TO DO
│       ├── todos.lambda.test.js    ⏳ TO DO
│       └── families.lambda.test.js ⏳ TO DO
```

---

## 🧪 Test Commands Reference

### Unit & Integration Tests
```bash
npm test                    # Run all Jest tests
npm run test:unit          # Unit tests only (models, services)
npm run test:integration   # Integration tests (controllers, lambda)
npm run test:coverage      # Generate coverage report
npm run test:watch         # Watch mode for development
npm run test:all           # Lint + Unit + Integration

# Run specific test file
npm test -- User.test.js

# Run tests matching pattern
npm test -- --testNamePattern="password hashing"

# Run tests in specific directory
npm test -- src/models/__tests__
```

### E2E Tests
```bash
npm run test:e2e           # All Playwright tests
npm run test:e2e:critical  # Critical path tests (@critical tag)
npm run test:e2e:full      # Full suite, parallelized (4 workers)
```

### Contract Tests
```bash
npm run test:contract      # API contract validation
```

### Smoke Tests
```bash
npm run test:smoke         # Post-deployment smoke tests
npm run test:smoke:critical # Critical endpoints only
npm run test:smoke:full    # Full smoke test suite
```

### Performance Tests
```bash
npm run test:perf          # Performance benchmarks
npm run test:load          # Artillery load tests
npm run test:load:preview  # Dry run (no actual load)
npm run test:load:report   # Generate performance report
```

### Code Quality
```bash
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix linting issues
npm run format             # Format code with Prettier
npm run format:check       # Check formatting without changes
npm run security:scan      # npm audit for vulnerabilities
```

---

## 📊 Coverage Targets

| Layer | Target Coverage | Priority |
|-------|----------------|----------|
| Models | 95% | HIGH |
| Services | 90% | HIGH |
| Middleware | 90% | HIGH |
| Controllers | 85% | MEDIUM |
| Lambda Handlers | 80% | MEDIUM |
| Utils | 95% | LOW |

**Overall Target**: 85% lines, 80% branches, 85% functions

---

## 🚀 Git Hooks (Automatic)

### Pre-Commit Hook
Runs automatically on `git commit`:
- ESLint checks and auto-fixes
- Prettier formatting
- Staged files only

### Pre-Push Hook
Runs automatically on `git push`:
- Full unit test suite
- Blocks push if tests fail

To skip hooks (not recommended):
```bash
git commit --no-verify
git push --no-verify
```

---

## 🔄 CI/CD Test Execution

### On Pull Requests
Runs `.github/workflows/test-suite.yml`:
1. Lint code
2. Run unit tests
3. Run integration tests
4. Generate coverage report
5. Security scan
6. Comment coverage on PR

### On Push to develop
Runs `.github/workflows/deploy-dev.yml`:
1. Lint + Unit + Integration tests
2. Security scan
3. Coverage check (70% minimum)
4. Deploy to dev environment
5. Post-deployment smoke tests

### On Push to qa
1. Full test suite
2. API contract tests
3. Deploy to QA
4. E2E tests against QA environment

### On Push to staging
1. Full test suite + regression
2. Performance tests
3. Manual approval required
4. Deploy to staging
5. Load tests

### On Push to main (production)
1. Full test suite + regression
2. Security scan (strict)
3. Multiple manual approvals
4. Canary deployment (10%)
5. Progressive rollout (50% → 100%)
6. Post-deployment validation

---

## 📝 Writing New Tests

### Example: Unit Test
```javascript
// src/models/__tests__/MyModel.test.js
const MyModel = require('../MyModel');

describe('MyModel', () => {
  describe('validate()', () => {
    it('should validate correct data', () => {
      const result = MyModel.validate({ name: 'Test' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid data', () => {
      const result = MyModel.validate({ name: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });
});
```

### Example: Integration Test
```javascript
// src/controllers/__tests__/MyController.integration.test.js
const request = require('supertest');
const app = require('../../../app');

describe('MyController Integration', () => {
  it('should return 200 for valid request', async () => {
    const response = await request(app)
      .get('/api/my-endpoint')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Example: E2E Test
```javascript
// tests/e2e/my-feature.spec.js
const { test, expect } = require('@playwright/test');

test('complete user flow', async ({ page }) => {
  await page.goto('/login.html');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard.html');
});
```

---

## 🐛 Debugging Tests

### Run Single Test
```bash
npm test -- --testNamePattern="specific test name"
```

### Run with Verbose Output
```bash
npm test -- --verbose
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal"
}
```

### View Coverage Report
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## 📚 Next Steps

### Phase 1: Authentication Tests (Week 1) - PRIORITY
1. Rename `src/models/__tests__/User.test.example.js` to `User.test.js`
2. Create `src/services/__tests__/AuthService.test.js`
3. Create `src/middleware/__tests__/auth.test.js`
4. Create test helpers in `tests/helpers/dynamoMock.js`
5. Run: `npm run test:unit` and verify all pass
6. Check coverage: `npm run test:coverage`

### Phase 2: Core Logic Tests (Week 2)
1. Create `src/models/__tests__/Todo.test.js`
2. Create `src/models/__tests__/Family.test.js`
3. Create `src/services/__tests__/TodoService.test.js`
4. Create `src/middleware/__tests__/validation.test.js`

### Phase 3: Integration Tests (Week 3)
1. Create controller integration tests
2. Create Lambda handler tests
3. Achieve 80%+ overall coverage

### Phase 4: E2E & Performance (Week 4)
1. Create Playwright E2E tests for critical paths
2. Create Artillery load test scenarios
3. Create smoke test scripts
4. Update all GitHub Actions workflows

---

## ❓ FAQ

### Q: Why are tests failing locally but passing in CI?
A: Check that environment variables are set correctly in `tests/setup.js`

### Q: How do I mock DynamoDB in tests?
A: See `tests/helpers/dynamoMock.js` (to be created) or use `aws-sdk-mock` package

### Q: Can I skip slow tests during development?
A: Yes, use `test.skip()` or run specific files: `npm test -- Fast.test.js`

### Q: How do I test Lambda handlers?
A: Mock API Gateway events. See `src/lambda/__tests__/` examples

### Q: What's the difference between unit and integration tests?
A: Unit tests mock all dependencies. Integration tests use real Express app with mocked DB

---

## 📞 Support

- See TEST_IMPLEMENTATION_STATUS.md for detailed status
- See example test file: `src/models/__tests__/User.test.example.js`
- Run `npm test -- --help` for Jest CLI options
- Run `npx playwright --help` for Playwright options

---

**Generated with [Claude Code](https://claude.com/claude-code)**
