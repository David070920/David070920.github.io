# 🤖 MuralBot G-Code Generator

A sophisticated web-based application for converting digital images into G-code instructions for cable-driven wall-painting robots. Transform your artwork into precise robotic painting commands with multiple rendering modes and intelligent path optimization.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-production--ready-brightgreen.svg)

---

## ⚠️ IMPORTANT: Server Required!

**This application CANNOT be run by simply double-clicking [`index.html`](index.html:1)!**

The app uses ES6 modules which require a web server. If you try to open the file directly, you'll see errors and the app won't work.

### ✅ Quick Solution (Windows):
**Just double-click [`start-server.bat`](start-server.bat:1)** - that's it!

**Need help?** See [QUICK-START.md](QUICK-START.md:1) for a simple step-by-step guide.

---

## 🚀 Quick Start

**Want to use this right now?** You have two options:

### Option 1: Run Locally (30 seconds) ⭐ EASIEST

1. **Download this project** to your computer
2. **Double-click [`start-server.bat`](start-server.bat:1)** (Windows)
3. **Browser opens automatically** - Start creating G-code! ✨

**Requirements**: Python (usually pre-installed on Windows 10/11)
- Don't have Python? Get it from [python.org](https://www.python.org/downloads/)
- See [QUICK-START.md](QUICK-START.md:1) for detailed instructions

### Option 2: Deploy Online (5 minutes)
Host it on GitHub Pages for free - accessible from anywhere!

