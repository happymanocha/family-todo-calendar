# Setting Up GitHub Secrets for CI/CD

## 🔐 Why You're Seeing the Error

The GitHub Actions workflow is trying to deploy to AWS but can't find the AWS credentials. You need to add these as **GitHub Secrets**.

---

## 📋 Step-by-Step Setup (5 minutes)

### **Step 1: Get Your AWS Credentials**

You need two pieces of information from AWS:
1. **AWS Access Key ID**
2. **AWS Secret Access Key**

#### **Option A: If You Already Have AWS CLI Configured**

```bash
# Check if AWS is configured
aws configure list

# If you see credentials, you can find them at:
cat ~/.aws/credentials
```

Look for:
```
[default]
aws_access_key_id = AKIAXXXXXXXXXXXXXXXX
aws_secret_access_key = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### **Option B: Create New AWS Credentials**

1. Go to AWS Console: https://console.aws.amazon.com
2. Click your name (top right) → **Security credentials**
3. Scroll to **Access keys**
4. Click **Create access key**
5. Choose **CLI** → Next → Create
6. **IMPORTANT:** Copy both keys now (you can't see the secret again!)

---

### **Step 2: Add Secrets to GitHub**

1. **Go to your GitHub repository:**
   ```
   https://github.com/happymanocha/family-todo-calendar
   ```

2. **Click:** Settings → Secrets and variables → Actions

3. **Click:** "New repository secret"

4. **Add these secrets one by one:**

   **Secret 1:**
   - Name: `AWS_ACCESS_KEY_ID`
   - Value: `AKIAXXXXXXXXXXXXXXXX` (your access key)
   - Click "Add secret"

   **Secret 2:**
   - Name: `AWS_SECRET_ACCESS_KEY`
   - Value: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (your secret key)
   - Click "Add secret"

   **Secret 3 (Optional for now):**
   - Name: `DEV_JWT_SECRET`
   - Value: `dev-secret-change-me-later`
   - Click "Add secret"

   **Secret 4 (Optional for now):**
   - Name: `QA_JWT_SECRET`
   - Value: `qa-secret-change-me-later`
   - Click "Add secret"

---

### **Step 3: Verify Secrets Are Added**

You should see these secrets in the list:
- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`
- ✅ `DEV_JWT_SECRET` (optional)
- ✅ `QA_JWT_SECRET` (optional)

**Note:** You won't be able to see the values (for security), just the names.

---

## 🚀 Testing the Setup

### **Option 1: Trigger Deployment Manually**

1. Go to: https://github.com/happymanocha/family-todo-calendar/actions
2. Click on "Deploy to Development" workflow
3. Click "Run workflow" → Run workflow
4. Watch it run - should succeed now!

### **Option 2: Push a Small Change**

```bash
# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "test: trigger CI/CD"
git push origin develop
```

Then watch: https://github.com/happymanocha/family-todo-calendar/actions

---

## ⚠️ Important Security Notes

### **DO NOT:**
- ❌ Never commit AWS credentials to your code
- ❌ Never share your secret access key
- ❌ Never paste credentials in chat or issues

### **DO:**
- ✅ Use GitHub Secrets (encrypted)
- ✅ Rotate keys periodically
- ✅ Use IAM user with minimal permissions
- ✅ Enable MFA on your AWS account

---

## 🔧 Recommended: Create Dedicated AWS User for CI/CD

For better security, create a separate AWS user just for deployments:

### **Steps:**

1. **Go to AWS IAM Console:**
   https://console.aws.amazon.com/iam/

2. **Create new user:**
   - Users → Add users
   - Username: `github-actions-deploy`
   - Access type: Programmatic access ✅
   - Next

3. **Set permissions:**
   - Attach policies directly
   - Select:
     - `AWSLambdaFullAccess`
     - `AmazonDynamoDBFullAccess`
     - `AmazonS3FullAccess`
     - `CloudFormationFullAccess`
     - `IAMFullAccess` (for creating roles)
     - `AmazonAPIGatewayAdministrator`
   - Next → Create user

4. **Save credentials:**
   - Copy Access key ID
   - Copy Secret access key
   - **Download CSV** (backup)

5. **Update GitHub Secrets:**
   - Use these new credentials instead

---

## 📊 What Happens After Setup

Once secrets are added:

1. **Push to `develop` branch:**
   ```bash
   git push origin develop
   ```

2. **GitHub Actions automatically:**
   - ✅ Runs tests
   - ✅ Deploys to AWS (dev environment)
   - ✅ Creates DynamoDB tables
   - ✅ Deploys Lambda functions
   - ✅ Creates API Gateway
   - ✅ Uploads website to S3

3. **You get:**
   - Website URL: `http://nest-family-organizer-website-dev.s3-website-us-east-1.amazonaws.com`
   - API URL: `https://xxxxx.execute-api.us-east-1.amazonaws.com/dev`

---

## 🔍 Checking Deployment Status

### **In GitHub:**
```
https://github.com/happymanocha/family-todo-calendar/actions
```

### **In AWS Console:**
- **Lambda Functions:** https://console.aws.amazon.com/lambda
- **DynamoDB Tables:** https://console.aws.amazon.com/dynamodb
- **S3 Buckets:** https://console.aws.amazon.com/s3
- **CloudFormation Stacks:** https://console.aws.amazon.com/cloudformation

---

## 🚨 Troubleshooting

### **Error: "Credentials could not be loaded"**
- ✅ Check secrets are named exactly: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- ✅ No extra spaces in secret names
- ✅ Values are correct (no quotes or extra characters)

### **Error: "Access Denied"**
- ✅ IAM user has correct permissions
- ✅ Region is correct (us-east-1)

### **Error: "ResourceAlreadyExists"**
- ✅ Some resources already exist from manual deployment
- ✅ Either delete old stack or use different stage name

---

## 🎯 Quick Summary

**To fix the CI/CD error:**

1. Get AWS credentials (Access Key ID + Secret Access Key)
2. Go to GitHub → Settings → Secrets → Actions
3. Add `AWS_ACCESS_KEY_ID` secret
4. Add `AWS_SECRET_ACCESS_KEY` secret
5. Push code or manually trigger workflow
6. Watch it deploy successfully! 🎉

---

## 📞 Need Help?

If you get stuck:
1. Check the Actions logs: https://github.com/happymanocha/family-todo-calendar/actions
2. Look for the specific error message
3. Share the error with me and I'll help troubleshoot

---

**After adding the secrets, your CI/CD pipeline will work automatically!** 🚀
