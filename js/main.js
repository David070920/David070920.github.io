/**
 * MuralBot G-Code Generator - Main Entry Point
 *
 * This is the application initialization script that sets up the application
 * when the DOM is loaded. It coordinates all modules and initializes the UI.
 */

// Import core modules
import eventBus, { Events } from './core/eventBus.js';
import state from './core/state.js';
import { getPresetList, applyPreset } from './core/config.js';

// Import processing modules
import imageLoader from './processing/imageLoader.js';
import canvasManager from './processing/canvasManager.js';
import imagePreprocessor from './processing/imagePreprocessor.js';
import colorSeparator from './processing/colorSeparator.js';

// Import algorithm modules
import kMeans from './algorithms/kMeans.js';
import edgeDetection from './algorithms/edgeDetection.js';
import { rgbToHex, hexToRgb } from './algorithms/colorUtils.js';

// Import G-code generation modules
import gcodeGenerator from './gcode/gcodeGenerator.js';

// Import simulation modules
import { PreviewGenerator, PreviewEvents } from './simulation/previewGenerator.js';
import { SimulationEvents } from './simulation/gcodeSimulator.js';
import { AnimationEvents } from './simulation/animationController.js';

// Import estimation modules
import { JobEstimator, EstimationEvents } from './estimation/jobEstimator.js';

// Import UI/output modules
import * as gcodeExporter from './ui/gcodeExporter.js';
import * as clipboardManager from './ui/clipboardManager.js';
import * as fileManager from './ui/fileManager.js';

// Global instances
let previewGenerator = null;
let jobEstimator = null;

// ============================================================================
// Application Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🤖 MuralBot G-Code Generator - Initializing...');
    
    // Initialize application
    initializeApp();
});

/**
 * Main application initialization function
 */
function initializeApp() {
    console.log('📋 Setting up application modules...');
    
    // Initialize core modules
    initializeCoreModules();
    
    // Initialize processing modules
    initializeProcessingModules();
    
    // Initialize UI components
    initializeUI();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Setup state synchronization
    setupStateSynchronization();
    
    // Setup presets
    setupPresets();
    
    // Initialize UI with current state
    syncUIWithState();
    
    console.log('✅ Application initialized successfully');
}

/**
 * Initialize core modules
 */
function initializeCoreModules() {
    console.log('⚙️ Initializing core modules...');
    
    // Disable debug mode for production (can be enabled via console)
    eventBus.setDebug(false);
    state.setDebug(false);
    
    // Subscribe to global events
    eventBus.on(Events.ERROR_OCCURRED, (data) => {
        console.error('❌ Error occurred:', data);
        showError(data.error || 'An error occurred');
    });
    
    eventBus.on(Events.WARNING_OCCURRED, (data) => {
        console.warn('⚠️ Warning:', data);
    });
    
    console.log('✅ Core modules initialized');
}

/**
 * Initialize processing modules
 */
function initializeProcessingModules() {
    console.log('🖼️ Initializing processing modules...');
    
    // Initialize canvas manager
    canvasManager.initialize('original-canvas', 'preview-canvas');
    
    // Disable debug mode for production
    imageLoader.setDebug(false);
    canvasManager.setDebug(false);
    imagePreprocessor.setDebug(false);
    
    // Subscribe to image upload events
    eventBus.on(Events.IMAGE_UPLOADED, handleImageLoadedEvent);
    
    // Initialize simulation preview generator
    initializeSimulation();
    
    // Initialize job estimator
    initializeEstimation();
    
    console.log('✅ Processing modules initialized');
}

/**
 * Initialize simulation preview generator
 */
function initializeSimulation() {
    console.log('🎬 Initializing simulation...');
    
    const previewCanvas = document.getElementById('preview-canvas');
    previewGenerator = new PreviewGenerator(previewCanvas);
    
    // Subscribe to simulation events
    eventBus.on(PreviewEvents.GENERATION_STARTED, (data) => {
        console.log('🎬 Preview generation started:', data.type);
    });
    
    eventBus.on(PreviewEvents.GENERATION_PROGRESS, (data) => {
        showProgress(data.progress * 100, `Rendering preview... ${Math.round(data.progress * 100)}%`);
    });
    
    eventBus.on(PreviewEvents.GENERATION_COMPLETE, (data) => {
        console.log('✅ Preview generation complete:', data.type);
    });
    
    eventBus.on(PreviewEvents.GENERATION_ERROR, (data) => {
        console.error('❌ Preview generation error:', data.error);
    });
    
    eventBus.on(SimulationEvents.PROGRESS, (data) => {
        showProgress(data.progress * 100, `Simulating... ${Math.round(data.progress * 100)}%`);
    });
    
    console.log('✅ Simulation initialized');
}

/**
 * Initialize job estimator
 */