📖 **[Full Deployment Guide](DEPLOYMENT.md)** - Step-by-step instructions for both methods

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Overview](#overview)
- [Features](#features)
- [Running Locally](#running-locally)
- [GitHub Pages Deployment](#github-pages-deployment)
- [User Guide](#user-guide)
- [Painting Modes](#painting-modes)
- [Configuration Options](#configuration-options)
- [Technical Details](#technical-details)
- [Troubleshooting](#troubleshooting)
- [Browser Compatibility](#browser-compatibility)
- [Development](#development)

## 🎨 Overview

MuralBot G-Code Generator is a complete solution for robotic mural painting. It processes digital images and generates optimized G-code that controls a cable-driven (trilateration-based) painting robot. The application features three distinct painting modes, intelligent color separation, path optimization, and real-time simulation preview.

### Key Capabilities

- **Multiple Painting Modes**: Pointillism (dots), Strokes (lines), and Spray (edge detection)
- **Intelligent Color Processing**: Auto K-means clustering or manual color selection
- **Path Optimization**: TSP-based routing and scanline planning for minimal travel
- **Real-time Simulation**: Preview the final result before generating G-code
- **Job Estimation**: Accurate time, distance, and paint consumption calculations
- **Refill Management**: Automatic paint refill sequences when capacity is reached

## ✨ Features

### Image Processing
- **Color Separation**: Automatically extract dominant colors using K-means clustering
- **Edge Detection**: Canny edge detection for outline-based painting
- **Image Preprocessing**: Contrast, brightness, and resize adjustments
- **Format Support**: PNG, JPEG, JPG

### G-Code Generation
- **Trilateration Coordinates**: Converts Cartesian (X, Y) to cable lengths (X, Y, Z)
- **Optimized Paths**: Traveling Salesman Problem (TSP) solver for dot ordering
- **Scanline Planning**: Bidirectional scanning for efficient line painting
- **Refill Logic**: Automatic paint refill sequences based on consumption tracking

### Simulation & Preview
- **Instant Preview**: Visual representation of the painting result
- **Simulation Playback**: Animated G-code execution preview
- **Color Layers**: View individual color layers before generation

### Job Estimation
- **Time Calculation**: Accurate job duration estimates
- **Paint Consumption**: Track paint usage per layer and total
- **Travel Distance**: Total robot movement distance
- **Refill Count**: Number of required paint refills

## 🚀 Running Locally

**⚠️ Important**: This application uses ES6 modules and **requires a web server**. You cannot just double-click [`index.html`](index.html:1).

### Method 1: Using the Start Script (Easiest) ⭐ RECOMMENDED

**For Windows users:**

1. **Download the project** to your computer
2. **Double-click [`start-server.bat`](start-server.bat:1)**
3. Browser opens automatically at `http://localhost:8000` - ready to use! ✅
4. **Keep the command window open** while using the app
5. Press `Ctrl+C` in the window when done

**Alternative**: Double-click [`start-server.ps1`](start-server.ps1:1) for PowerShell version

**Don't have Python?**
- Download from [python.org](https://www.python.org/downloads/)
- Make sure to check "Add Python to PATH" during installation
- See [QUICK-START.md](QUICK-START.md:1) for detailed help

### Method 2: Using a Local Web Server Manually

#### Using Python (Windows 10/11 built-in):
```cmd
cd path\to\muralbot-gcode-generator
python -m http.server 8000
```
Then open: `http://localhost:8000`

#### Using VS Code Live Server:
1. Install [VS Code](https://code.visualstudio.com/)
2. Install "Live Server" extension
3. Right-click [`index.html`](index.html:1) → "Open with Live Server"

### Quick Start (3 Steps)

1. **Start Server**: Double-click [`start-server.bat`](start-server.bat:1) or use one of the methods above
2. **Upload Image**: Click "📁 Upload Image" and select your artwork
3. **Configure Settings**: Adjust canvas size, colors, and painting mode
4. **Generate**: Click "⚡ Generate G-Code" and download the result

📖 **[Simple Guide](QUICK-START.md)** - Non-technical step-by-step instructions
📖 **[Complete Deployment Guide](DEPLOYMENT.md)** - Detailed options and troubleshooting

---

## 🌐 GitHub Pages Deployment

Deploy your own copy online - **free and easy!**

### Quick Deployment Steps:

1. **Fork/Clone** this repository to your GitHub account
2. **Enable GitHub Pages** in repository Settings → Pages
3. **Select branch**: `main` and folder: `/ (root)`
4. **Access your site** at: `https://YOUR_USERNAME.github.io/muralbot-gcode-generator/`

That's it! Your app is now live and shareable. 🎉

### Benefits:
- ✅ No server costs
- ✅ Accessible from anywhere
- ✅ Share with others via URL
- ✅ Automatic HTTPS
- ✅ Updates deploy automatically when you push changes

📖 **[Full Deployment Guide](DEPLOYMENT.md)** - Detailed step-by-step instructions with screenshots and troubleshooting

### Alternative Hosting Options:
- **Netlify**: Drag-and-drop deployment
- **Vercel**: Fast deployment with CLI
- **Cloudflare Pages**: Free CDN with unlimited bandwidth

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for complete instructions on all deployment methods.

## 📖 User Guide

### Step-by-Step Workflow

#### 1. Configure Canvas & Robot

Navigate to the **Robot & Canvas** tab:

- **Canvas Dimensions**: Set your physical wall/canvas size in centimeters
  - Width: 50-1000 cm
  - Height: 50-1000 cm
  
- **Robot Settings**:
  - **Paint Capacity**: Amount of paint in milliliters (10-500 ml)
  - **Move Speed**: Speed for travel moves in mm/min (500-10000)
  - Set refill position (default: bottom-left outside canvas)

- **Advanced Anchor Setup** (optional):
  - Configure the three anchor points for trilateration
  - Top-Left, Top-Right, and Bottom-Center positions
  - Defaults are calibrated for standard setups

#### 2. Configure Paint & Colors

Navigate to the **Paint & Color** tab:

- **Number of Colors**: How many colors to use (1-10)
  
- **Color Selection Mode**:
  - **Auto-Pick (K-Means)**: Automatically extracts dominant colors
  - **Manual Entry**: Specify exact colors using color pickers

- **Painting Mode**: Choose your rendering style
  - **Pointillism Mode**: Paint with dots of varying sizes
  - **Strokes Mode**: Paint with horizontal/vertical line strokes
  - **Spray Mode**: Paint edges/outlines only

#### 3. Configure Nozzle (Optional)

Navigate to the **Nozzle Template** tab:

- **Nozzle Shape**: Circular or Flat
- **Nozzle Size**: Diameter/width in millimeters (0.1-5 mm)
- **Preview**: See visual representation of nozzle

#### 4. Upload Image

- Click **"📁 Upload Image"** button
- Or drag and drop image onto the original image canvas
- Supported formats: PNG, JPEG, JPG
- Recommended: High-contrast images work best

#### 5. Generate G-Code

- Click **"⚡ Generate G-Code"** button
- Watch the progress indicator
- Review the simulation preview
- Check job estimates (time, paint, distance)

#### 6. Download & Use

- Click **"💾 Download G-Code"** to save the `.gcode` file
- Or click **"📋 Copy to Clipboard"** to paste elsewhere
- Load the G-code into your robot controller
- Start painting!

## 🎨 Painting Modes

### Pointillism Mode (Dots)

Creates artwork using individual paint dots arranged to form the image.

**Best For**: Artistic effects, soft gradients, impressionist style

**Settings**:
- **Spray Dot Diameter**: Size of each dot (1-50 mm)
- Dots are automatically optimized using TSP for minimal travel

**How It Works**:
1. Image is separated into color layers
2. Each pixel becomes a potential dot position
3. TSP solver optimizes dot order to minimize travel
4. Robot moves to each position and sprays a dot

**Example Use Case**: Recreating a photograph with a painterly, impressionist look

---

### Strokes Mode (Lines)

Paints using horizontal or vertical brush strokes.

**Best For**: Efficient coverage, painterly effects, broad areas

**Settings**:
- **Line Thickness**: Width of paint strokes (1-50 mm)

**How It Works**:
1. Image is separated into color layers
2. Scanline planner identifies continuous horizontal segments
3. Bidirectional scanning reduces travel time
4. Robot paints continuous lines with minimal lifting

**Example Use Case**: Large murals requiring quick coverage

---

### Spray Mode (Edge Detection)

Traces edges and outlines using Canny edge detection.

**Best For**: Line art, outlines, sketches, technical drawings

**Settings**:
- **Line Thickness**: Width of traced lines (1-50 mm)
- **Threshold Low**: Edge detection sensitivity (0-255)
- **Threshold High**: Edge detection strength (0-255)

**How It Works**:
1. Canny edge detection identifies edges
2. Edge tracer finds continuous polylines
3. Polylines are optimized for minimal travel
4. Robot traces each contour with paint

**Example Use Case**: Converting logos, line drawings, or creating outlined murals

## ⚙️ Configuration Options

### Canvas Configuration

| Option | Range | Default | Description |
|--------|-------|---------|-------------|
| Width | 50-1000 cm | 200 cm | Physical canvas width |
| Height | 50-1000 cm | 150 cm | Physical canvas height |

### Robot Configuration

| Option | Range | Default | Description |
|--------|-------|---------|-------------|
| Paint Capacity | 10-500 ml | 50 ml | Paint container capacity |
| Move Speed | 500-10000 mm/min | 3000 mm/min | Travel speed (no paint) |
| Paint Speed | 100-5000 mm/min | 1500 mm/min | Painting speed (with paint) |
| Refill Position | Any (X, Y) | (-10, 75) cm | Where robot goes to refill |

### Paint Configuration

| Option | Range | Default | Description |
|--------|-------|---------|-------------|
| Number of Colors | 1-10 | 3 | How many colors to use |
| Color Mode | Auto/Manual | Auto | Color selection method |

**Pointillism Settings**:
- Dot Diameter: 1-50 mm (default: 5 mm)

**Strokes Settings**:
- Line Thickness: 1-50 mm (default: 3 mm)

**Spray Settings**:
- Line Thickness: 1-50 mm (default: 3 mm)
- Threshold Low: 0-255 (default: 50)
- Threshold High: 0-255 (default: 150)

### Nozzle Configuration

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| Shape | Circular/Flat | Circular | Nozzle spray pattern |
| Size | 0.1-5 mm | 0.5 mm | Nozzle diameter/width |

## 🔧 Technical Details

### Coordinate System

MuralBot uses a **trilateration coordinate system** with three anchor points:

```
Anchor TL (Top-Left)        Anchor TR (Top-Right)
    (0, 0) ●───────────────────● (2000, 0)
           │                   │
           │                   │
           │      CANVAS       │
           │                   │
           │         ●         │
           │    Anchor BC      │
           │   (1000, 3000)    │
```

**Coordinate Transformation**:
- Input: Cartesian (X, Y) in millimeters
- Output: Cable lengths (X, Y, Z) in millimeters
- Formula: Uses Euclidean distance from each anchor point

**Cartesian to Trilateration**:
```javascript
X = distance from Top-Left anchor
Y = distance from Top-Right anchor  
Z = distance from Bottom-Center anchor
```

### G-Code Structure

Generated G-code follows standard CNC/3D printer conventions:

```gcode
; === INITIALIZATION ===
G21        ; Set units to millimeters
G90        ; Absolute positioning mode
G28        ; Home all axes
M5         ; Nozzle off (safety)

; === COLOR LAYER 1 ===
G0 X100 Y200 Z300 F3000    ; Rapid move to position
M3                          ; Nozzle on (start paint)
G4 P0.1                     ; Dwell 100ms (spray dot)
M5                          ; Nozzle off (stop paint)

; === REFILL SEQUENCE ===
; (Automatic when paint low)
G0 X0 Y0 Z0 F3000          ; Move to refill position
G4 P30                      ; Wait 30 seconds for refill
; (Return to work)

; === END SEQUENCE ===
M5         ; Ensure nozzle off
G28        ; Return to home
M84        ; Disable motors
```

**Key G-code Commands**:
- `G0`: Rapid positioning (travel move)
- `G1`: Linear move (painting move)
- `G4`: Dwell/pause (P = seconds)
- `G21`: Millimeter units
- `G28`: Home axes
- `G90`: Absolute positioning
- `M3`: Nozzle/spindle on
- `M5`: Nozzle/spindle off
- `M6`: Tool change (color change)
- `M84`: Disable steppers

### Path Optimization Algorithms

#### 1. Traveling Salesman Problem (TSP) Solver
Used for pointillism mode to order dots efficiently.

**Algorithm**: Nearest Neighbor with optional 2-opt improvement
- **Nearest Neighbor**: O(n²) - Fast greedy construction
- **2-opt**: Iterative improvement for better paths
- **Usage**: Activated for < 500 points

#### 2. Scanline Planning
Used for strokes mode to create efficient line patterns.

**Algorithm**: Bidirectional horizontal scanning
- Identifies continuous horizontal segments
- Alternates direction (left→right, right→left)
- Minimizes nozzle on/off cycles

#### 3. Edge Tracing
Used for spray mode to follow detected edges.

**Algorithm**: Polyline extraction and optimization
- Traces connected edge pixels into polylines
- Douglas-Peucker simplification (tolerance: 2mm)
- Orders contours to minimize travel distance

### Performance Characteristics

| Operation | Complexity | Typical Time |
|-----------|-----------|--------------|
| K-Means Clustering | O(k × n × i) | 1-5 seconds |
| Color Separation | O(n) | 1-3 seconds |
| Edge Detection | O(n) | 1-2 seconds |
| TSP (Nearest Neighbor) | O(n²) | < 1 second |
| Scanline Planning | O(n) | < 1 second |
| G-code Generation | O(n) | 1-5 seconds |

Where:
- n = number of pixels
- k = number of colors
- i = iterations (typically 50)

**Optimization Tips**:
- Images > 500×500 px: Use sampling for K-means
- Large dot counts (>500): TSP uses fast nearest-neighbor
- Use lower resolution images for faster processing

## 🐛 Troubleshooting

### Common Issues

#### "No image uploaded" error
**Problem**: Trying to generate G-code without an image
**Solution**: Click "Upload Image" and select a valid PNG/JPEG file

#### "Generate G-Code" button is disabled
**Problem**: No image loaded yet
**Solution**: Upload an image first, then the button will enable

#### Generated G-code is too large
**Problem**: Too many colors or high image resolution
**Solution**: 
- Reduce number of colors (2-3 recommended)
- Use smaller/lower resolution images
- Consider spray mode for simpler output

#### Preview shows nothing
**Problem**: Image processing or color separation failed
**Solution**:
- Try a different image with more contrast
- Increase/decrease edge detection thresholds
- Ensure image is not corrupted

#### Painting takes too long (estimate)
**Problem**: Image has many pixels or complex paths
**Solution**:
- Use strokes mode instead of pointillism
- Reduce number of colors
- Increase move speed in robot settings
- Use spray mode for outline-only

#### Robot doesn't move correctly
**Problem**: Coordinate system or anchor configuration issues
**Solution**:
- Verify anchor point positions match your robot setup
- Check canvas dimensions match your physical canvas
- Ensure G-code coordinate system matches your controller

#### Paint refills too frequently
**Problem**: Paint capacity set too low or dots too large
**Solution**:
- Increase paint capacity setting
- Reduce dot diameter or line thickness
- Reduce number of colors/layers

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Invalid file type" | Wrong image format | Use PNG, JPEG, or JPG |
| "Image too large" | File size > memory limit | Resize image to < 4096×4096 |
| "No image data provided" | Missing image for generation | Upload image before generating |
| "Failed to load image" | Corrupted or invalid image | Try different image file |
| "Processing failed" | Algorithm error | Check browser console, try simpler image |

### Performance Issues

If the application is slow:

1. **Reduce Image Size**: Resize to 800×600 or smaller
2. **Fewer Colors**: Use 2-3 colors instead of 5-10
3. **Close Other Tabs**: Free up browser memory
4. **Use Chrome/Edge**: Best performance with V8 engine
5. **Disable Extensions**: Some extensions slow down canvas operations

## 🌐 Browser Compatibility

### Fully Supported ✅
- **Google Chrome** 90+ (Recommended)
- **Microsoft Edge** 90+ (Recommended)
- **Firefox** 88+
- **Safari** 14+
- **Opera** 76+

### Minimum Requirements
- ES6 (ECMAScript 2015) support
- Canvas API support
- File API support
- Modern JavaScript features (async/await, modules)

### Known Limitations
- **Internet Explorer**: Not supported (no ES6 modules)
- **Mobile Browsers**: Works but limited by screen size
- **Very Old Browsers**: May lack required APIs

### Recommended Setup
- **OS**: Windows 10/11, macOS 10.15+, or modern Linux
- **RAM**: 4GB+ (8GB+ for large images)
- **Screen**: 1920×1080 or higher for best experience
- **Browser**: Latest Chrome or Edge for best performance

## 🛠️ Development

### Project Structure

```
muralbot-gcode-generator/
├── index.html              # Main application page
├── README.md              # This documentation
├── ARCHITECTURE.md        # Technical architecture details
├── css/
│   └── styles.css         # Application styles
├── js/
│   ├── main.js           # Application entry point
│   ├── core/             # Core infrastructure
│   │   ├── eventBus.js   # Event system
│   │   ├── state.js      # State management
│   │   └── config.js     # Configuration & presets
│   ├── processing/       # Image processing
│   │   ├── imageLoader.js
│   │   ├── canvasManager.js
│   │   ├── imagePreprocessor.js
│   │   └── colorSeparator.js
│   ├── algorithms/       # Core algorithms
│   │   ├── kMeans.js
│   │   ├── edgeDetection.js
│   │   ├── tspSolver.js
│   │   ├── scanlinePlanner.js
│   │   ├── edgeTracer.js
│   │   ├── spatialIndex.js
│   │   └── colorUtils.js
│   ├── gcode/           # G-code generation
│   │   ├── gcodeGenerator.js
│   │   ├── gcodeBuilder.js
│   │   ├── coordinateTransformer.js
│   │   └── refillTracker.js
│   ├── simulation/      # Preview & simulation
│   │   ├── previewGenerator.js
│   │   ├── gcodeSimulator.js
│   │   ├── simulationRenderer.js
│   │   └── animationController.js
│   ├── estimation/      # Job estimation
│   │   ├── jobEstimator.js
│   │   ├── timeCalculator.js
│   │   ├── distanceCalculator.js
│   │   └── paintCalculator.js
│   └── ui/              # UI utilities
│       ├── fileManager.js
│       ├── gcodeExporter.js
│       └── clipboardManager.js
└── tests/               # Test suites
    ├── test-integration.html
    ├── test-core-modules.html
    ├── test-gcode-modules.html
    └── ...
```

### Running Tests

Open test files in your browser:

```bash
# Integration tests (comprehensive)
open test-integration.html

# Core module tests
open test-core-modules.html

# G-code module tests
open test-gcode-modules.html
```

### Architecture

The application follows a modular architecture with:
- **Event-Driven**: Modules communicate via event bus
- **State Management**: Centralized state with subscriptions
- **Separation of Concerns**: Clear module boundaries
- **No Dependencies**: Pure JavaScript, no external libraries

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for detailed technical documentation.

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Submit a pull request

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review the architecture documentation

## 🎯 Roadmap

Future enhancements planned:
- [ ] WebGL-accelerated preview
- [ ] Multi-robot coordination
- [ ] Custom path templates
- [ ] Advanced color mixing
- [ ] Import/export project files
- [ ] 3D surface projection
- [ ] Real-time robot monitoring

## 🙏 Acknowledgments

Built with modern web technologies:
- Canvas API for image processing
- ES6 Modules for code organization
- Web Workers consideration for performance
- Modern JavaScript (async/await, classes)

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-06  
**Status**: Production Ready ✅

Made with ❤️ for robotic art