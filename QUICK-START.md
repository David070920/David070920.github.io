# Quick Start Guide - Wall Painting Robot

## ⚠️ IMPORTANT: You Cannot Just Double-Click index.html!

This application uses modern JavaScript features that **require a web server** to work properly. If you try to open `index.html` by double-clicking it, you'll see errors in the browser console and the app won't load.

**Why?** The app uses ES6 modules, which browsers block when opening files directly from your computer for security reasons.

---

## 🚀 How to Run the Application (3 Easy Steps)

### Step 1: Make Sure You Have Python Installed

Python comes pre-installed on most computers. To check:

1. Open Command Prompt (press Windows key, type "cmd", press Enter)
2. Type: `python --version`
3. Press Enter

**If you see a version number** (like "Python 3.11.0"), you're good! Skip to Step 2.

**If you see an error** ("python is not recognized..."):
- Download Python from: https://www.python.org/downloads/
- Run the installer
- **IMPORTANT:** Check the box that says "Add Python to PATH"
- Click "Install Now"
- Restart your computer after installation

### Step 2: Start the Server

**Option A: Using the Batch File (Easiest)**

1. Find the file `start-server.bat` in the project folder
2. Double-click `start-server.bat`
3. A black window will open and your browser will automatically open the app
4. **Keep that black window open!** The app won't work if you close it

**Option B: Using PowerShell**

1. Right-click on `start-server.ps1`
2. Select "Run with PowerShell"
3. The app will open in your browser
4. **Keep the PowerShell window open!**

**Option C: Manual Method**

1. Open Command Prompt in the project folder:
   - Hold Shift, right-click in the folder
   - Select "Open PowerShell window here" or "Open command window here"
2. Type: `python -m http.server 8000`
3. Press Enter
4. Open your browser and go to: http://localhost:8000

### Step 3: Use the Application

Once the server is running and your browser opens:

1. Upload an image using the "Choose Image" button
2. Adjust settings as needed
3. Click "Generate" to create the painting path
4. Download the G-code when ready

---

## 🛑 When You're Done

To stop the server:

1. Go to the black window (Command Prompt or PowerShell)
2. Press `Ctrl+C`
3. Close the window

---

## 🔧 Troubleshooting

### Problem: "Python is not recognized as an internal or external command"

**Solution:** Python is not installed or not in your PATH.
- Install Python from https://www.python.org/downloads/
- Make sure to check "Add Python to PATH" during installation
- Restart your computer

### Problem: "Address already in use" or port 8000 error

**Solution:** Port 8000 is already being used.
- Try a different port: `python -m http.server 8080`
- Then open: http://localhost:8080

### Problem: Browser opens but shows "This site can't be reached"

**Solution:** The server didn't start properly.
- Make sure the server window is still open
- Check for error messages in the server window
- Try closing and restarting the server

### Problem: "Access is denied" when running PowerShell script

**Solution:** PowerShell execution policy is blocking scripts.
- Open PowerShell as Administrator
- Run: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Type "Y" and press Enter
- Try running the script again

### Problem: Page loads but application doesn't work

**Solution:** Make sure you're accessing via http://localhost, not file://
- Check the address bar - it should start with `http://localhost:8000`
- If it starts with `file://`, you opened the file directly
- Close the browser and use the start-server script instead

### Problem: Bug fixes or updates aren't working / Old version still showing

**Solution:** Your browser is caching old JavaScript files.
- **Quick fix:** Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac) to force refresh
- **Alternative:** Clear your browser cache (see [CACHE-BUST.md](CACHE-BUST.md) for detailed instructions)
- **If still not working:** Open the application in an incognito/private window

This is a common issue after updates. The browser stores old files to load faster, but sometimes needs to be told to fetch the new versions. See [CACHE-BUST.md](CACHE-BUST.md) for more details on why this happens and multiple solutions.

---

## 💡 Tips

- **Bookmark the URL:** Once the server is running, bookmark http://localhost:8000 for easy access
- **Leave it running:** You can minimize the server window and leave it running while you work
- **No internet needed:** The server runs on your computer - you don't need an internet connection
- **Multiple tabs:** You can open multiple browser tabs to the same URL while the server runs

---

## 📝 What's Happening Behind the Scenes?

When you run the start-server script:

1. Python starts a simple web server on your computer
2. The server "serves" the application files to your browser
3. Your browser can now load the ES6 modules properly
4. Everything runs locally on your machine - nothing is sent to the internet

Think of it like this: instead of opening a file directly, you're asking Python to hand the file to your browser the "proper" way.

---

## Need More Help?

- Check the full [README.md](README.md) for detailed information
- See [DEPLOYMENT.md](DEPLOYMENT.md) for advanced deployment options
- Review [TESTING.md](TESTING.md) for testing the application