function initializeEstimation() {
    console.log('📊 Initializing job estimator...');
    
    // Create job estimator with current configuration
    jobEstimator = new JobEstimator(state.getState());
    jobEstimator.setDebug(false);
    
    // Subscribe to estimation events
    eventBus.on(EstimationEvents.ESTIMATION_STARTED, (data) => {
        console.log('📊 Estimation started:', data.source);
    });
    
    eventBus.on(EstimationEvents.ESTIMATION_COMPLETE, (data) => {
        console.log('✅ Estimation complete:', data.estimates);
    });
    
    eventBus.on(EstimationEvents.ESTIMATION_ERROR, (data) => {
        console.error('❌ Estimation error:', data.error);
    });
    
    console.log('✅ Job estimator initialized');
}

/**
 * Handle image loaded event from imageLoader
 * @param {Object} data - Event data with image, imageData, and file info
 */
async function handleImageLoadedEvent(data) {
    console.log('🖼️ Image loaded event received:', data.file);
    
    try {
        // Display original image on canvas
        canvasManager.displayImage(data.image);
        
        // Clear simulation preview
        if (previewGenerator) {
            previewGenerator.clear();
        }
        
        // Store in state
        state.set('processing.imageData', {
            name: data.file.name,
            type: data.file.type,
            size: data.file.size,
            width: data.image.width,
            height: data.image.height
        }, false);
        
        // Enable generate button
        const generateBtn = document.getElementById('generate-gcode-btn');
        if (generateBtn) {
            generateBtn.disabled = false;
        }
        
        console.log('✅ Image displayed successfully');
        
    } catch (error) {
        console.error('❌ Error handling image loaded event:', error);
        showError(`Failed to display image: ${error.message}`);
    }
}

// ============================================================================
// UI Initialization
// ============================================================================

/**
 * Initialize UI components and tab navigation
 */
function initializeUI() {
    console.log('🎨 Initializing UI components...');
    
    // Tab navigation
    setupTabNavigation();
    
    // Mode-specific settings visibility
    setupModeSettings();
    
    // Color mode settings
    setupColorModeSettings();
    
    // Range input value displays
    setupRangeInputs();
    
    // Nozzle preview
    initializeNozzlePreview();
}

/**
 * Setup tab navigation system
 */
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
            
            // Emit tab change event
            eventBus.emit(Events.TAB_CHANGED, { tab: targetTab });
            console.log(`📑 Switched to tab: ${targetTab}`);
        });
    });
}

/**
 * Setup painting mode settings visibility
 */
function setupModeSettings() {
    const modeRadios = document.querySelectorAll('input[name="painting-mode"]');
    const dotSettings = document.getElementById('dot-mode-settings');
    const lineSettings = document.getElementById('line-mode-settings');
    const edgeSettings = document.getElementById('edge-mode-settings');
    
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const mode = e.target.value;
            
            // Update state
            state.set('paint.paintingMode', mode);
            
            // Hide all mode settings
            dotSettings.style.display = 'none';
            lineSettings.style.display = 'none';
            edgeSettings.style.display = 'none';
            
            // Show selected mode settings
            switch(mode) {
                case 'pointillism':
                    dotSettings.style.display = 'block';
                    break;
                case 'strokes':
                    lineSettings.style.display = 'block';
                    break;
                case 'spray':
                    edgeSettings.style.display = 'block';
                    break;
            }
            
            console.log(`🎨 Painting mode changed to: ${mode}`);
        });
    });
}

/**
 * Setup color mode settings (auto vs manual)
 */
function setupColorModeSettings() {
    const colorModeRadios = document.querySelectorAll('input[name="color-mode"]');
    const manualColorsContainer = document.getElementById('manual-colors-container');
    
    colorModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const mode = e.target.value;
            
            if (mode === 'manual') {
                manualColorsContainer.style.display = 'block';
                generateColorPickers();
            } else {
                manualColorsContainer.style.display = 'none';
            }
            
            console.log(`🎨 Color mode changed to: ${mode}`);
        });
    });
    
    // Listen for changes in number of colors
    const numColorsInput = document.getElementById('num-colors');
    numColorsInput.addEventListener('input', (e) => {
        const numColors = parseInt(e.target.value);
        state.set('paint.numColors', numColors);
        
        const mode = document.querySelector('input[name="color-mode"]:checked').value;
        if (mode === 'manual') {
            generateColorPickers();
        }
    });
    
    // Subscribe to algorithm events
    subscribeToAlgorithmEvents();
}

/**
 * Subscribe to algorithm processing events
 */
function subscribeToAlgorithmEvents() {
    // K-Means clustering events
    eventBus.on('CLUSTERING_PROGRESS', (data) => {
        showProgress(data.progress, `Finding dominant colors... (${data.iteration}/${data.maxIterations})`);
    });
    
    eventBus.on('CLUSTERING_COMPLETE', (data) => {
        console.log(`✅ K-Means clustering complete: ${data.colors.length} colors found`);
    });
    
    // Color separation events
    eventBus.on('COLOR_SEPARATION_PROGRESS', (data) => {
        showProgress(data.progress, `Separating colors... (${data.currentLayer}/${data.totalLayers})`);
    });
    
    eventBus.on('COLOR_SEPARATION_COMPLETE', (data) => {
        console.log(`✅ Color separation complete: ${data.totalLayers} layers created`);
    });
    
    // Edge detection events
    eventBus.on('EDGE_DETECTION_PROGRESS', (data) => {
        showProgress(data.progress, `Detecting edges... (${data.step})`);
    });
    
    eventBus.on('EDGE_DETECTION_COMPLETE', (data) => {
        console.log(`✅ Edge detection complete: ${data.width}x${data.height}`);
    });
}

