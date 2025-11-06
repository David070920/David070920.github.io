/**
 * Canvas Manager Module
 * Manages canvas elements for displaying original and processed images
 * @module processing/canvasManager
 */

import eventBus, { Events } from '../core/eventBus.js';
import state from '../core/state.js';

/**
 * CanvasManager class for managing canvas operations
 */
class CanvasManager {
  constructor() {
    /**
     * Original image canvas
     * @type {HTMLCanvasElement|null}
     * @private
     */
    this._originalCanvas = null;

    /**
     * Preview/simulation canvas
     * @type {HTMLCanvasElement|null}
     * @private
     */
    this._previewCanvas = null;

    /**
     * Canvas contexts
     * @type {Object}
     * @private
     */
    this._contexts = {
      original: null,
      preview: null
    };

    /**
     * Canvas placeholder elements
     * @type {Object}
     * @private
     */
    this._placeholders = {
      original: null,
      preview: null
    };

    /**
     * Debug mode flag
     * @type {boolean}
     * @private
     */
    this._debug = true;
  }

  /**
   * Initializes canvas manager with canvas elements
   * @param {string|HTMLCanvasElement} originalCanvasId - Original canvas element or ID
   * @param {string|HTMLCanvasElement} previewCanvasId - Preview canvas element or ID
   */
  initialize(originalCanvasId, previewCanvasId) {
    // Get canvas elements
    this._originalCanvas = typeof originalCanvasId === 'string' 
      ? document.getElementById(originalCanvasId)
      : originalCanvasId;
    
    this._previewCanvas = typeof previewCanvasId === 'string'
      ? document.getElementById(previewCanvasId)
      : previewCanvasId;

    if (!this._originalCanvas || !this._previewCanvas) {
      throw new Error('Canvas elements not found');
    }

    // Get contexts
    this._contexts.original = this._originalCanvas.getContext('2d');
    this._contexts.preview = this._previewCanvas.getContext('2d');

    // Get placeholder elements (siblings with canvas-placeholder class)
    this._placeholders.original = this._originalCanvas.parentElement.querySelector('.canvas-placeholder');
    this._placeholders.preview = this._previewCanvas.parentElement.querySelector('.canvas-placeholder');

    if (this._debug) {
      console.log('[CanvasManager] Initialized with canvases:', {
        original: this._originalCanvas.id,
        preview: this._previewCanvas.id
      });
    }

    // Subscribe to canvas settings changes
    this._subscribeToSettings();
  }

