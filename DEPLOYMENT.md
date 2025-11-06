# 🚀 Deployment Guide - MuralBot G-Code Generator

> ## ⚠️ CRITICAL: Local Web Server Required!
>
> **This application CANNOT be run by simply double-clicking `index.html`!**
>
> The application uses ES6 modules, which browsers block when opening files directly from your computer (`file://` protocol) for security reasons. You **MUST** use a local web server.
>
> **Quick Solution:**
> - **Windows users**: Just double-click [`start-server.bat`](start-server.bat:1) in the project folder
> - **Or**: See [QUICK-START.md](QUICK-START.md:1) for a simple step-by-step guide
>
> If you try to open `index.html` directly, you'll see errors like:
> - `Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html"`
> - `Access to script at 'file://...' from origin 'null' has been blocked by CORS policy`
>
> **Why?** Modern JavaScript ES6 modules require proper HTTP headers that only a web server can provide. Opening files directly doesn't provide these headers.

---

This guide provides step-by-step instructions for running the MuralBot G-Code Generator on your local Windows PC and deploying it to GitHub Pages.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Method 1: Running Locally on Windows](#method-1-running-locally-on-windows)
- [Method 2: Deploying to GitHub Pages](#method-2-deploying-to-github-pages)
- [Alternative Hosting Options](#alternative-hosting-options)
- [Troubleshooting](#troubleshooting)
- [Common Issues & Solutions](#common-issues--solutions)

---

## ✅ Prerequisites

Before you begin, ensure you have:

### For Local Development:
- **Windows 10 or 11** (or any modern OS)
- **A modern web browser** (Chrome, Edge, Firefox, or Safari)
  - Recommended: Google Chrome or Microsoft Edge
- **No additional software required!** The app runs entirely in your browser

### For GitHub Pages Deployment:
- **A GitHub account** ([Sign up free](https://github.com/join))
- **Git installed on your computer** ([Download Git](https://git-scm.com/downloads))
- **Basic familiarity with Git** (optional - we'll walk you through it)

---

## 🖥️ Method 1: Running Locally on Windows

This is the **simplest method** - perfect for testing or personal use.

### Option A: Using the Start Script (Easiest) ⭐ RECOMMENDED

1. **Download the Project**
   - Download the entire project folder to your computer
   - Extract the ZIP file if you downloaded it as a ZIP
   - Recommended location: `C:\Users\YourName\Desktop\muralbot-gcode-generator`

2. **Start the Server**
   - Navigate to the project folder
   - **Double-click** on [`start-server.bat`](start-server.bat:1)
   - A command window will open and your browser will automatically open the app
   - **Keep the command window open** while using the app!

3. **Start Using**
   - Upload an image
   - Configure settings
   - Generate G-code
   - Download the result!

   ✅ **That's it!** The app is now running properly with a local server.

4. **When Done**
   - Press `Ctrl+C` in the command window to stop the server
   - Close the window

**Note**: If you don't have Python installed, see [QUICK-START.md](QUICK-START.md:1) for installation instructions.

### Option B: Using a Local Web Server Manually

If the batch script doesn't work for you, you can start the server manually:

#### Using Python (Built into Windows 10/11)

1. **Open Command Prompt or PowerShell**
   - Press `Win + R`
   - Type `cmd` and press Enter

2. **Navigate to Project Folder**
   ```cmd
   cd C:\Users\YourName\Desktop\muralbot-gcode-generator
   ```

3. **Start Python Server**
   ```cmd
   python -m http.server 8000
   ```
   
   Or if you have Python 2:
   ```cmd
   python -m SimpleHTTPServer 8000
   ```

4. **Open in Browser**
   - Open your web browser
   - Go to: `http://localhost:8000`

5. **Stop Server When Done**
   - Press `Ctrl + C` in the Command Prompt window

#### Using Node.js (If You Have It Installed)

1. **Install http-server globally** (one-time setup):
   ```cmd
   npm install -g http-server
   ```

2. **Navigate to project folder**:
   ```cmd
   cd C:\Users\YourName\Desktop\muralbot-gcode-generator
   ```

3. **Start server**:
   ```cmd
   http-server -p 8000
   ```

4. **Open browser** to `http://localhost:8000`

#### Using VS Code Live Server Extension

1. **Install VS Code** ([Download](https://code.visualstudio.com/))
2. **Install Live Server Extension**:
   - Open VS Code
   - Click Extensions icon (or press `Ctrl + Shift + X`)
   - Search for "Live Server"
   - Click Install on "Live Server" by Ritwick Dey

3. **Open Project**:
   - File → Open Folder
   - Select the muralbot-gcode-generator folder

4. **Start Server**:
   - Right-click on `index.html`
   - Select "Open with Live Server"
   - Browser opens automatically at `http://127.0.0.1:5500`

---

## 🌐 Method 2: Deploying to GitHub Pages

Deploy your application online for **free** with GitHub Pages! Anyone can access it via a URL.

### Step 1: Create a GitHub Repository

1. **Go to GitHub**
   - Visit [github.com](https://github.com)
   - Log in to your account (or create one)

2. **Create New Repository**
   - Click the **+** icon (top right)
   - Select **"New repository"**
   - Fill in the details:
     - **Repository name**: `muralbot-gcode-generator` (or any name you prefer)
     - **Description**: "Web-based G-code generator for cable-driven painting robots"
     - **Visibility**: Choose **Public** (required for free GitHub Pages)
     - **Do NOT** check "Initialize with README" (we already have files)
   - Click **"Create repository"**

### Step 2: Prepare Your Local Project

1. **Open Command Prompt or PowerShell**
   - Press `Win + R`
   - Type `cmd` and press Enter

2. **Navigate to Project Folder**
   ```cmd
   cd C:\Users\YourName\Desktop\muralbot-gcode-generator
   ```

3. **Initialize Git Repository**
   ```cmd
   git init
   ```

4. **Add All Files**
   ```cmd
   git add .
   ```

5. **Create First Commit**
   ```cmd
   git commit -m "Initial commit - MuralBot G-Code Generator"
   ```

### Step 3: Connect to GitHub

1. **Add Remote Repository**
   
   Replace `YOUR_USERNAME` with your actual GitHub username:
   ```cmd
   git remote add origin https://github.com/YOUR_USERNAME/muralbot-gcode-generator.git
   ```

2. **Set Default Branch Name**
   ```cmd
   git branch -M main
   ```

3. **Push to GitHub**
   ```cmd
   git push -u origin main
   ```
   
   - You'll be prompted to log in to GitHub
   - Enter your GitHub username and password (or personal access token)

### Step 4: Enable GitHub Pages

1. **Go to Your Repository**
   - Visit: `https://github.com/YOUR_USERNAME/muralbot-gcode-generator`

2. **Open Settings**
   - Click the **"Settings"** tab (near top right)

3. **Navigate to Pages Section**
   - Scroll down in the left sidebar
   - Click **"Pages"** under "Code and automation"

4. **Configure GitHub Pages**
   - **Source**: Select **"Deploy from a branch"**
   - **Branch**: Select **"main"** from dropdown
   - **Folder**: Select **"/ (root)"**
   - Click **"Save"**

5. **Wait for Deployment** (1-2 minutes)
   - Refresh the page after a minute
   - You'll see a green success message with your site URL:
   - **Your site is live at**: `https://YOUR_USERNAME.github.io/muralbot-gcode-generator/`

### Step 5: Access Your Live Application

1. **Open the URL**
   - Visit: `https://YOUR_USERNAME.github.io/muralbot-gcode-generator/`
   - Your app is now live and accessible to anyone!

2. **Share the Link**
   - Share this URL with anyone who needs to use the app
   - No installation required for users - they just open the link

### Updating Your Deployed Application

When you make changes to your local files:

1. **Stage Changes**
   ```cmd
   git add .
   ```

2. **Commit Changes**
   ```cmd
   git commit -m "Description of your changes"
   ```

3. **Push to GitHub**
   ```cmd
   git push
   ```

4. **Wait for Redeployment** (30-60 seconds)
   - GitHub Pages automatically rebuilds
   - Refresh your browser to see changes

---

## 🔄 Alternative Hosting Options

If GitHub Pages doesn't meet your needs, here are other free hosting options:

### 1. Netlify (Recommended Alternative)

**Pros**: Drag-and-drop deployment, custom domains, faster deployment

1. **Create Account**: [netlify.com](https://www.netlify.com)
2. **Deploy**:
   - Click "Add new site" → "Deploy manually"
   - Drag your project folder into the browser
   - Site is live immediately!
3. **Get URL**: `https://random-name-12345.netlify.app`

### 2. Vercel

**Pros**: Fast deployment, great for developers

1. **Create Account**: [vercel.com](https://vercel.com)
2. **Install Vercel CLI**:
   ```cmd
   npm install -g vercel
   ```
3. **Deploy**:
   ```cmd
   cd C:\Users\YourName\Desktop\muralbot-gcode-generator
   vercel
   ```
4. Follow the prompts

### 3. Cloudflare Pages

**Pros**: Free, fast CDN, unlimited bandwidth

1. **Create Account**: [pages.cloudflare.com](https://pages.cloudflare.com)
2. **Connect GitHub**: Link your repository
3. **Deploy**: Automatic deployment from Git
4. **Custom Domain**: Easy to add your own domain

### 4. Local Network Sharing (For Team Use)

Share the app with others on your local network:

1. **Start Local Server** (using Python):
   ```cmd
   python -m http.server 8000
   ```

2. **Find Your IP Address**:
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.100)

3. **Share URL**:
   - Others on your network can access at:
   - `http://192.168.1.100:8000`

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Issue: "git is not recognized as an internal or external command"

**Solution**: Git is not installed or not in PATH

1. **Download Git**: [git-scm.com/downloads](https://git-scm.com/downloads)
2. **Install Git**: Run installer with default settings
3. **Restart Command Prompt**: Close and reopen cmd
4. **Verify**: Type `git --version`

#### Issue: Double-clicking index.html doesn't work

**Solution**: File associations may be incorrect

1. **Right-click** on `index.html`
2. Select **"Open with"** → **"Choose another app"**
3. Select your browser (Chrome, Edge, Firefox)
4. Check **"Always use this app"**
5. Click **OK**

#### Issue: "Permission denied" when pushing to GitHub

**Solution**: Authentication issue

1. **Generate Personal Access Token**:
   - GitHub → Settings → Developer settings → Personal access tokens
   - Generate new token (classic)
   - Select scope: `repo` (full control)
   - Copy the token (save it securely!)

2. **Use token as password**:
   - When prompted for password, paste your token
   - Or use GitHub Desktop for easier authentication

#### Issue: GitHub Pages shows 404 error

**Solution**: Deployment may need time or settings incorrect

1. **Wait 2-3 minutes** and refresh
2. **Check Settings**:
   - Repository → Settings → Pages
   - Ensure branch is set to `main` and folder to `/ (root)`
3. **Check file name**: Must be exactly `index.html` (lowercase)
4. **Clear browser cache**: Ctrl + F5

#### Issue: Application loads but images don't process

**Solution**: Browser compatibility or file path issues

1. **Try different browser**: Use Chrome or Edge
2. **Check console errors**:
   - Press F12 to open Developer Tools
   - Look for errors in Console tab
3. **Verify files**: Ensure all .js files are in correct folders
4. **Disable browser extensions**: Some extensions block features

#### Issue: "Failed to load module" errors

**Solution**: Using `file://` protocol instead of `http://`

This is the most common issue! The application **requires** a web server.

- **Don't**: Double-click `index.html` or open directly with `file://C:/...`
- **Do**: Use the [`start-server.bat`](start-server.bat:1) script (easiest)
- **Or**: Use a local web server (Python, VS Code Live Server)
- **Or**: Deploy to GitHub Pages / Netlify

**Why this happens**: ES6 modules (used throughout this app) are blocked by browsers when loading from `file://` URLs due to CORS security policies. You MUST use `http://` or `https://` protocols, which require a web server.

See [QUICK-START.md](QUICK-START.md:1) for detailed instructions on setting up a local server.

#### Issue: Slow performance or crashes

**Solution**: Image too large or browser limitations

1. **Reduce image size**: Resize to 800×600 or smaller
2. **Use fewer colors**: Reduce from 10 to 2-3 colors
3. **Close other tabs**: Free up browser memory
4. **Use Chrome/Edge**: Best performance

#### Issue: Can't find project folder

**Solution**: Search for index.html

1. **Press** `Win + S`
2. **Type**: `index.html`
3. **Look for**: Your muralbot project folder
4. **Note location**: Remember path for future reference

---

## 🎯 Quick Reference

### Local Development Commands

```cmd
# Navigate to project
cd C:\Users\YourName\Desktop\muralbot-gcode-generator

# Start Python server
python -m http.server 8000

# Open in browser
start http://localhost:8000
```

### Git Commands for Updates

```cmd
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Your message here"

# Push to GitHub
git push

# Pull latest changes
git pull
```

### Checking Your Setup

```cmd
# Check Git installation
git --version

# Check Python installation
python --version

# Check Node.js installation (if used)
node --version
```

---

## 📞 Getting Help

If you encounter issues not covered here:

1. **Check Browser Console**:
   - Press F12
   - Look at Console tab for errors
   - Search error messages online

2. **GitHub Issues**:
   - Go to repository on GitHub
   - Click "Issues" tab
   - Search existing issues or create new one

3. **Community Support**:
   - Stack Overflow: Tag `gcode` or `html5-canvas`
   - GitHub Discussions: Ask in your repository

---

## ✅ Verification Checklist

After deployment, verify everything works:

- [ ] Application loads without errors
- [ ] Can upload an image successfully
- [ ] Can adjust settings (colors, mode, canvas size)
- [ ] Can generate G-code
- [ ] Can download G-code file
- [ ] Preview/simulation displays correctly
- [ ] Job estimates appear (time, paint, distance)
- [ ] Can copy G-code to clipboard
- [ ] All tabs are functional
- [ ] No console errors (press F12 to check)

---

## 🎉 Success!

You now have the MuralBot G-Code Generator running:

- **Locally**: Access anytime by opening `index.html`
- **Online**: Share your GitHub Pages URL with others
- **Updates**: Use Git to keep everything synchronized

**Your GitHub Pages URL format**:
`https://YOUR_USERNAME.github.io/muralbot-gcode-generator/`

---

**Need help?** Open an issue on GitHub or check the main [README.md](README.md) for application usage details.

**Last Updated**: 2025-11-06