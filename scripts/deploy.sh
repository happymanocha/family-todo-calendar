#!/bin/bash

# Minocha Family Organizer - AWS Serverless Deployment Script

set -e

echo "🚀 Minocha Family Organizer - AWS Serverless Deployment"
echo "======================================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your JWT_SECRET before deployment"
    echo "   Generate a secure secret with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first"
    exit 1
fi

# Get deployment stage
STAGE=${1:-dev}
echo "📦 Deploying to stage: $STAGE"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

# Validate serverless configuration
echo "✅ Validating serverless configuration..."
npx serverless print --stage $STAGE > /dev/null

# Deploy to AWS
echo "🚀 Deploying to AWS..."
npx serverless deploy --stage $STAGE

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Test your API endpoints with the URLs shown above"
echo "2. Update your frontend to use the API Gateway URL"
echo "3. Sync your frontend files to S3: npm run aws:sync"
echo ""
echo "🔗 Useful commands:"
echo "   View logs: npm run logs <function-name>"
echo "   Remove stack: npm run remove"
echo "   Test locally: npm run offline"
echo ""
echo "🎉 Your family organizer is now running on AWS!"