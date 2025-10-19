# Solo Developer Workflow - Nest Family Organizer

## 🎯 Your Current Setup

You now have **5 branches** on GitHub:
- `develop` - Your daily work happens here
- `qa` - For testing before staging
- `staging` - Pre-production testing
- `uat` - User acceptance testing
- `main` - Production (protected)

**You are currently on: `develop` branch** ✅

---

## 📝 Simple Daily Workflow (As Solo Developer)

### **Scenario 1: Regular Feature Development**

```bash
# 1. Make sure you're on develop branch
git checkout develop
git pull origin develop

# 2. Make your changes in Claude Code or any editor
# ... edit files ...

# 3. When ready, commit your changes
git add .
git commit -m "feat: add new feature"

# 4. Push to develop
git push origin develop
```

**What happens automatically:**
- ✅ Code pushed to GitHub
- ✅ GitHub Actions tries to deploy to DEV environment
- ⚠️ No actual deployment yet (we need to set up AWS credentials)

---

### **Scenario 2: Moving Changes Through Environments**

```bash
# After testing on develop, promote to QA
git checkout qa
git merge develop
git push origin qa

# After QA testing, promote to staging
git checkout staging
git merge qa
git push origin staging

# After staging validation, promote to UAT
git checkout uat
git merge staging
git push origin uat

# Finally, promote to production
git checkout main
git merge uat
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin main --tags

# Always return to develop for new work
git checkout develop
```

---

## 🚀 Simplified Workflow (For Solo Developer)

Since you're working alone, you can simplify this:

### **Option A: Quick Development Cycle**
```bash
# Work directly on develop branch
git checkout develop
# ... make changes in Claude Code ...
git add .
git commit -m "your changes"
git push origin develop

# When ready for production (skip qa/staging/uat)
git checkout main
git merge develop
git push origin main
```

### **Option B: Safe Production Deployment**
```bash
# Work on develop
git checkout develop
# ... make changes ...
git commit -am "your changes"
git push origin develop

# Test on dev environment (once AWS is set up)
# ... test the changes ...

# When satisfied, go straight to production
git checkout main
git merge develop
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin main --tags
```

---

## 🔧 Working with Claude Code

### **Your Typical Session:**

1. **Start Claude Code in your project:**
   ```bash
   cd /Users/hmanocha/Documents/projects/todo
   # Make sure you're on develop branch
   git checkout develop
   ```

2. **Ask Claude to make changes:**
   - "Add a new feature for family chat"
   - "Fix the login bug"
   - "Update the API documentation"

3. **Claude makes changes** - files are modified locally

4. **Review and commit changes:**
   ```bash
   git status              # See what changed
   git diff                # Review the changes
   git add .               # Stage all changes
   git commit -m "feat: description of changes"
   git push origin develop # Push to GitHub
   ```

5. **Continue working or deploy:**
   - Keep working on more features on `develop`
   - Or merge to `main` when ready for production

---

## 🎨 Branch Strategy (Simplified for Solo)

```
┌─────────────────────────────────────────────┐
│  develop  ← Your daily work happens here    │
│           ← Claude Code edits here          │
│           ← All experimental features       │
└─────────────────────────────────────────────┘
                    ↓
              (when ready)
                    ↓
┌─────────────────────────────────────────────┐
│   main    ← Production code only            │
│           ← Merge from develop when stable  │
│           ← Tag releases (v1.0.0, v1.1.0)  │
└─────────────────────────────────────────────┘
```

**You can mostly ignore:** `qa`, `staging`, `uat` branches (unless you want to test on those environments)

---

## 📦 Manual Deployment Commands

When you want to deploy manually (without CI/CD):

```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# Check deployment info
npm run info:dev
npm run info:prod

# View logs
serverless logs -f login --stage dev --tail
```

---

## 🎯 Recommended Workflow for You