/**
 * Generate color picker inputs based on number of colors
 */
function generateColorPickers() {
    const numColors = state.get('paint.numColors');
    const selectedColors = state.get('paint.selectedColors');
    const container = document.getElementById('color-pickers');
    container.innerHTML = '';
    
    for (let i = 0; i < numColors; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';
        const currentColor = selectedColors[i] || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
        
        wrapper.innerHTML = `
            <label for="color-${i}">Color ${i + 1}</label>
            <input type="color" id="color-${i}" class="color-picker" data-index="${i}" value="${currentColor}">
        `;
        container.appendChild(wrapper);
        
        // Add event listener for this color picker
        const colorInput = wrapper.querySelector('input');
        colorInput.addEventListener('input', (e) => {
            const colors = state.get('paint.selectedColors');
            colors[i] = e.target.value;
            state.set('paint.selectedColors', colors);
        });
    }
    
    console.log(`🎨 Generated ${numColors} color pickers`);
}

/**
 * Setup range input value displays
 */
function setupRangeInputs() {
    const thresholdLow = document.getElementById('threshold-low');
    const thresholdHigh = document.getElementById('threshold-high');
    const thresholdLowValue = document.getElementById('threshold-low-value');
    const thresholdHighValue = document.getElementById('threshold-high-value');
    
    thresholdLow.addEventListener('input', (e) => {
        thresholdLowValue.textContent = e.target.value;
    });
    
    thresholdHigh.addEventListener('input', (e) => {
        thresholdHighValue.textContent = e.target.value;
    });
}

/**
 * Initialize nozzle preview canvas
 */
function initializeNozzlePreview() {
    const canvas = document.getElementById('nozzle-preview-canvas');
    const ctx = canvas.getContext('2d');
    
    // Draw initial preview from state
    const shape = state.get('nozzle.shape');
    const size = state.get('nozzle.size');
    drawNozzlePreview(ctx, shape, size);
    
    // Listen for nozzle configuration changes
    const nozzleShapeRadios = document.querySelectorAll('input[name="nozzle-shape"]');
    const nozzleSizeInput = document.getElementById('nozzle-size');
    
    nozzleShapeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.set('nozzle.shape', e.target.value);
        });
    });
    
    nozzleSizeInput.addEventListener('input', (e) => {
        state.set('nozzle.size', parseFloat(e.target.value));
    });
    
    // Subscribe to state changes
    state.subscribe('nozzle', () => {
        const shape = state.get('nozzle.shape');
        const size = state.get('nozzle.size');
        drawNozzlePreview(ctx, shape, size);
    });
}

/**
 * Draw nozzle preview on canvas
 */
function drawNozzlePreview(ctx, shape, size) {
    const canvas = ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 3; // Scale for visibility
    const radius = (size * scale) / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= canvas.width; i += 20) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
    }
    ctx.stroke();
    
    // Draw center lines
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    
    // Draw nozzle shape
    ctx.fillStyle = '#2563eb';
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2;
    
    if (shape === 'circular') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else if (shape === 'flat') {
        ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
        ctx.strokeRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    }
    
    // Draw size label
    ctx.fillStyle = '#111827';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${size}mm`, centerX, canvas.height - 10);
}

// ============================================================================
// State Synchronization
// ============================================================================

/**
 * Setup bidirectional synchronization between UI and state
 */
function setupStateSynchronization() {
    console.log('🔄 Setting up state synchronization...');
    
    // Canvas settings
    setupInputSync('canvas-width', 'canvas.width', 'number');
    setupInputSync('canvas-height', 'canvas.height', 'number');
    
    // Robot settings
    setupInputSync('paint-capacity', 'robot.paintCapacity', 'number');
    setupInputSync('move-speed', 'robot.moveSpeed', 'number');
    
    // Paint settings - pointillism mode
    setupInputSync('dot-density', 'paint.pointillism.dotDensity', 'number');
    setupInputSync('min-dot-size', 'paint.pointillism.minDotSize', 'number');
    setupInputSync('max-dot-size', 'paint.pointillism.maxDotSize', 'number');
    setupInputSync('randomness', 'paint.pointillism.randomness', 'number');
    
    // Paint settings - strokes mode
    setupInputSync('stroke-length', 'paint.strokes.strokeLength', 'number');
    setupInputSync('stroke-width', 'paint.strokes.strokeWidth', 'number');
    setupInputSync('stroke-density', 'paint.strokes.strokeDensity', 'number');
    setupInputSync('follow-contours', 'paint.strokes.followContours', 'checkbox');
    
    // Paint settings - spray mode
    setupInputSync('spray-density', 'paint.spray.sprayDensity', 'number');
    setupInputSync('spray-radius', 'paint.spray.sprayRadius', 'number');
    
    console.log('✅ State synchronization configured');
}

/**
 * Setup synchronization for a single input element
 * @param {string} elementId - DOM element ID
 * @param {string} statePath - State path (dot notation)
 * @param {string} type - Input type ('number', 'text', 'checkbox')
 */
function setupInputSync(elementId, statePath, type = 'number') {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Element not found: ${elementId}`);
        return;
    }
    
    // Update state when UI changes
    const eventType = type === 'checkbox' ? 'change' : 'input';
    element.addEventListener(eventType, (e) => {
        let value;
        if (type === 'number') {
            value = parseFloat(e.target.value);
        } else if (type === 'checkbox') {
            value = e.target.checked;
        } else {
            value = e.target.value;
        }
        
        state.set(statePath, value);
    });
    
    // Update UI when state changes
    state.subscribe(statePath, (value) => {
        if (type === 'checkbox') {
            element.checked = value;
        } else {
            element.value = value;
        }
    });
}

