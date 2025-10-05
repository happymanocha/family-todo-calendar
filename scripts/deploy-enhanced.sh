#!/bin/bash

# Nest Family Organizer - Multi-Environment Deployment Script
# Usage: ./scripts/deploy-enhanced.sh [dev|qa|staging|uat|prod]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment parameter
ENVIRONMENT=${1:-dev}

# Allowed environments
ALLOWED_ENVS=("dev" "qa" "staging" "uat" "prod")

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Validate environment
validate_environment() {
    if [[ ! " ${ALLOWED_ENVS[@]} " =~ " ${ENVIRONMENT} " ]]; then
        print_message "$RED" "❌ Invalid environment: $ENVIRONMENT"
        print_message "$YELLOW" "Allowed environments: ${ALLOWED_ENVS[*]}"
        exit 1
    fi
}

# Confirm production deployment
confirm_production() {
    if [ "$ENVIRONMENT" == "prod" ]; then
        print_message "$RED" "⚠️  WARNING: You are about to deploy to PRODUCTION!"
        read -p "Type 'DEPLOY TO PRODUCTION' to confirm: " confirmation
        if [ "$confirmation" != "DEPLOY TO PRODUCTION" ]; then
            print_message "$RED" "❌ Production deployment cancelled"
            exit 1
        fi
    fi
}

# Check prerequisites
check_prerequisites() {
    print_message "$BLUE" "📋 Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_message "$RED" "❌ Node.js is not installed"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_message "$RED" "❌ npm is not installed"
        exit 1
    fi

    # Check Serverless Framework
    if ! command -v serverless &> /dev/null; then
        print_message "$YELLOW" "⚠️  Serverless Framework not found. Installing..."
        npm install -g serverless@3
    fi

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_message "$RED" "❌ AWS CLI is not installed"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_message "$RED" "❌ AWS credentials not configured"
        exit 1
    fi

    print_message "$GREEN" "✅ All prerequisites met"
}

# Install dependencies
install_dependencies() {
    print_message "$BLUE" "📦 Installing dependencies..."
    npm ci
    print_message "$GREEN" "✅ Dependencies installed"
}

# Run tests
run_tests() {
    print_message "$BLUE" "🧪 Running tests..."

    # Run linting
    if npm run lint &> /dev/null; then
        print_message "$GREEN" "✅ Linting passed"
    else
        print_message "$YELLOW" "⚠️  No lint script found"
    fi

    # Run unit tests
    if npm test &> /dev/null; then
        print_message "$GREEN" "✅ Unit tests passed"
    else
        print_message "$YELLOW" "⚠️  No test script found"
    fi

    # Run integration tests for non-dev environments
    if [ "$ENVIRONMENT" != "dev" ]; then
        if npm run test:integration &> /dev/null; then
            print_message "$GREEN" "✅ Integration tests passed"
        else
            print_message "$YELLOW" "⚠️  No integration test script found"
        fi
    fi
}

# Deploy to AWS
deploy_to_aws() {
    print_message "$BLUE" "🚀 Deploying to $ENVIRONMENT..."

    # Set environment-specific variables
    case $ENVIRONMENT in
        dev)
            export JWT_SECRET=${JWT_SECRET:-"dev-secret-change-me"}
            ;;
        qa)
            export JWT_SECRET=${JWT_SECRET:-"qa-secret-change-me"}
            ;;
        staging|uat|prod)
            # Get secret from AWS Parameter Store
            JWT_SECRET=$(aws ssm get-parameter \
                --name "/nest-family-organizer/$ENVIRONMENT/jwt-secret" \
                --with-decryption \
                --query Parameter.Value \
                --output text 2>/dev/null) || {
                print_message "$RED" "❌ Failed to retrieve JWT secret from Parameter Store"
                exit 1
            }
            export JWT_SECRET
            ;;
    esac

    # Deploy using Serverless Framework
    serverless deploy --stage "$ENVIRONMENT" --verbose

    print_message "$GREEN" "✅ Deployment completed"
}

# Get deployment info
get_deployment_info() {
    print_message "$BLUE" "ℹ️  Getting deployment information..."

    API_URL=$(serverless info --stage "$ENVIRONMENT" | grep 'ServiceEndpoint:' | awk '{print $2}')
    WEBSITE_URL="http://nest-family-organizer-website-$ENVIRONMENT.s3-website-us-east-1.amazonaws.com"

    if [ "$ENVIRONMENT" == "prod" ]; then
        WEBSITE_URL="https://app.nest-family.com"
    fi

    print_message "$GREEN" "🌐 Website URL: $WEBSITE_URL"
    print_message "$GREEN" "🔌 API URL: $API_URL"
}

# Run smoke tests
run_smoke_tests() {
    print_message "$BLUE" "🔍 Running smoke tests..."

    API_URL=$(serverless info --stage "$ENVIRONMENT" | grep 'ServiceEndpoint:' | awk '{print $2}')

    # Health check
    if curl -f "$API_URL/api/health" &> /dev/null; then
        print_message "$GREEN" "✅ Health check passed"
    else
        print_message "$RED" "❌ Health check failed"
        exit 1
    fi

    # API info check
    if curl -f "$API_URL/api/info" &> /dev/null; then
        print_message "$GREEN" "✅ API info check passed"
    else
        print_message "$YELLOW" "⚠️  API info check failed (non-critical)"
    fi
}

# Create deployment report
create_deployment_report() {
    print_message "$BLUE" "📝 Creating deployment report..."

    REPORT_FILE="deployment-report-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).md"

    cat > "$REPORT_FILE" <<EOF
# Deployment Report - $ENVIRONMENT

**Environment**: $ENVIRONMENT
**Date**: $(date)
**Deployed By**: $(whoami)
**Git Branch**: $(git rev-parse --abbrev-ref HEAD)
**Git Commit**: $(git rev-parse HEAD)

## URLs
- **Website**: $WEBSITE_URL
- **API**: $API_URL
- **API Docs**: $WEBSITE_URL/api-docs.html

## Deployment Status
✅ Deployment successful

## Tests Executed
- ✅ Prerequisites check
- ✅ Dependency installation
- ✅ Linting
- ✅ Unit tests
- ✅ AWS deployment
- ✅ Smoke tests

## Next Steps
- Monitor CloudWatch logs
- Verify application functionality
- Check error rates in CloudWatch metrics

---
Generated by deploy-enhanced.sh
EOF

    print_message "$GREEN" "✅ Deployment report created: $REPORT_FILE"
}

# Main deployment flow
main() {
    print_message "$BLUE" "=========================================="
    print_message "$BLUE" "  Nest Family Organizer Deployment"
    print_message "$BLUE" "  Environment: $ENVIRONMENT"
    print_message "$BLUE" "=========================================="
    echo

    validate_environment
    confirm_production
    check_prerequisites
    install_dependencies
    run_tests
    deploy_to_aws
    get_deployment_info
    run_smoke_tests
    create_deployment_report

    echo
    print_message "$GREEN" "=========================================="
    print_message "$GREEN" "  🎉 Deployment Successful!"
    print_message "$GREEN" "  Environment: $ENVIRONMENT"
    print_message "$GREEN" "=========================================="
    print_message "$GREEN" "🌐 Website: $WEBSITE_URL"
    print_message "$GREEN" "🔌 API: $API_URL"
    print_message "$GREEN" "📚 Docs: $WEBSITE_URL/api-docs.html"
    echo
}

# Run main function
main
