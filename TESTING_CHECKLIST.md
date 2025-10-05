# Testing Checklist for UI Changes

Use this checklist before deploying any UI changes to ensure comprehensive testing.

## 🎨 Visual Testing

### Light Mode
- [ ] All text is readable (sufficient contrast)
- [ ] All buttons and interactive elements are visible
- [ ] Icons are clearly visible
- [ ] Background colors are appropriate
- [ ] Border colors are visible
- [ ] Form inputs have clear borders and labels
- [ ] Validation error messages are visible and readable
- [ ] Success messages are visible and readable

### Dark Mode
- [ ] All text is readable in dark mode (white/light text on dark backgrounds)
- [ ] All buttons and interactive elements are visible
- [ ] Icons are clearly visible
- [ ] Background colors work with dark theme
- [ ] Border colors are visible against dark backgrounds
- [ ] Form inputs have clear borders and labels
- [ ] Validation error messages are visible and readable
- [ ] Success messages are visible and readable
- [ ] Todo cards/list items show all information clearly
- [ ] Member labels/tags are visible with proper contrast
- [ ] Status indicators are visible

### Responsive Design
- [ ] Mobile view (< 768px)
- [ ] Tablet view (768px - 1024px)
- [ ] Desktop view (> 1024px)
- [ ] All elements stack properly on smaller screens
- [ ] No horizontal scrolling on mobile

## 🔄 Functional Testing

### Forms & Validation
- [ ] All required fields show validation errors when empty
- [ ] Validation errors appear clearly and don't disappear immediately
- [ ] Validation errors are specific and helpful
- [ ] Success states show properly
- [ ] Form submission works correctly
- [ ] Error messages from API are displayed clearly
- [ ] Success messages from API are displayed clearly

### Interactive Elements
- [ ] All buttons are clickable
- [ ] Hover states work correctly
- [ ] Focus states are visible (keyboard navigation)
- [ ] Disabled states are clearly indicated
- [ ] Loading states show during async operations
- [ ] Dropdowns/selects work properly
- [ ] Modals/dialogs open and close correctly

### Data Display
- [ ] User names display (not IDs)
- [ ] Dates format correctly
- [ ] Status indicators show correct state
- [ ] Empty states display properly
- [ ] Loading states display properly
- [ ] Error states display properly

## 🔔 Notifications & Feedback

### Toast Notifications
- [ ] Success toasts appear in correct position
- [ ] Error toasts appear in correct position
- [ ] Warning toasts appear in correct position
- [ ] Info toasts appear in correct position
- [ ] Toasts are dismissible
- [ ] Toasts auto-dismiss after appropriate time
- [ ] Multiple toasts stack properly
- [ ] Animations are smooth
- [ ] Toasts are visible in both light and dark mode

### Error Handling
- [ ] Network errors display user-friendly messages
- [ ] Validation errors are clear
- [ ] API errors show helpful messages
- [ ] 404 errors handled gracefully
- [ ] 500 errors handled gracefully

## 🎯 User Experience

### Accessibility
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] ARIA labels are present
- [ ] Screen reader friendly
- [ ] Color is not the only indicator of state

### Performance
- [ ] Page loads quickly
- [ ] Animations are smooth (60fps)
- [ ] No layout shifts
- [ ] Images load properly
- [ ] Icons load properly

## 📱 Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Safari iOS
- [ ] Chrome Android
- [ ] Mobile responsive view in desktop browsers

## 🚀 Pre-Deployment Checklist

### Code Quality
- [ ] No console errors in browser
- [ ] No console warnings (or documented/expected)
- [ ] Code follows project conventions
- [ ] Comments added for complex logic

### Files to Deploy
- [ ] CSS files updated with cache-busting headers
- [ ] JavaScript files updated with cache-busting headers
- [ ] HTML files updated if needed
- [ ] All new files included in deployment

### Testing Commands
```bash
# Test locally first
npm run dev

# Check for issues in:
# - Light mode
# - Dark mode
# - Different screen sizes (use DevTools responsive mode)

# Deploy to AWS with cache-busting
aws s3 cp public/css/styles.css s3://bucket-name/css/styles.css --cache-control "no-cache, no-store, must-revalidate"
aws s3 cp public/js/script.js s3://bucket-name/js/script.js --cache-control "no-cache, no-store, must-revalidate"
```

## 🎨 Theme-Specific Checklist

For each theme (modern-blue, modern-green, etc.):
- [ ] Primary colors work in light mode
- [ ] Primary colors work in dark mode
- [ ] Accent colors are visible
- [ ] Text contrast is sufficient
- [ ] Interactive elements stand out

## 📋 Quick Testing Script

When making UI changes, test in this order:

1. **Light Mode Desktop**
   - Test all functionality
   - Check all visual elements
   - Verify forms and validation

2. **Dark Mode Desktop**
   - Toggle dark mode
   - Check all same elements as light mode
   - Pay special attention to text visibility

3. **Mobile Light Mode**
   - Resize browser to mobile view
   - Test touch interactions
   - Check responsive layout

4. **Mobile Dark Mode**
   - Toggle dark mode on mobile view
   - Verify all elements are visible

5. **Edge Cases**
   - Very long text in fields
   - Very long names/labels
   - Empty states
   - Error states
   - Loading states

## 💡 Pro Tips

1. **Always test dark mode** - Most visibility issues happen in dark mode
2. **Use browser DevTools** - Responsive mode for mobile testing
3. **Clear cache** - Hard refresh (Cmd+Shift+R or Ctrl+Shift+R) to see changes
4. **Test on real devices** - When possible, test on actual mobile devices
5. **Use contrast checkers** - Ensure WCAG compliance for accessibility

## 🐛 Common Issues to Watch For

- [ ] White text on white background
- [ ] Black text on black background
- [ ] Invisible borders in dark mode
- [ ] Validation errors that disappear too quickly
- [ ] Buttons that don't look clickable
- [ ] Labels showing IDs instead of names
- [ ] Toasts/notifications appearing off-screen
- [ ] Overlapping elements on mobile
- [ ] Form inputs without clear focus states
- [ ] Disabled buttons that look enabled

## ✅ Final Check Before Deploy

- [ ] All items above tested
- [ ] No critical bugs found
- [ ] Dark mode fully functional
- [ ] Mobile view works correctly
- [ ] All notifications visible and clear
- [ ] User data displays correctly (names, not IDs)
- [ ] AWS deployment includes all changed files
- [ ] Cache-control headers set properly

---

**Remember:** It's faster to test thoroughly before deploying than to fix issues after deployment!