/**
 * Sync UI with current state (initial load)
 */
function syncUIWithState() {
    console.log('🔄 Syncing UI with current state...');
    
    // Helper function to safely set element value
    const safeSetValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };
    
    const safeSetChecked = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.checked = value;
    };
    
    // Canvas settings
    safeSetValue('canvas-width', state.get('canvas.width'));
    safeSetValue('canvas-height', state.get('canvas.height'));
    
    // Robot settings
    safeSetValue('paint-capacity', state.get('robot.paintCapacity'));
    safeSetValue('move-speed', state.get('robot.moveSpeed'));
    
    // Paint settings
    safeSetValue('num-colors', state.get('paint.numColors'));
    
    // Set painting mode radio
    const paintingMode = state.get('paint.paintingMode');
    const modeRadio = document.querySelector(`input[name="painting-mode"][value="${paintingMode}"]`);
    if (modeRadio) {
        modeRadio.checked = true;
        modeRadio.dispatchEvent(new Event('change'));
    }
    
    // Pointillism settings
    safeSetValue('dot-density', state.get('paint.pointillism.dotDensity'));
    safeSetValue('min-dot-size', state.get('paint.pointillism.minDotSize'));
    safeSetValue('max-dot-size', state.get('paint.pointillism.maxDotSize'));
    safeSetValue('randomness', state.get('paint.pointillism.randomness'));
    
    // Strokes settings
    safeSetValue('stroke-length', state.get('paint.strokes.strokeLength'));
    safeSetValue('stroke-width', state.get('paint.strokes.strokeWidth'));
    safeSetValue('stroke-density', state.get('paint.strokes.strokeDensity'));
    safeSetChecked('follow-contours', state.get('paint.strokes.followContours'));
    
    // Spray settings
    safeSetValue('spray-density', state.get('paint.spray.sprayDensity'));
    safeSetValue('spray-radius', state.get('paint.spray.sprayRadius'));
    
    // Nozzle settings
    const nozzleShape = state.get('nozzle.shape');
    const shapeRadio = document.querySelector(`input[name="nozzle-shape"][value="${nozzleShape}"]`);
    if (shapeRadio) {
        shapeRadio.checked = true;
    }
    safeSetValue('nozzle-size', state.get('nozzle.size'));
    
    console.log('✅ UI synced with state');
}

// ============================================================================
// Presets
// ============================================================================

/**
 * Setup preset selection
 */
function setupPresets() {
    console.log('📦 Setting up presets...');
    
    const presetSelect = document.createElement('select');
    presetSelect.id = 'preset-select';
    presetSelect.className = 'form-control';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select a preset --';
    presetSelect.appendChild(defaultOption);
    
    // Add presets
    const presets = getPresetList();
    presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.key;
        option.textContent = preset.name;
        option.title = preset.description;
        presetSelect.appendChild(option);
    });
    
    // Add preset selector to settings tab
    const canvasSettings = document.querySelector('#tab-settings .section');
    if (canvasSettings) {
        const presetGroup = document.createElement('div');
        presetGroup.className = 'form-group';
        presetGroup.innerHTML = `
            <label for="preset-select">Load Preset Configuration</label>
        `;
        presetGroup.appendChild(presetSelect);
        canvasSettings.insertBefore(presetGroup, canvasSettings.firstChild);
    }
    
    // Handle preset selection
    presetSelect.addEventListener('change', (e) => {
        const presetKey = e.target.value;
        if (!presetKey) return;
        
        const currentState = state.getState();
        const newState = applyPreset(currentState, presetKey);
        
        if (newState) {
            state.loadState(newState);
            syncUIWithState();
            eventBus.emit(Events.PRESET_LOADED, { preset: presetKey });
            console.log(`📦 Preset loaded: ${presetKey}`);
        }
        
        // Reset selector
        presetSelect.value = '';
    });
    
    console.log('✅ Presets configured');
}

// ============================================================================
// Event Listeners
// ============================================================================

/**
 * Initialize all event listeners for user interactions
 */
