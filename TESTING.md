# 🧪 Testing Guide - MuralBot G-Code Generator

This document provides comprehensive testing procedures for the MuralBot G-Code Generator application.

## Table of Contents

- [Running Tests](#running-tests)
- [Integration Tests](#integration-tests)
- [Manual Testing Scenarios](#manual-testing-scenarios)
- [Performance Testing](#performance-testing)
- [Browser Compatibility Testing](#browser-compatibility-testing)
- [Bug Reporting](#bug-reporting)

## Running Tests

### Automated Integration Tests

The application includes a comprehensive integration test suite:

1. Open `test-integration.html` in your browser
2. Click "▶️ Run All Tests" for comprehensive testing
3. Or click "⚡ Quick Test" for essential tests only

**Test Coverage:**
- ✅ Core infrastructure (state, events, config)
- ✅ Image processing (loader, preprocessor, color separation)
- ✅ Algorithms (K-means, edge detection, TSP)
- ✅ G-code generation (coordinate transform, builder, refill)
- ✅ Simulation and preview
- ✅ Job estimation
- ✅ End-to-end workflows (all three modes)

### Module-Specific Tests

Additional test files for specific modules:

- `test-core-modules.html` - Tests core infrastructure
- `test-gcode-modules.html` - Tests G-code generation
- `test-path-planning.html` - Tests path optimization
- `test-simulation.html` - Tests preview generation
- `test-estimation.html` - Tests job estimation

## Integration Tests

### Test Categories

#### 1. Core Infrastructure Tests
**Purpose:** Verify state management, event bus, and configuration

**Tests:**
- State get/set operations
- Nested state paths
- State subscriptions
- Event emission and handling
- Configuration structure validation

**Pass Criteria:** All core operations work without errors

---

#### 2. Image Processing Tests
**Purpose:** Verify image loading and processing pipeline

**Tests:**
- Image upload from file
- Drag and drop upload
- Image preprocessing (contrast, brightness)
- Color separation into layers
- Edge detection (Canny algorithm)

**Pass Criteria:** Images load correctly and process without errors

---

#### 3. Algorithm Tests
**Purpose:** Verify core algorithms work correctly

**Tests:**
- K-means color clustering (2-10 colors)
- Edge detection with various thresholds
- TSP solver for dot optimization
- Scanline planning for strokes
- Edge tracing for contours

**Pass Criteria:** Algorithms produce valid output

---

#### 4. G-Code Generation Tests
**Purpose:** Verify G-code output is valid and complete

**Tests:**
- Coordinate transformation (Cartesian to trilateration)
- G-code command generation
- Refill sequence insertion
- Color change sequences
- Complete workflow for all modes

**Pass Criteria:** Generated G-code contains required commands (G21, G28, M3, M5)

---

#### 5. End-to-End Workflows
**Purpose:** Test complete application workflows

**Pointillism Mode:**
1. Upload test image
2. Select auto K-means colors
3. Generate G-code
4. Verify dots are optimized
5. Check refill sequences

**Strokes Mode:**
1. Upload test image
2. Select strokes mode
3. Generate G-code
4. Verify scanline paths
5. Check bidirectional optimization

**Spray Mode:**
1. Upload test image
2. Select spray mode
3. Adjust edge thresholds
4. Generate G-code
5. Verify contour tracing

**Pass Criteria:** All modes complete successfully with valid G-code output

## Manual Testing Scenarios

### Scenario 1: Basic Workflow
**Objective:** Test the most common user workflow

1. Open `index.html` in browser
2. Click "Upload Image"
3. Select a simple image (e.g., logo.png)
4. Keep default settings
5. Click "Generate G-Code"
6. Wait for completion
7. Verify preview shows result
8. Check job estimates are reasonable
9. Click "Download G-Code"
10. Verify file downloads

**Expected Result:** Complete workflow with no errors

---

### Scenario 2: Configuration Changes
**Objective:** Test UI configuration changes

1. Load application
2. Change canvas dimensions (e.g., 300×200)
3. Change number of colors (e.g., 5)
4. Switch between painting modes
5. Adjust mode-specific settings
6. Upload image
7. Generate G-code
8. Verify settings are applied

**Expected Result:** All configuration changes are respected

---

### Scenario 3: Multiple Images
**Objective:** Test loading different images sequentially

1. Load first image, generate G-code
2. Load second image (different dimensions)
3. Generate new G-code
4. Verify previous results are cleared
5. Check new results are correct

**Expected Result:** Each image processed independently

---

### Scenario 4: Error Handling
**Objective:** Test application handles errors gracefully

1. Try to generate without uploading image
   - **Expected:** Error message displayed
2. Upload invalid file (e.g., .txt)
   - **Expected:** Error message about file type
3. Upload very large image (>5000×5000)
   - **Expected:** Processing completes or shows memory warning
4. Try extreme settings (1000 colors, 0.1mm canvas)
   - **Expected:** Validation or reasonable handling

**Expected Result:** Errors shown clearly without crashes

---

### Scenario 5: Edge Cases
**Objective:** Test boundary conditions

**Test Cases:**
- Minimum canvas size (50×50 cm)
- Maximum canvas size (1000×1000 cm)
- Single color (numColors = 1)
- Maximum colors (numColors = 10)
- Tiny image (10×10 px)
- Large image (2000×2000 px)
- Pure white image
- Pure black image
- Grayscale image

**Expected Result:** Application handles all cases gracefully

## Performance Testing

### Performance Benchmarks

Test with various image sizes and measure:

| Image Size | K-Means Time | Color Separation | G-code Gen | Total Time |
|-----------|--------------|------------------|------------|-----------|
| 100×100   | < 1s         | < 1s             | < 1s       | < 3s      |
| 500×500   | 1-3s         | 1-2s             | 2-4s       | 5-10s     |
| 1000×1000 | 3-8s         | 2-5s             | 5-10s      | 10-25s    |
| 2000×2000 | 10-20s       | 5-10s            | 10-20s     | 25-50s    |

**Note:** Times vary based on hardware and number of colors

### Memory Usage

Monitor browser memory during processing:

```
Recommended:
- Small images (< 500×500): < 100MB
- Medium images (500-1000): 100-500MB
- Large images (1000-2000): 500MB-2GB
```

### Performance Tips

1. **For Large Images:**
   - Reduce to 800×600 or smaller
   - Use fewer colors (2-3)
   - Use spray mode for outlines only

2. **For Faster Processing:**
   - Use Chrome or Edge (V8 engine)
   - Close other browser tabs
   - Ensure adequate RAM available

3. **Optimization Settings:**
   - Disable debug mode (production default)
   - Use sample rate for K-means on large images
   - TSP optimization only for < 500 points

## Browser Compatibility Testing

### Test Matrix

Test the application in multiple browsers:

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome  | 90+     | ✅     | Recommended, best performance |
| Edge    | 90+     | ✅     | Recommended, Chromium-based |
| Firefox | 88+     | ✅     | Good compatibility |
| Safari  | 14+     | ✅     | Works but slower |
| Opera   | 76+     | ✅     | Chromium-based, good |
| IE      | Any     | ❌     | Not supported (no ES6 modules) |

### Browser-Specific Tests

**Chrome/Edge:**
- Test all features
- Verify clipboard API works
- Check file download works
- Test drag-and-drop

**Firefox:**
- Test ES6 module loading
- Verify canvas rendering
- Check memory usage (can be higher)
- Test file operations

**Safari:**
- Test file upload dialog
- Verify canvas operations
- Check for any webkit-specific issues
- Test touch events (if on mobile)

### Mobile Browser Testing

While not optimized for mobile, basic testing on:
- Chrome Mobile
- Safari iOS
- Firefox Mobile

**Expected Limitations:**
- Small screen may be difficult to use
- Performance may be slower
- Touch interactions may need adjustment

## Bug Reporting

### Bug Report Template

When reporting bugs, include:

```markdown
**Browser:** Chrome 120.0
**OS:** Windows 11
**Image:** logo.png (500×500, PNG)
**Settings:** Pointillism, 3 colors, auto K-means
**Steps to Reproduce:**
1. Upload image
2. Click generate
3. ...

**Expected Behavior:**
G-code should generate successfully

**Actual Behavior:**
Error message: "Processing failed..."

**Console Errors:**
(Paste console output here)

**Screenshots:**
(Attach if applicable)
```

### Common Issues and Solutions

#### Issue: "No image loaded" error
**Cause:** Trying to generate before uploading
**Solution:** Upload image first

#### Issue: G-code is empty
**Cause:** Image processing failed
**Solution:** Try smaller/simpler image, check console for errors

#### Issue: Preview doesn't show
**Cause:** Canvas rendering issue
**Solution:** Check browser console, try refreshing

#### Issue: Very slow processing
**Cause:** Large image or too many colors
**Solution:** Reduce image size, use fewer colors

#### Issue: Browser freezes
**Cause:** Insufficient memory
**Solution:** Close other tabs, use smaller image

## Test Checklists

### Pre-Release Checklist

Before releasing a new version:

- [ ] Run full integration test suite
- [ ] Test in Chrome, Firefox, Edge
- [ ] Test all three painting modes
- [ ] Test with small, medium, and large images
- [ ] Test error handling scenarios
- [ ] Verify all buttons work
- [ ] Check keyboard shortcuts (Ctrl+S, Ctrl+C)
- [ ] Test drag-and-drop upload
- [ ] Verify download functionality
- [ ] Check copy to clipboard
- [ ] Test configuration changes
- [ ] Verify job estimates are reasonable
- [ ] Check simulation preview renders
- [ ] Test refill sequence generation
- [ ] Verify G-code structure is valid
- [ ] Check console for errors
- [ ] Review memory usage
- [ ] Test with different canvas sizes

### User Acceptance Testing

For end users to verify:

- [ ] Can upload images easily
- [ ] Configuration options are clear
- [ ] G-code generates successfully
- [ ] Preview shows expected result
- [ ] Estimates seem reasonable
- [ ] Download works correctly
- [ ] No confusing error messages
- [ ] Application is responsive
- [ ] UI is intuitive
- [ ] Documentation is helpful

## Continuous Testing

### Regression Testing

When adding new features:

1. Run full integration test suite
2. Test all existing workflows
3. Verify backward compatibility
4. Check for performance regressions
5. Update tests for new features

### Automated Testing Strategy

For future CI/CD integration:

```javascript
// Example test structure
describe('MuralBot Integration', () => {
  it('should load image successfully', async () => {
    const result = await imageLoader.load(testImage);
    expect(result).toBeDefined();
  });
  
  it('should generate valid G-code', async () => {
    const gcode = await gcodeGenerator.generate(config, layers);
    expect(gcode).toContain('G21');
    expect(gcode).toContain('G28');
  });
});
```

## Performance Profiling

### Using Browser DevTools

1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Perform actions (upload, generate)
5. Stop recording
6. Analyze flame chart for bottlenecks

**Look for:**
- Long tasks (> 50ms)
- Memory leaks
- Excessive reflows/repaints
- JavaScript execution time

### Memory Profiling

1. Open Memory tab in DevTools
2. Take heap snapshot before action
3. Perform action (generate G-code)
4. Take heap snapshot after
5. Compare snapshots
6. Look for memory leaks

**Red Flags:**
- Growing heap size over time
- Retained detached DOM nodes
- Large arrays not being garbage collected

## Test Data

### Sample Images for Testing

Prepare test images:

1. **Small Logo** (100×100): Simple shapes, 2-3 colors
2. **Medium Photo** (500×500): Photograph, varied colors
3. **Large Image** (1500×1500): Complex photograph
4. **Line Drawing** (800×800): Black lines on white
5. **Grayscale** (500×500): Black and white photograph
6. **High Contrast** (400×400): Bold colors, simple shapes

### Expected G-Code Outputs

For each test image, maintain expected output:
- Approximate line count
- Number of M3/M5 commands (paint on/off)
- Number of G0 vs G1 commands
- Presence of refill sequences
- Estimated job time

## Conclusion

Thorough testing ensures the MuralBot G-Code Generator:
- Works reliably across browsers
- Handles various input scenarios
- Performs efficiently
- Provides clear error messages
- Delivers accurate G-code output

Run tests regularly and before any release!

---

**Last Updated:** 2025-11-06  
**Test Suite Version:** 1.0.0