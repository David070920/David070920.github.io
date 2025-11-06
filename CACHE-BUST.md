# Cache-Busting Guide

## Why Is This Necessary?

Web browsers cache JavaScript files to improve performance. However, when the application is updated with bug fixes or new features, your browser may continue serving the old cached version instead of loading the updated code.

This can cause issues like:
- Bug fixes not taking effect
- New features not appearing
- Errors that have already been resolved

## Quick Solution: Force Refresh

The fastest way to load the updated files is to perform a **hard refresh** in your browser:

### Keyboard Shortcuts

| Browser | Windows/Linux | Mac |
|---------|--------------|-----|
| Chrome | `Ctrl + Shift + R` or `Ctrl + F5` | `Cmd + Shift + R` |
| Firefox | `Ctrl + Shift + R` or `Ctrl + F5` | `Cmd + Shift + R` |
| Edge | `Ctrl + Shift + R` or `Ctrl + F5` | `Cmd + Shift + R` |
| Safari | N/A | `Cmd + Option + R` |

### Alternative Methods

If the hard refresh doesn't work, try these alternatives:

1. **Clear Browser Cache (Chrome/Edge)**
   - Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
   - Select "Cached images and files"
   - Choose "All time" or "Last hour"
   - Click "Clear data"

2. **Clear Browser Cache (Firefox)**
   - Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
   - Check "Cache"
   - Click "Clear Now"

3. **Open in Private/Incognito Mode**
   - `Ctrl + Shift + N` (Chrome/Edge) or `Ctrl + Shift + P` (Firefox)
   - This bypasses the cache entirely

4. **Disable Cache in DevTools (Developer Option)**
   - Press `F12` to open Developer Tools
   - Go to the Network tab
   - Check "Disable cache"
   - Keep DevTools open while using the application

## Version Parameter

The application now includes version parameters in script imports (e.g., `?v=2`). This helps force browsers to reload updated files, but you may still need to perform a hard refresh for the changes to take effect.

## Still Having Issues?

If you continue to experience problems after clearing the cache:

1. Verify you're running the latest version by checking the version parameter in [`index.html`](index.html:298)
2. Try a different browser to confirm it's a cache issue
3. Check the browser console (`F12` → Console tab) for any error messages
4. Restart your local server if running one

## For Developers

When deploying updates, increment the version number in the script tag:

```html
<script type="module" src="js/main.js?v=3"></script>
```

This ensures users automatically receive the latest version on their next visit.