  /**
   * Displays an image on the original canvas
   * @param {HTMLImageElement} image - Image to display
   * @param {Object} options - Display options
   * @param {boolean} options.maintainAspectRatio - Whether to maintain aspect ratio (default: true)
   * @param {string} options.fit - Fit mode: 'contain' | 'cover' | 'fill' (default: 'contain')
   */
  displayImage(image, options = {}) {
    const {
      maintainAspectRatio = true,
      fit = 'contain'
    } = options;

    try {
      // Clear canvas first
      this.clearCanvas('original');

      // Resize canvas based on state settings
      this._resizeCanvas('original');

      const ctx = this._contexts.original;
      const canvas = this._originalCanvas;

      if (maintainAspectRatio) {
        const scale = this._calculateScale(image, canvas, fit);
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;

        // Center the image
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        // Draw image
        ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
      } else {
        // Stretch to fill canvas
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      }

      // Hide placeholder, show canvas
      this._showCanvas('original');

      if (this._debug) {
        console.log('[CanvasManager] Image displayed on original canvas:', {
          imageSize: `${image.width}x${image.height}`,
          canvasSize: `${canvas.width}x${canvas.height}`
        });
      }

    } catch (error) {
      console.error('[CanvasManager] Error displaying image:', error);
      eventBus.emit(Events.PROCESSING_ERROR, {
        type: 'display_image',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Displays processed image data on the preview canvas
   * @param {ImageData|HTMLImageElement} data - Image data to display
   */
  displayPreview(data) {
    try {
      this.clearCanvas('preview');
      this._resizeCanvas('preview');

      const ctx = this._contexts.preview;
      const canvas = this._previewCanvas;

      if (data instanceof ImageData) {
        // Create temporary canvas for ImageData
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = data.width;
        tempCanvas.height = data.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(data, 0, 0);

        // Draw scaled to preview canvas
        const scale = this._calculateScale({ width: data.width, height: data.height }, canvas, 'contain');
        const scaledWidth = data.width * scale;
        const scaledHeight = data.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(tempCanvas, x, y, scaledWidth, scaledHeight);
      } else if (data instanceof HTMLImageElement) {
        // Draw image element
        const scale = this._calculateScale(data, canvas, 'contain');
        const scaledWidth = data.width * scale;
        const scaledHeight = data.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(data, x, y, scaledWidth, scaledHeight);
      }

      this._showCanvas('preview');

      if (this._debug) {
        console.log('[CanvasManager] Preview displayed');
      }

    } catch (error) {
      console.error('[CanvasManager] Error displaying preview:', error);
      throw error;
    }
  }

  /**
   * Clears a canvas
   * @param {string} canvasType - 'original' | 'preview' | 'both'
   */
  clearCanvas(canvasType = 'both') {
    if (canvasType === 'original' || canvasType === 'both') {
      const ctx = this._contexts.original;
      const canvas = this._originalCanvas;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this._hidePlaceholder('original', false);
    }

    if (canvasType === 'preview' || canvasType === 'both') {
      const ctx = this._contexts.preview;
      const canvas = this._previewCanvas;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this._hidePlaceholder('preview', false);
    }

    if (this._debug) {
      console.log(`[CanvasManager] Cleared canvas: ${canvasType}`);
    }
  }

  /**
   * Gets ImageData from a canvas
   * @param {string} canvasType - 'original' | 'preview'
   * @returns {ImageData}
   */
  getImageData(canvasType = 'original') {
    const ctx = canvasType === 'original' 
      ? this._contexts.original 
      : this._contexts.preview;
    
    const canvas = canvasType === 'original'
      ? this._originalCanvas
      : this._previewCanvas;

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Resizes canvas based on state settings
   * @param {string} canvasType - 'original' | 'preview' | 'both'
   * @private
   */
  _resizeCanvas(canvasType = 'both') {
    const canvasWidth = state.get('canvas.width');
    const canvasHeight = state.get('canvas.height');

    // Convert cm to pixels (using a reasonable DPI for display)
    const displayScale = 3; // 3 pixels per cm for display
    const width = canvasWidth * displayScale;
    const height = canvasHeight * displayScale;

    if (canvasType === 'original' || canvasType === 'both') {
      this._originalCanvas.width = width;
      this._originalCanvas.height = height;
    }

    if (canvasType === 'preview' || canvasType === 'both') {
      this._previewCanvas.width = width;
      this._previewCanvas.height = height;
    }

    if (this._debug) {
      console.log(`[CanvasManager] Resized canvas ${canvasType}:`, {
        physicalSize: `${canvasWidth}x${canvasHeight}cm`,
        displaySize: `${width}x${height}px`
      });
    }
  }

  /**
   * Calculates scale factor to fit image in canvas
   * @param {Object} image - Object with width and height
   * @param {HTMLCanvasElement} canvas - Target canvas
   * @param {string} fit - Fit mode: 'contain' | 'cover' | 'fill'
   * @returns {number} Scale factor
   * @private
   */
  _calculateScale(image, canvas, fit) {
    const scaleX = canvas.width / image.width;
    const scaleY = canvas.height / image.height;

    switch (fit) {
      case 'contain':
        return Math.min(scaleX, scaleY);
      case 'cover':
        return Math.max(scaleX, scaleY);
      case 'fill':
        return 1;
      default:
        return Math.min(scaleX, scaleY);
    }
  }

  /**
   * Shows canvas and hides placeholder
   * @param {string} canvasType - 'original' | 'preview'
   * @private
   */
  _showCanvas(canvasType) {
    const canvas = canvasType === 'original' 
      ? this._originalCanvas 
      : this._previewCanvas;
    
    const placeholder = this._placeholders[canvasType];

    canvas.style.display = 'block';
    if (placeholder) {
      placeholder.style.display = 'none';
    }
  }

  /**
   * Hides placeholder
   * @param {string} canvasType - 'original' | 'preview'
   * @param {boolean} showCanvas - Whether to show canvas (default: true)
   * @private
   */
  _hidePlaceholder(canvasType, showCanvas = true) {
    const placeholder = this._placeholders[canvasType];
    const canvas = canvasType === 'original' 
      ? this._originalCanvas 
      : this._previewCanvas;

    if (placeholder) {
      placeholder.style.display = showCanvas ? 'none' : 'flex';
    }
    if (canvas) {
      canvas.style.display = showCanvas ? 'block' : 'none';
    }
  }

  /**
   * Shows progress indicator
   * @param {number} percentage - Progress percentage (0-100)
   * @param {string} message - Progress message
   */
  showProgress(percentage, message = 'Processing...') {
    const container = document.getElementById('progress-container');
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');

    if (container && fill && text) {
      container.style.display = 'block';
      fill.style.width = `${percentage}%`;
      text.textContent = `${message} ${percentage}%`;
    }

    // Emit progress event
    eventBus.emit(Events.PROCESSING_PROGRESS, { percentage, message });
  }

  /**
   * Hides progress indicator
   */
  hideProgress() {
    const container = document.getElementById('progress-container');
    if (container) {
      container.style.display = 'none';
    }
  }

  /**
   * Subscribes to canvas settings changes in state
   * @private
   */
  _subscribeToSettings() {
    // Subscribe to canvas dimension changes
    state.subscribe('canvas.width', () => {
      if (this._debug) {
        console.log('[CanvasManager] Canvas width changed, resizing...');
      }
      this._resizeCanvas('both');
    });

    state.subscribe('canvas.height', () => {
      if (this._debug) {
        console.log('[CanvasManager] Canvas height changed, resizing...');
      }
      this._resizeCanvas('both');
    });
  }

  /**
   * Draws a grid on canvas (useful for debugging)
   * @param {string} canvasType - 'original' | 'preview'
   * @param {number} spacing - Grid spacing in pixels
   */
  drawGrid(canvasType, spacing = 50) {
    const ctx = canvasType === 'original' 
      ? this._contexts.original 
      : this._contexts.preview;
    
    const canvas = canvasType === 'original'
      ? this._originalCanvas
      : this._previewCanvas;

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x <= canvas.width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= canvas.height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  /**
   * Enables or disables debug logging
   * @param {boolean} enabled - Debug mode flag
   */
  setDebug(enabled) {
    this._debug = enabled;
    console.log(`[CanvasManager] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Gets canvas element
   * @param {string} canvasType - 'original' | 'preview'
   * @returns {HTMLCanvasElement}
   */
  getCanvas(canvasType) {
    return canvasType === 'original' 
      ? this._originalCanvas 
      : this._previewCanvas;
  }

  /**
   * Gets canvas context
   * @param {string} canvasType - 'original' | 'preview'
   * @returns {CanvasRenderingContext2D}
   */
  getContext(canvasType) {
    return canvasType === 'original'
      ? this._contexts.original
      : this._contexts.preview;
  }
}

// Create and export singleton instance
const canvasManager = new CanvasManager();

export default canvasManager;