# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nest Family Organizer** - A serverless family task and meeting management application with JWT authentication, DynamoDB storage, and multi-environment deployment. The app supports task workflows (pending → in-progress → completed), meeting scheduling, family collaboration, and calendar views.

## Architecture

### Dual-Mode Deployment
This application runs in **two distinct modes**:

1. **Express Server Mode** (`server.js`)
   - Traditional Node.js/Express application
   - Used for local development
   - Serves static files from `public/` directory
   - MVC architecture with routes, controllers, services
   - Database: LocalStorage (client-side) for development

2. **Serverless Mode** (AWS Lambda)
   - Production deployment using Serverless Framework
   - Lambda functions defined in `src/lambda/` directory
   - Database: DynamoDB with three tables (Todos, Users, Families)
   - API Gateway for HTTP endpoints
   - S3 for static website hosting

### Key Architectural Patterns

**MVC with Service Layer**
- `src/routes/` - Express route definitions
- `src/controllers/` - Request/response handling
- `src/services/` - Business logic layer
- `src/models/` - Data models (Todo, User, Family)
- `src/middleware/` - Auth, validation, error handling, logging

**Serverless Lambda Structure**
- `src/lambda/api.js` - Health and info endpoints
- `src/lambda/auth.js` - Authentication handlers (login, logout, refresh, validate, profile)
- `src/lambda/todos.js` - Todo CRUD operations
- `src/lambda/families.js` - Family management operations
- `src/utils/lambda-utils.js` - Lambda wrapper utilities

**Data Layer Abstraction**
- Express mode: `src/config/database.js` (localStorage wrapper)
- Lambda mode: `src/dynamo/dynamoClient.js` (DynamoDB operations with indexes)

## Common Development Commands

### Local Development
```bash
# Start development server (Express mode)
npm run dev

# Start alternative server implementation
npm run dev:new

# Start production server locally
npm start

# View available API routes (dev only)
npm run routes
# or: curl http://localhost:3000/dev/routes | jq .
```

### Serverless Deployment
```bash
# Deploy to specific environments
npm run deploy:dev       # Development environment
npm run deploy:qa        # QA environment
npm run deploy:staging   # Staging environment
npm run deploy:uat       # User Acceptance Testing
npm run deploy:prod      # Production environment

# Enhanced deployment script with validation
npm run deploy:enhanced  # Interactive deployment

# Get deployment information
npm run info:dev
npm run info:prod

# View Lambda function logs
npm run logs:tail -- functionName

# Remove deployment
npm run remove:dev       # CAUTION: Deletes all resources
```

### Testing & Linting
```bash
# Currently placeholders - no tests/linting configured yet
npm test              # Returns: "No tests specified"
npm run lint          # Returns: "No linting configured"

# When implementing tests, follow this structure:
npm test              # Unit tests
npm run test:integration
npm run test:e2e
npm run test:regression
npm run test:performance
npm run test:uat
```

## Multi-Environment Strategy

### Environment Promotion Path
```
feature/* → develop → qa → staging → uat → main (prod)
     ↓          ↓        ↓        ↓        ↓        ↓
   local      dev      qa    staging    uat     prod
```

### Branch-to-Environment Mapping
- `develop` → dev environment (auto-deploy on push)
- `qa` → qa environment (auto-deploy on push)
- `staging` → staging environment (manual approval required)
- `uat` → uat environment (manual approval required)
- `main` → production (manual approval + tagged releases)

### CI/CD Workflows
Located in `.github/workflows/`:
- `deploy-dev.yml` - Auto-deploys on push to develop branch
- `deploy-qa.yml` - Auto-deploys on push to qa branch
- `deploy-staging.yml` - Manual approval workflow
- `deploy-uat.yml` - Manual approval workflow
- `deploy-production.yml` - Manual approval + staged rollout

## AWS Resources

### DynamoDB Tables (per environment)
- `nest-family-organizer-todos-{stage}` - Task/meeting storage
  - Indexes: UserIdIndex, AssignedToIndex, StatusIndex
- `nest-family-organizer-users-{stage}` - User accounts
  - Indexes: UniqueIdIndex, EmailIndex, FamilyIndex
- `nest-family-organizer-families-{stage}` - Family groups
  - Indexes: FamilyCodeIndex, AdminUserIndex

### S3 Buckets (per environment)
- `nest-family-organizer-website-{stage}` - Static website hosting
- Content synced from `public/` directory

### Environment Variables Required
```bash
TODOS_TABLE=nest-family-organizer-todos-{stage}
USERS_TABLE=nest-family-organizer-users-{stage}
FAMILIES_TABLE=nest-family-organizer-families-{stage}
JWT_SECRET={secure-secret-from-aws-secrets-manager}
NODE_ENV={development|qa|staging|uat|production}
AWS_REGION=us-east-1
```

## API Documentation

**OpenAPI 3.0 Specification**: `openapi.yaml`

### Access API Documentation
```bash
# Local development
npm start
# Visit: http://localhost:3000/api-docs

# View documentation info
npm run docs
```

