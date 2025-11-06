# Debugging Guide for MuralBot G-Code Generator

This guide provides comprehensive instructions for debugging and troubleshooting the MuralBot application, particularly cache-related issues.

## Table of Contents
- [Cache Issues](#cache-issues)
- [Complete Cache Clearing](#complete-cache-clearing)
- [Verification Steps](#verification-steps)
- [Common Issues](#common-issues)
- [Advanced Debugging](#advanced-debugging)

## Cache Issues

Browser caching can prevent updated JavaScript files from loading, causing old code to run even after updates. This is the most common cause of persistent bugs.

### Why Cache Issues Occur
- Browsers cache JavaScript modules aggressively
- Service workers may cache files
- HTTP cache headers may prevent updates
- Module imports can be cached separately from HTML

## Complete Cache Clearing

### Method 1: Hard Refresh (Recommended)

**Windows/Linux:**
- Chrome/Edge: `Ctrl + Shift + R` or `Ctrl + F5`
- Firefox: `Ctrl + Shift + R` or `Ctrl + F5`

**macOS:**
- Chrome/Edge: `Cmd + Shift + R`
- Firefox: `Cmd + Shift + R`
- Safari: `Cmd + Option + R`

### Method 2: Developer Tools Cache Clear (Most Thorough)

1. **Open Developer Tools:**
   - `F12` or `Ctrl + Shift + I` (Windows/Linux)
   - `Cmd + Option + I` (macOS)

2. **Enable Disable Cache:**
   - Go to **Network** tab
   - Check ☑️ **Disable cache** checkbox
   - Keep DevTools open while testing

3. **Clear Storage:**
   - Go to **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
   - Click **Clear storage** or **Clear Site Data**
   - Click **Clear site data** button

4. **Hard Reload:**
   - Right-click the refresh button (with DevTools open)
   - Select **Empty Cache and Hard Reload**

### Method 3: Manual Browser Cache Clear

**Chrome/Edge:**
1. Press `Ctrl + Shift + Delete` (Windows/Linux) or `Cmd + Shift + Delete` (macOS)
2. Select **Time range: All time**
3. Check:
   - ☑️ Browsing history
   - ☑️ Cookies and other site data
   - ☑️ Cached images and files
4. Click **Clear data**

**Firefox:**
1. Press `Ctrl + Shift + Delete` (Windows/Linux) or `Cmd + Shift + Delete` (macOS)
2. Select **Time range: Everything**
3. Check:
   - ☑️ Browsing & Download History
   - ☑️ Cookies
   - ☑️ Cache
4. Click **Clear Now**

**Safari:**
1. Safari menu → **Preferences** → **Privacy**
2. Click **Manage Website Data**
3. Click **Remove All**
4. Develop menu → **Empty Caches** (if Develop menu enabled)

### Method 4: Incognito/Private Mode

Test in a fresh browser session:
- Chrome/Edge: `Ctrl + Shift + N` (Windows/Linux) or `Cmd + Shift + N` (macOS)
- Firefox: `Ctrl + Shift + P` (Windows/Linux) or `Cmd + Shift + P` (macOS)
- Safari: `Cmd + Shift + N`

## Verification Steps

After clearing cache, verify the updates loaded correctly:

### 1. Check Console for Version Info
Open DevTools Console and look for:
```
🤖 MuralBot G-Code Generator - Initializing...
```

### 2. Verify Script Version
1. Open **Network** tab in DevTools
2. Reload the page
3. Find `main.js` in the network requests
4. Check the query parameter: `main.js?v=4` (or current version)

### 3. Check Module Timestamps
In the Console, check when modules were loaded:
```javascript
// Run in console to see module timestamps
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('.js'))
  .forEach(r => console.log(r.name, new Date(r.startTime)))
```

### 4. Verify Debug Output
After uploading an image and clicking Generate G-Code, you should see:
```
🔍 DEBUG: Inspecting uploadedImage object:
  - Type: object
  - Constructor: HTMLImageElement
  - Is HTMLImageElement: true
  - Is complete (loaded): true
  - Width: [number]
  - Height: [number]
```

## Common Issues

### Issue 1: Old JavaScript Still Running

**Symptoms:**
- Error messages mention functions that don't exist in current code
- Console shows old debug messages
- Features don't work as expected

**Solution:**
1. Close ALL browser windows/tabs
2. Reopen browser
3. Visit the application URL
4. Hard refresh: `Ctrl + Shift + R`

### Issue 2: Module Import Failures

**Symptoms:**
- Console errors like "Failed to fetch module"
- Blank page
- "Cannot find module" errors

**Solution:**
1. Clear cache completely (Method 2 above)
2. Check Network tab for 404 errors
3. Verify file paths in import statements
4. Check that server is running

### Issue 3: Canvas/Image Drawing Errors

**Symptoms:**
- "Failed to execute 'drawImage'" errors
- Blank canvases
- Image not displaying

**Solution:**
1. Check the debug output in console (see Verification Step 4)
2. Verify image is an HTMLImageElement
3. Check that image.complete === true
4. Ensure canvas dimensions are valid

### Issue 4: Service Worker Interference

**Symptoms:**
- Cache clears don't seem to work
- Old files still loading

**Solution:**
1. Open **Application** tab in DevTools
2. Go to **Service Workers** section
3. Click **Unregister** for any service workers
4. Clear storage and reload

## Advanced Debugging

### Enable Module Debugging

Add to your browser's DevTools Console:
```javascript
// Enable debug mode for all modules
localStorage.setItem('debug', 'true');

// Check current state
state.setDebug(true);
eventBus.setDebug(true);
```

### Check Image Loading

```javascript
// Inspect the stored image object
const img = state.get('processing.uploadedImage');
console.log('Image object:', img);
console.log('Is HTMLImageElement:', img instanceof HTMLImageElement);
console.log('Complete:', img?.complete);
console.log('Dimensions:', img?.width, 'x', img?.height);
```

### Monitor Event Bus

```javascript
// Log all events
eventBus.setDebug(true);
```

### Canvas Inspection

```javascript
// Check canvas state
const canvas = document.getElementById('original-canvas');
console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);

// Get canvas image data
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
console.log('Canvas has image:', imageData.data.some(v => v > 0));
```

### Network Request Monitoring

1. Open **Network** tab
2. Check **Preserve log**
3. Reload page
4. Look for:
   - Red/failed requests (404, 500 errors)
   - Cached requests (from disk cache)
   - Query parameters on JS files (`?v=4`)

### Source Code Verification

1. Open **Sources** tab in DevTools
2. Navigate to your JavaScript files
3. Verify the actual loaded code matches your local files
4. Check line numbers match expected changes

## Testing Checklist

Before reporting a bug, verify:

- [ ] Cleared browser cache completely
- [ ] Hard refreshed the page (`Ctrl + Shift + R`)
- [ ] Tested in incognito/private mode
- [ ] Checked console for error messages
- [ ] Verified correct version is loading (check Network tab)
- [ ] Checked that server is running (if using local server)
- [ ] Tried a different browser
- [ ] Checked debug output appears in console
- [ ] Verified all files have correct permissions

## Browser-Specific Issues

### Chrome/Edge
- Check chrome://extensions for conflicting extensions
- Try disabling extensions temporarily

### Firefox
- Check about:config for custom caching settings
- Verify privacy settings aren't too restrictive

### Safari
- Enable Developer menu: Preferences → Advanced → Show Develop menu
- Use Develop → Empty Caches regularly

## Getting Help

When reporting issues, include:

1. **Browser and version** (e.g., Chrome 120.0.6099.109)
2. **Operating system** (e.g., Windows 11, macOS 14.2)
3. **Console error messages** (screenshot or copy text)
4. **Network tab screenshot** showing the JS file versions
5. **Steps to reproduce** the issue
6. **Expected vs actual behavior**

## Quick Reference Commands

```bash
# Run local server (from project root)
python -m http.server 8080
# or
npx http-server -p 8080

# Check if server is running
# Open: http://localhost:8080

# Force reload all modules (in browser console)
location.reload(true);
```

## Prevention

To avoid cache issues in the future:

1. **Always increment version number** in `index.html` when updating JS files
2. **Keep DevTools open** with "Disable cache" checked during development
3. **Test in incognito mode** before committing changes
4. **Use hard refresh** after pulling updates
5. **Clear cache weekly** during active development

---

**Last Updated:** 2025-01-06  
**Version:** 1.0