function initializeEventListeners() {
    console.log('🎯 Setting up event listeners...');
    
    // Upload image button
    const uploadBtn = document.getElementById('upload-image-btn');
    const imageUpload = document.getElementById('image-upload');
    
    uploadBtn.addEventListener('click', () => {
        imageUpload.click();
    });
    
    imageUpload.addEventListener('change', handleImageUpload);
    
    // Setup drag and drop for image upload
    setupDragAndDrop();
    
    // Generate G-code button
    const generateBtn = document.getElementById('generate-gcode-btn');
    generateBtn.addEventListener('click', handleGenerateGCode);
    
    // Download G-code button
    const downloadBtn = document.getElementById('download-gcode-btn');
    downloadBtn.addEventListener('click', handleDownloadGCode);
    
    // Copy to clipboard button
    const copyBtn = document.getElementById('copy-gcode-btn');
    copyBtn.addEventListener('click', handleCopyGCode);
    
    // Refill position button
    const refillBtn = document.getElementById('set-refill-position');
    refillBtn.addEventListener('click', handleSetRefillPosition);
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle image upload
 */
async function handleImageUpload(event) {
    try {
        console.log('📁 Image upload initiated');
        
        // Clear previous image and results
        canvasManager.clearCanvas('both');
        clearResults();
        
        // Show progress
        canvasManager.showProgress(10, 'Loading image');
        
        // Load image using imageLoader
        const result = await imageLoader.handleFileInput(event);
        
        canvasManager.showProgress(100, 'Image loaded');
        
        // Hide progress after a short delay
        setTimeout(() => {
            canvasManager.hideProgress();
        }, 500);
        
        console.log('✅ Image upload handled successfully');
        
    } catch (error) {
        console.error('❌ Error handling image upload:', error);
        canvasManager.hideProgress();
        showError(error.message);
        
        // Disable generate button on error
        const generateBtn = document.getElementById('generate-gcode-btn');
        if (generateBtn) {
            generateBtn.disabled = true;
        }
    }
}

/**
 * Handle G-code generation
 */
async function handleGenerateGCode() {
    console.log('⚡ Generate G-Code clicked');
    
    try {
        // Get current image data from canvas
        const originalImageData = canvasManager.getImageData('original');
        if (!originalImageData) {
            showError('No image loaded. Please upload an image first.');
            return;
        }
        
        // Emit event
        eventBus.emit(Events.GCODE_GENERATION_STARTED, {
            config: state.getState()
        });
        
        // Get configuration
        const paintingMode = state.get('paint.paintingMode');
        const colorMode = document.querySelector('input[name="color-mode"]:checked').value;
        const numColors = state.get('paint.numColors');
        
        showProgress(5, 'Starting image processing...');
        
        // Preprocess image
        const processedImageData = await imagePreprocessor.preprocess(
            originalImageData,
            {
                resize: {
                    enabled: false // Use original size for now
                },
                contrast: {
                    enabled: true,
                    factor: 1.0
                },
                brightness: {
                    enabled: true,
                    factor: 0
                }
            }
        );
        
        showProgress(15, 'Image preprocessed');
        
        let colorPalette;
        let colorLayers;
        let edgeMap;
        
        // Process based on painting mode
        if (paintingMode === 'spray' || paintingMode === 'sketch') {
            // Edge detection for sketch mode
            showProgress(20, 'Detecting edges...');
            
            const lowThreshold = parseInt(document.getElementById('threshold-low').value);
            const highThreshold = parseInt(document.getElementById('threshold-high').value);
            
            edgeMap = await edgeDetection.detectEdges(
                processedImageData,
                lowThreshold,
                highThreshold
            );
            
            // Display edge map on preview canvas
            canvasManager.displayImageData(edgeMap, 'preview');
            
            showProgress(60, 'Edges detected');
            
        } else {
            // Color processing for pointillism and strokes modes
            if (colorMode === 'auto') {
                // Auto-pick colors using K-Means
                showProgress(20, 'Finding dominant colors...');
                
                // Use sample rate for large images (every 2nd pixel)
                const sampleRate = processedImageData.width * processedImageData.height > 1000000 ? 2 : 1;
                
                colorPalette = await kMeans.findDominantColors(
                    processedImageData,
                    numColors,
                    50, // max iterations
                    sampleRate
                );
                
                // Update manual color pickers with auto-picked colors
                updateColorPickersWithPalette(colorPalette);
                
                showProgress(40, 'Dominant colors found');
                
            } else {
                // Use manually selected colors
                showProgress(20, 'Using manual colors...');
                
                const selectedColors = state.get('paint.selectedColors');
                colorPalette = selectedColors.slice(0, numColors).map(hexToRgb);
                
                showProgress(30, 'Manual colors loaded');
            }
            
            // Quantize image to palette
            showProgress(45, 'Quantizing image...');
            const quantizedImage = kMeans.quantizeImage(processedImageData, colorPalette);
            
            // Display quantized image on preview canvas
            canvasManager.displayImageData(quantizedImage, 'preview');
            
            showProgress(50, 'Image quantized');
            
            // Separate into color layers
            showProgress(55, 'Separating color layers...');
            
            colorLayers = await colorSeparator.separateColors(
                quantizedImage,
                colorPalette,
                30 // tolerance
            );
            
            showProgress(75, 'Color layers separated');
            
            // Log layer statistics
            const stats = colorSeparator.getLayerStatistics(colorLayers);
            console.log('📊 Layer Statistics:', stats);
        }
        
        showProgress(80, 'Processing complete');
        
        // Store processing results in state
        state.setMultiple({
            'processing.colorPalette': colorPalette,
            'processing.colorLayers': colorLayers,
            'processing.edgeMap': edgeMap,
            'processing.quantizedImage': null // Store reference only
        }, false);
        
        showProgress(85, 'Generating G-code...');
        
        // Generate G-code using the new generator
        const config = state.getState();
        const gcode = await gcodeGenerator.generate(config, colorLayers, edgeMap);
        
        // Display generated G-code
        document.getElementById('gcode-output').value = gcode;
        
        // Store in state
        state.set('processing.gcodeData', gcode, false);
        
        // Calculate job estimates from G-code
        showProgress(87, 'Calculating estimates...');
        try {
            jobEstimator = new JobEstimator(state.getState());
            const estimates = jobEstimator.estimateFromGCode(gcode);
            updateSummaryWithEstimates(estimates);
        } catch (error) {
            console.error('❌ Error calculating estimates:', error);
            // Fall back to basic statistics
            updateSummaryStatistics(colorLayers, edgeMap, gcode);
        }
        
        // Enable download buttons
        document.getElementById('download-gcode-btn').disabled = false;
        document.getElementById('copy-gcode-btn').disabled = false;
        
        showProgress(90, 'Rendering simulation preview...');
        
        // Generate simulation preview
        await renderSimulationPreview(colorLayers, gcode);
        
        showProgress(100, 'Complete!');
        
        setTimeout(() => {
            hideProgress();
        }, 1000);
        
        eventBus.emit(Events.GCODE_GENERATED, {
            success: true,
            message: 'G-code generation complete'
        });
        
        console.log('✅ G-code generation complete');
        
    } catch (error) {
        console.error('❌ Error during G-code generation:', error);
        hideProgress();
        showError(`Processing failed: ${error.message}`);
        
        eventBus.emit(Events.ERROR_OCCURRED, {
            error: error.message,
            context: 'handleGenerateGCode'
        });
    }
}

/**
 * Update color pickers with auto-picked palette
 * @param {Array} palette - Array of RGB colors
 */
function updateColorPickersWithPalette(palette) {
    const colors = palette.map(color => rgbToHex(color.r, color.g, color.b));
    state.set('paint.selectedColors', colors);
    
    // Update UI if in manual mode
    const colorMode = document.querySelector('input[name="color-mode"]:checked').value;
    if (colorMode === 'manual') {
        const pickers = document.querySelectorAll('.color-picker');
        pickers.forEach((picker, index) => {
            if (index < colors.length) {
                picker.value = colors[index];
            }
        });
    }
    
    console.log('🎨 Color pickers updated with palette:', colors);
}

/**
 * Update summary with job estimates
 * @param {Object} estimates - Estimates from JobEstimator
 */
function updateSummaryWithEstimates(estimates) {
    // Update time
    document.getElementById('estimated-time').textContent = estimates.time.formatted;
    
    // Update paint consumption
    document.getElementById('paint-consumed').textContent = estimates.paint.formatted;
    
    // Update travel distance
    document.getElementById('travel-distance').textContent = estimates.distance.formatted;
    
    // Update refills needed
    document.getElementById('refills-needed').textContent = estimates.paint.refills.formatted;
    
    console.log('📊 Summary updated with estimates:', estimates);
}

/**
 * Update summary statistics based on generated G-code (fallback method)
 * @param {Array} colorLayers - Color layers (if applicable)
 * @param {ImageData} edgeMap - Edge map (if applicable)
 * @param {string} gcode - Generated G-code
 */
function updateSummaryStatistics(colorLayers, edgeMap, gcode) {
    // Count G-code lines
    const gcodeLines = gcode.split('\n');
    const moveCommands = gcodeLines.filter(line => line.startsWith('G0') || line.startsWith('G1')).length;
    
    if (colorLayers) {
        const stats = colorSeparator.getLayerStatistics(colorLayers);
        const totalPixels = stats.totalPixels;
        
        // Estimate time: 0.2 seconds per pixel (move + paint)
        const estimatedSeconds = totalPixels * 0.2;
        const hours = Math.floor(estimatedSeconds / 3600);
        const minutes = Math.floor((estimatedSeconds % 3600) / 60);
        
        document.getElementById('estimated-time').textContent = hours > 0
            ? `${hours}h ${minutes}m`
            : `${minutes}m`;
        
        document.getElementById('paint-consumed').textContent = `${colorLayers.length} colors`;
        
        // Estimate travel distance (rough approximation)
        const avgMoveDistance = 50; // mm average move
        document.getElementById('travel-distance').textContent = `${(moveCommands * avgMoveDistance / 1000).toFixed(1)} m`;
        
        // Count refill commands
        const refillCount = gcodeLines.filter(line => line.includes('REFILL SEQUENCE')).length;
        document.getElementById('refills-needed').textContent = refillCount.toString();
        
    } else if (edgeMap) {
        // Count edge pixels
        let edgePixelCount = 0;
        for (let i = 0; i < edgeMap.data.length; i += 4) {
            if (edgeMap.data[i] > 128) edgePixelCount++;
        }
        
        const estimatedSeconds = edgePixelCount * 0.1;
        const minutes = Math.floor(estimatedSeconds / 60);
        
        document.getElementById('estimated-time').textContent = `${minutes}m`;
        document.getElementById('paint-consumed').textContent = '1 color';
        document.getElementById('travel-distance').textContent = `${(moveCommands * 50 / 1000).toFixed(1)} m`;
        
        const refillCount = gcodeLines.filter(line => line.includes('REFILL SEQUENCE')).length;
        document.getElementById('refills-needed').textContent = refillCount.toString();
    }
    
    console.log('📊 Summary statistics updated');
}

/**
 * Handle G-code download
 */
function handleDownloadGCode() {
    console.log('💾 Download G-Code clicked');
    
    const gcode = document.getElementById('gcode-output').value;
    if (!gcode) {
        gcodeExporter.showFeedback('No G-code to download. Generate G-code first.', 'error');
        return;
    }
    
    try {
        // Generate descriptive filename from current configuration
        const config = {
            canvasWidth: state.get('canvas.width'),
            canvasHeight: state.get('canvas.height'),
            numColors: state.get('paint.numColors')
        };
        const filename = gcodeExporter.generateFilename(config);
        
        // Download G-code
        gcodeExporter.downloadGCode(gcode, filename, 'gcode');
        
        // Show success feedback
        gcodeExporter.showFeedback('G-code downloaded successfully!', 'success');
        
        // Emit event
        eventBus.emit(Events.GCODE_DOWNLOADED, { filename: filename + '.gcode' });
        console.log('✅ G-code downloaded:', filename);
        
    } catch (error) {
        console.error('❌ Error downloading G-code:', error);
        gcodeExporter.showFeedback('Failed to download G-code', 'error');
    }
}

/**
 * Handle copy G-code to clipboard
 */
async function handleCopyGCode() {
    console.log('📋 Copy G-Code clicked');
    
    const gcode = document.getElementById('gcode-output').value;
    if (!gcode) {
        gcodeExporter.showFeedback('No G-code to copy. Generate G-code first.', 'error');
        return;
    }
    
    try {
        // Copy to clipboard using clipboard manager
        await clipboardManager.copy(gcode);
        
        // Show success feedback
        gcodeExporter.showFeedback('Copied to clipboard!', 'success');
        
        // Update button temporarily
        const btn = document.getElementById('copy-gcode-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
        
        console.log('✅ G-code copied to clipboard');
        
    } catch (error) {
        console.error('❌ Error copying to clipboard:', error);
        gcodeExporter.showFeedback('Failed to copy to clipboard', 'error');
    }
}

/**
 * Handle set refill position
 */
function handleSetRefillPosition() {
    console.log('🔄 Set refill position clicked');
    
    const canvasWidth = state.get('canvas.width');
    const canvasHeight = state.get('canvas.height');
    
    // Default: Outside canvas on the left, centered vertically
    const refillX = -10;
    const refillY = canvasHeight / 2;
    
    state.setMultiple({
        'robot.refillPosition.x': refillX,
        'robot.refillPosition.y': refillY
    });
    
    console.log(`🔄 Refill position set to: (${refillX}, ${refillY})`);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Show progress indicator
 * @param {number} percentage - Progress percentage (0-100)
 * @param {string} message - Progress message (optional)
 */
function showProgress(percentage, message = null) {
    const container = document.getElementById('progress-container');
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    
    container.style.display = 'block';
    fill.style.width = `${percentage}%`;
    
    if (message) {
        text.textContent = message;
    } else {
        text.textContent = `Processing... ${Math.round(percentage)}%`;
    }
}

/**
 * Hide progress indicator
 */
function hideProgress() {
    const container = document.getElementById('progress-container');
    container.style.display = 'none';
}

/**
 * Show error message
 */
function showError(message) {
    // Use toast notification for better UX
    if (typeof gcodeExporter !== 'undefined' && gcodeExporter.showFeedback) {
        gcodeExporter.showFeedback(message, 'error', 5000);
    } else {
        alert(`❌ Error: ${message}`);
    }
}

/**
 * Show placeholder results
 */
function showPlaceholderResults() {
    // Update summary
    document.getElementById('estimated-time').textContent = '2h 15m';
    document.getElementById('paint-consumed').textContent = '3.5 cans';
    document.getElementById('travel-distance').textContent = '850.5 m';
    document.getElementById('refills-needed').textContent = '3';
    
    // Get current configuration
    const canvasWidth = state.get('canvas.width');
    const canvasHeight = state.get('canvas.height');
    const paintingMode = state.get('paint.paintingMode');
    const numColors = state.get('paint.numColors');
    
    // Show placeholder G-code
    const placeholderGCode = `; MuralBot G-Code Generator
; Generated: ${new Date().toISOString()}
; Canvas: ${canvasWidth}cm x ${canvasHeight}cm
; Mode: ${paintingMode}
; Colors: ${numColors}

; === INITIALIZATION ===
G21 ; Set units to millimeters
G90 ; Absolute positioning
G28 ; Home all axes
M5  ; Nozzle off

; === COLOR LAYER 1 ===
; TODO: Implement full G-code generation in Phase 4
G0 X${canvasWidth * 5} Y${canvasHeight * 5} Z2121.32
M3  ; Nozzle on
G4 P0.1
M5  ; Nozzle off

; === END ===
M5  ; Ensure nozzle off
G28 ; Return to home
`;
    
    document.getElementById('gcode-output').value = placeholderGCode;
    
    // Store in state
    state.set('processing.gcodeData', placeholderGCode, false);
    
    // Enable download buttons
    document.getElementById('download-gcode-btn').disabled = false;
    document.getElementById('copy-gcode-btn').disabled = false;
    
    console.log('✅ Placeholder results displayed');
}

/**
 * Render simulation preview
 * @param {Array} colorLayers - Color layers from processing
 * @param {string} gcode - Generated G-code
 */
async function renderSimulationPreview(colorLayers, gcode) {
    try {
        if (!previewGenerator) {
            console.warn('Preview generator not initialized');
            return;
        }
        
        // Create configuration from current state
        const config = PreviewGenerator.createConfigFromState(state.getState());
        
        // Render instant preview from color layers
        if (colorLayers && colorLayers.length > 0) {
            await previewGenerator.generateInstantPreview(colorLayers, config);
            console.log('✅ Simulation preview rendered from color layers');
        } else {
            console.log('ℹ️ No color layers to render preview');
        }
        
    } catch (error) {
        console.error('❌ Error rendering simulation preview:', error);
        // Don't fail the entire process if preview fails
    }
}

/**
 * Clear results from previous generation
 */
function clearResults() {
    // Clear summary
    document.getElementById('estimated-time').textContent = '--';
    document.getElementById('paint-consumed').textContent = '--';
    document.getElementById('travel-distance').textContent = '--';
    document.getElementById('refills-needed').textContent = '--';
    
    // Clear G-code output
    document.getElementById('gcode-output').value = '';
    
    // Disable download buttons
    document.getElementById('download-gcode-btn').disabled = true;
    document.getElementById('copy-gcode-btn').disabled = true;
    
    // Clear simulation preview
    if (previewGenerator) {
        previewGenerator.clear();
    }
    
    // Clear state
    state.set('processing.gcodeData', null, false);
    
    if (state.get('processing.imageData')) {
        console.log('🧹 Results cleared');
    }
}

/**
 * Setup drag and drop functionality for image upload
 */
function setupDragAndDrop() {
    const originalCanvas = document.getElementById('original-canvas');
    const canvasWrapper = originalCanvas.parentElement;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        canvasWrapper.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        canvasWrapper.addEventListener(eventName, () => {
            canvasWrapper.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        canvasWrapper.addEventListener(eventName, () => {
            canvasWrapper.classList.remove('drag-over');
        }, false);
    });
    
    // Handle dropped files
    canvasWrapper.addEventListener('drop', handleDrop, false);
    
    console.log('✅ Drag and drop configured');
}

/**
 * Prevent default drag behaviors
 * @param {Event} e - Event object
 */
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/**
 * Handle file drop
 * @param {DragEvent} e - Drag event
 */
async function handleDrop(e) {
    try {
        console.log('📁 File dropped');
        
        // Clear previous image and results
        canvasManager.clearCanvas('both');
        clearResults();
        
        // Show progress
        canvasManager.showProgress(10, 'Loading image');
        
        // Load image using imageLoader
        const result = await imageLoader.handleFileDrop(e);
        
        canvasManager.showProgress(100, 'Image loaded');
        
        // Hide progress after a short delay
        setTimeout(() => {
            canvasManager.hideProgress();
        }, 500);
        
        console.log('✅ Dropped image handled successfully');
        
    } catch (error) {
        console.error('❌ Error handling dropped file:', error);
        canvasManager.hideProgress();
        showError(error.message);
        
        // Disable generate button on error
        const generateBtn = document.getElementById('generate-gcode-btn');
        if (generateBtn) {
            generateBtn.disabled = true;
        }
    }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S or Cmd+S: Download G-code
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const gcode = document.getElementById('gcode-output').value;
            if (gcode) {
                handleDownloadGCode();
            }
        }
        
        // Ctrl+C or Cmd+C: Copy G-code (only when textarea is focused)
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const gcodeOutput = document.getElementById('gcode-output');
            if (document.activeElement === gcodeOutput && gcodeOutput.value) {
                // Let default copy behavior work, but show feedback
                setTimeout(() => {
                    gcodeExporter.showFeedback('Copied to clipboard!', 'success');
                }, 100);
            }
        }
    });
    
    console.log('⌨️ Keyboard shortcuts configured');
}

console.log('📦 Main.js loaded successfully');