### Main API Endpoints

**Authentication** (`/api/auth/*`)
- `POST /api/auth/login` - User login with JWT
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/validate` - Validate token
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/family-members` - List family members
- `POST /api/auth/check-permission` - Check user permissions
- `POST /api/auth/register` - Register new user

**Todos** (`/api/todos/*`)
- `GET /api/todos` - List todos with filtering
- `POST /api/todos` - Create new todo/meeting
- `GET /api/todos/{id}` - Get specific todo
- `PUT /api/todos/{id}` - Update todo
- `DELETE /api/todos/{id}` - Delete todo
- `PATCH /api/todos/{id}/status` - Update status
- `POST /api/todos/{id}/comments` - Add comment
- `GET /api/todos/search` - Search todos
- `GET /api/todos/statistics` - Get statistics
- `GET /api/todos/upcoming` - Get upcoming items
- `PATCH /api/todos/bulk` - Bulk update

**Families** (`/api/families/*`)
- `POST /api/families` - Create family
- `GET /api/families/current` - Get current family
- `GET /api/families/{familyId}` - Get family details
- `PUT /api/families/{familyId}` - Update family
- `GET /api/families/{familyId}/members` - List members
- `POST /api/families/join` - Join family with code
- `POST /api/families/regenerate-code` - Regenerate invite code

**System**
- `GET /api/health` - Health check
- `GET /api/info` - API information

## Code Structure Notes

### Authentication Flow
1. JWT tokens generated in `src/services/AuthService.js`
2. Token validation middleware in `src/middleware/auth.js`
3. Refresh token support for long-lived sessions
4. Family-based permissions and role checking

### Todo/Meeting Workflow
- **Tasks**: Have status workflow (pending → in-progress → completed)
- **Meetings**: Simple status (active/cancelled), include time ranges and links
- Both support: due dates, assignments, comments, tags, family member assignment

### Frontend Structure (`public/`)
- Vanilla JavaScript (ES6+), no framework
- Client-side routing for SPA behavior
- LocalStorage for data persistence (dev mode)
- Pages: login, register, dashboard, onboarding

### Lambda Handler Pattern
All Lambda functions use wrapper pattern from `src/utils/lambda-utils.js`:
```javascript
const { lambdaWrapper, successResponse, errorResponse } = require('../utils/lambda-utils');

const myHandler = lambdaWrapper(async (event) => {
    // Business logic here
    return successResponse(data, message);
});
```

### DynamoDB Access Patterns
Use `DynamoService` class from `src/dynamo/dynamoClient.js`:
- Query by userId: `getTodosByUser(userId)`
- Query by assignee: `getTodosByAssignee(assignedTo)`
- Query by status: `getTodosByStatus(status)`
- Family operations: `getUsersByFamily(familyId)`
- Always use GSIs for queries (avoid scans in production)

## Development Workflow

### Adding New Features
1. Create feature branch from `develop`
2. Develop locally using Express server (`npm run dev`)
3. Test against local server at http://localhost:3000
4. Update OpenAPI spec in `openapi.yaml` for API changes
5. Add corresponding Lambda handler in `src/lambda/` for serverless
6. Ensure both Express routes and Lambda handlers are implemented
7. Push to develop → auto-deploys to dev environment
8. Promote through qa → staging → uat → main

### Adding New Lambda Endpoints
1. Add handler in appropriate `src/lambda/*.js` file
2. Add function definition in `serverless.yml` functions section
3. Include HTTP event with path, method, and CORS
4. Add corresponding Express route in `src/routes/` for local dev
5. Update `openapi.yaml` with endpoint documentation

### Working with DynamoDB
- Table definitions in `serverless.yml` resources section
- Use existing indexes when querying (defined in serverless.yml)
- Adding new index: Update AttributeDefinitions and GlobalSecondaryIndexes
- Use `DynamoService` methods instead of raw SDK calls

## Important Files

- `serverless.yml` - Main serverless configuration (Lambda, DynamoDB, S3, API Gateway)
- `app.js` - Express application setup with middleware chain
- `server.js` - HTTP server startup and initialization
- `openapi.yaml` - Complete API specification (OpenAPI 3.0)
- `DEPLOYMENT_STRATEGY.md` - Detailed multi-environment deployment guide
- `.github/workflows/` - CI/CD pipeline definitions
- `.env` - Local environment variables (not in version control)
- `.env.example` - Template for environment variables

## Security Notes

- JWT tokens managed via AWS Secrets Manager in staging/uat/prod
- CORS configured in app.js (Express) and serverless.yml (Lambda)
- Helmet security headers applied in Express mode
- Content Security Policy configured for frontend
- User passwords hashed with bcryptjs before storage
- Family invite codes for secure family joining

## Key Family Members Context

The app is designed for the Minocha family with 4 members:
- Joel
- Monika
- Happy
- Kiaan

Tasks and meetings can be assigned to specific family members with color-coding for visual identification.
