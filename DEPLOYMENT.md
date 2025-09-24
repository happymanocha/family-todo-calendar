# AWS Serverless Deployment Guide

This guide will help you deploy the Minocha Family Organizer to AWS using serverless infrastructure.

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS CLI**: Install and configure AWS CLI
3. **Node.js**: Version 16 or higher
4. **Serverless Framework**: Will be installed via npm

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AWS Credentials

```bash
# Configure AWS CLI with your credentials
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set your JWT_SECRET
# Generate a secure JWT secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update your `.env` file with a secure JWT_SECRET:
```env
JWT_SECRET=your-generated-secret-here
```

### 4. Deploy to AWS

#### Deploy to Development Stage
```bash
npm run deploy:dev
```

#### Deploy to Production Stage
```bash
npm run deploy:prod
```

#### Custom Stage Deployment
```bash
serverless deploy --stage staging
```

## Post-Deployment

### 1. Get Your API URL

After deployment, you'll see output like:
```
endpoints:
  GET - https://abcd1234.execute-api.us-east-1.amazonaws.com/dev/api/health
  ...
```

### 2. Test the Deployment

```bash
# Test health endpoint
curl https://your-api-url/api/health

# Test info endpoint
curl https://your-api-url/api/info
```

### 3. Update Frontend Configuration

Update your frontend code to use the API Gateway URL instead of localhost:

```javascript
// In your frontend code, replace:
const API_BASE_URL = 'http://localhost:3000/api';

// With your API Gateway URL:
const API_BASE_URL = 'https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/dev/api';
```

### 4. Deploy Frontend to S3

The serverless.yml automatically creates an S3 bucket for static hosting. Sync your frontend files:

```bash
npm run aws:sync
```

Your website will be available at:
- S3 URL: `http://your-bucket-name.s3-website-us-east-1.amazonaws.com`
- CloudFront URL: `https://your-cloudfront-id.cloudfront.net`

## Available Scripts

- `npm run deploy` - Deploy to default stage (dev)
- `npm run deploy:dev` - Deploy to development stage
- `npm run deploy:prod` - Deploy to production stage
- `npm run remove` - Remove the entire stack
- `npm run offline` - Run serverless offline for local development
- `npm run logs` - View CloudWatch logs
- `npm run aws:sync` - Sync frontend files to S3

## Monitoring and Logs

### View Function Logs
```bash
# View logs for a specific function
npm run logs login

# View logs with tail
serverless logs -f login -t
```

### AWS Console
Monitor your application through:
- **CloudWatch**: Logs and metrics
- **DynamoDB**: Database tables and items
- **API Gateway**: API requests and responses
- **Lambda**: Function executions and errors

## Environment Variables

The deployment automatically sets these environment variables:

- `TODOS_TABLE`: DynamoDB table for todos
- `USERS_TABLE`: DynamoDB table for users
- `JWT_SECRET`: Your JWT signing secret
- `NODE_ENV`: Environment (dev/prod)
- `AWS_REGION`: AWS region

## Security Considerations

1. **JWT Secret**: Use a strong, unique JWT secret
2. **IAM Permissions**: Lambda functions have minimal required permissions
3. **CORS**: Configured for web access
4. **HTTPS**: All API endpoints use HTTPS
5. **Family Access**: Only configured family members can authenticate

## Cost Optimization

This serverless architecture is cost-effective:

- **Lambda**: Pay only for execution time
- **DynamoDB**: Pay-per-request billing
- **API Gateway**: Pay per API call
- **S3**: Pay for storage and requests
- **CloudFront**: Pay for data transfer

Estimated cost for a family of 4: **$1-5/month** depending on usage.

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   ```bash
   # Check AWS credentials
   aws sts get-caller-identity

   # Check region
   aws configure get region
   ```

2. **Function Errors**
   ```bash
   # View detailed logs
   serverless logs -f functionName -t
   ```

3. **CORS Issues**
   - Ensure your frontend uses the correct API URL
   - Check browser developer console for CORS errors

4. **Authentication Issues**
   - Verify JWT_SECRET is set correctly
   - Check if family member email is in the FAMILY_MEMBERS list

### Getting Help

1. Check CloudWatch logs in AWS Console
2. Use `serverless logs` command for function-specific logs
3. Test individual endpoints with curl or Postman

## Cleanup

To remove all AWS resources:

```bash
npm run remove
```

**Warning**: This will delete all data in DynamoDB tables. Make sure to backup any important data first.

## Architecture Overview

The deployed architecture includes:

- **API Gateway**: HTTP API endpoints
- **Lambda Functions**: Serverless compute for all API operations
- **DynamoDB**: NoSQL database for todos and users
- **S3**: Static website hosting
- **CloudFront**: CDN for fast global access
- **CloudWatch**: Logging and monitoring

This provides a scalable, reliable, and cost-effective solution for your family organizer application.