### **Daily Work:**
```bash
# Every morning
git checkout develop
git pull origin develop

# Work in Claude Code all day
# ... Claude makes changes ...

# End of day
git add .
git commit -m "Summary of today's work"
git push origin develop
```

### **Weekly Production Release:**
```bash
# Friday afternoon (or whenever ready)
git checkout main
git pull origin main
git merge develop
git tag -a v1.1.0 -m "Weekly release v1.1.0"
git push origin main --tags

# Back to develop for next week
git checkout develop
```

---

## 🔒 Important Rules

1. **Never commit directly to `main`** - Always merge from `develop`
2. **Always tag production releases** - Use semantic versioning (v1.0.0)
3. **Keep develop as your default branch** - Always work here
4. **Commit frequently** - Small commits are better than big ones
5. **Write meaningful commit messages** - Future you will thank you

---

## 📋 Common Git Commands Cheat Sheet

```bash
# Check current branch
git branch

# Switch branches
git checkout develop
git checkout main

# See what changed
git status
git diff

# Commit changes
git add .
git commit -m "message"
git push

# Undo uncommitted changes
git restore <file>
git restore .

# See commit history
git log --oneline

# Create a new feature branch (optional)
git checkout -b feature/new-thing
git push origin feature/new-thing
```

---

## 🚨 Emergency Fixes

### **If you accidentally committed to main:**
```bash
# Don't panic! Move the commit to develop
git checkout main
git log --oneline -5          # Find the commit hash
git checkout develop
git cherry-pick <commit-hash> # Apply to develop
git checkout main
git reset --hard HEAD~1       # Remove from main
git push origin main --force  # Update remote (careful!)
git checkout develop
```

### **If you want to undo last commit:**
```bash
# Undo last commit but keep changes
git reset --soft HEAD~1

# Undo last commit and discard changes
git reset --hard HEAD~1
```

---

## 💡 Pro Tips for Solo Development

1. **Use Claude Code on `develop` branch**
   - All your AI-assisted coding happens here
   - Safe to experiment and try things

2. **Test locally before pushing**
   ```bash
   npm run dev          # Test locally
   # ... verify it works ...
   git push             # Then push
   ```

3. **Keep `main` stable**
   - Only merge tested code from `develop`
   - Production users rely on this branch

4. **Use meaningful commit messages**
   - ✅ Good: `feat: add family chat feature`
   - ✅ Good: `fix: resolve login timeout issue`
   - ❌ Bad: `update files`
   - ❌ Bad: `changes`

5. **Create backup tags occasionally**
   ```bash
   git tag -a backup-2024-01-05 -m "Backup before major changes"
   git push origin --tags
   ```

---

## 🎯 Your Next Steps

### **Right Now:**
✅ You're on `develop` branch
✅ All branches are created and pushed to GitHub
✅ Ready to work!

### **Today:**
- Continue making changes on `develop` branch
- Ask Claude Code to help with features
- Commit and push when ready

### **When Ready for Production:**
- Merge `develop` → `main`
- Tag the release
- Deploy to production

---

## 📞 Quick Reference

**Current Branch:** develop
**Work Here:** develop (always)
**Deploy From:** main (for production)

**Command to check where you are:**
```bash
git branch
```

**Command to see what changed:**
```bash
git status
```

**Command to commit everything:**
```bash
git add .
git commit -m "description"
git push
```

---

## 🎨 Visual Summary

```
You work here daily ─────────────────┐
                                     ↓
                              ┌──────────────┐
                              │   develop    │ ← Claude Code edits here
                              └──────────────┘
                                     │
                                     │ (merge when ready)
                                     ↓
                              ┌──────────────┐
                              │     main     │ ← Production
                              └──────────────┘
                                     │
                                     ↓
                              AWS Production Environment
                              (https://app.nest-family.com)
```

**Simple Rule:**
- 💻 Work on `develop`
- 🚀 Deploy from `main`
- 🏷️ Tag releases on `main`

---

**You're all set! Start working on the `develop` branch and ask Claude Code to help you build features.** 🎉
