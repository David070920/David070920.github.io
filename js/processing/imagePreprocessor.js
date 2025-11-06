/**
 * Image Preprocessor Module
 * Handles image preprocessing operations like resizing, color space conversion, and adjustments
 * @module processing/imagePreprocessor
 */

import eventBus, { Events } from '../core/eventBus.js';
import state from '../core/state.js';
import { CONSTANTS } from '../core/config.js';

/**
 * ImagePreprocessor class for image preprocessing operations
 */
class ImagePreprocessor {
  constructor() {
    /**
     * Temporary canvas for processing
     * @type {HTMLCanvasElement}
     * @private
     */
    this._tempCanvas = document.createElement('canvas');
    this._tempContext = this._tempCanvas.getContext('2d');

    /**
     * Debug mode flag
     * @type {boolean}
     * @private
     */
    this._debug = true;
  }

  /**
   * Preprocesses an image with all required operations
   * @param {HTMLImageElement} image - Source image
   * @param {Object} options - Preprocessing options
   * @param {number} options.maxWidth - Maximum width (optional)
   * @param {number} options.maxHeight - Maximum height (optional)
   * @param {boolean} options.maintainAspectRatio - Maintain aspect ratio (default: true)
   * @param {string} options.colorSpace - Target color space: 'rgb' | 'grayscale' (default: 'rgb')
   * @param {number} options.brightness - Brightness adjustment (-100 to 100, default: 0)
   * @param {number} options.contrast - Contrast adjustment (-100 to 100, default: 0)
   * @returns {Promise<{image: HTMLImageElement, imageData: ImageData, width: number, height: number}>}
   */
  async preprocess(image, options = {}) {
    try {
      if (this._debug) {
        console.log('[ImagePreprocessor] Starting preprocessing:', options);
      }

      const {
        maxWidth,
        maxHeight,
        maintainAspectRatio = true,
        colorSpace = 'rgb',
        brightness = 0,
        contrast = 0
      } = options;

      // Emit processing started event
      eventBus.emit(Events.PROCESSING_STARTED, {
        operation: 'preprocess',
        originalSize: { width: image.width, height: image.height }
      });

      // Step 1: Resize image if needed
      let processedImage = image;
      if (maxWidth || maxHeight) {
        processedImage = this.resizeImage(image, {
          maxWidth,
          maxHeight,
          maintainAspectRatio
        });
      }

      // Step 2: Get ImageData
      let imageData = this._getImageData(processedImage);

      // Step 3: Apply color space conversion
      if (colorSpace === 'grayscale') {
        imageData = this.convertToGrayscale(imageData);
      }

      // Step 4: Apply adjustments
      if (brightness !== 0 || contrast !== 0) {
        imageData = this.adjustBrightnessContrast(imageData, brightness, contrast);
      }

      // Convert back to image if needed
      const finalImage = this._imageDataToImage(imageData);

      // Emit completion event
      eventBus.emit(Events.PROCESSING_COMPLETED, {
        operation: 'preprocess',
        resultSize: { width: imageData.width, height: imageData.height }
      });

      if (this._debug) {
        console.log('[ImagePreprocessor] Preprocessing complete:', {
          originalSize: `${image.width}x${image.height}`,
          processedSize: `${imageData.width}x${imageData.height}`,
          colorSpace
        });
      }

      return {
        image: finalImage,
        imageData,
        width: imageData.width,
        height: imageData.height
      };

    } catch (error) {
      console.error('[ImagePreprocessor] Preprocessing error:', error);
      eventBus.emit(Events.PROCESSING_ERROR, {
        type: 'preprocess',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Resizes an image to fit within maximum dimensions
   * @param {HTMLImageElement} image - Source image
   * @param {Object} options - Resize options
   * @param {number} options.maxWidth - Maximum width
   * @param {number} options.maxHeight - Maximum height
   * @param {boolean} options.maintainAspectRatio - Maintain aspect ratio (default: true)
   * @returns {HTMLImageElement} Resized image
   */
  resizeImage(image, options = {}) {
    const {
      maxWidth,
      maxHeight,
      maintainAspectRatio = true
    } = options;

    let targetWidth = image.width;
    let targetHeight = image.height;

    if (maintainAspectRatio) {
      // Calculate scale to fit within max dimensions
      const scaleX = maxWidth ? maxWidth / image.width : 1;
      const scaleY = maxHeight ? maxHeight / image.height : 1;
      const scale = Math.min(scaleX, scaleY, 1); // Don't upscale

      targetWidth = Math.floor(image.width * scale);
      targetHeight = Math.floor(image.height * scale);
    } else {
      targetWidth = maxWidth || image.width;
      targetHeight = maxHeight || image.height;
    }

    // Use temp canvas for resizing
    this._tempCanvas.width = targetWidth;
    this._tempCanvas.height = targetHeight;

    // Use high-quality image smoothing
    this._tempContext.imageSmoothingEnabled = true;
    this._tempContext.imageSmoothingQuality = 'high';

    // Draw resized image
    this._tempContext.drawImage(image, 0, 0, targetWidth, targetHeight);

    // Convert to image
    const resizedImage = new Image();
    resizedImage.src = this._tempCanvas.toDataURL('image/png');

    if (this._debug) {
      console.log('[ImagePreprocessor] Image resized:', {
        original: `${image.width}x${image.height}`,
        resized: `${targetWidth}x${targetHeight}`
      });
    }

    return resizedImage;
  }

  /**
   * Converts ImageData to grayscale
   * @param {ImageData} imageData - Source image data
   * @returns {ImageData} Grayscale image data
   */
  convertToGrayscale(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < data.length; i += 4) {
      // Using luminance formula: 0.299*R + 0.587*G + 0.114*B
      const gray = Math.round(
        0.299 * data[i] +     // Red
        0.587 * data[i + 1] + // Green
        0.114 * data[i + 2]   // Blue
      );
      
      data[i] = gray;     // Red
      data[i + 1] = gray; // Green
      data[i + 2] = gray; // Blue
      // Alpha channel (i + 3) remains unchanged
    }

    const result = new ImageData(data, imageData.width, imageData.height);

    if (this._debug) {
      console.log('[ImagePreprocessor] Converted to grayscale');
    }

    return result;
  }

  /**
   * Adjusts brightness and contrast of ImageData
   * @param {ImageData} imageData - Source image data
   * @param {number} brightness - Brightness adjustment (-100 to 100)
   * @param {number} contrast - Contrast adjustment (-100 to 100)
   * @returns {ImageData} Adjusted image data
   */
  adjustBrightnessContrast(imageData, brightness = 0, contrast = 0) {
    const data = new Uint8ClampedArray(imageData.data);
    
    // Convert brightness and contrast to usable values
    const brightnessFactor = brightness * 2.55; // Map -100..100 to -255..255
    const contrastFactor = (contrast + 100) / 100; // Map -100..100 to 0..2

    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Contrast adjustment (pivot around 128)
      r = ((r - 128) * contrastFactor) + 128;
      g = ((g - 128) * contrastFactor) + 128;
      b = ((b - 128) * contrastFactor) + 128;

      // Brightness adjustment
      r += brightnessFactor;
      g += brightnessFactor;
      b += brightnessFactor;

      // Clamp values to 0-255
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
      // Alpha channel remains unchanged
    }

    const result = new ImageData(data, imageData.width, imageData.height);

    if (this._debug) {
      console.log('[ImagePreprocessor] Applied brightness/contrast:', {
        brightness,
        contrast
      });
    }

    return result;
  }

  /**
   * Scales image to match canvas dimensions from state
   * @param {HTMLImageElement} image - Source image
   * @returns {HTMLImageElement} Scaled image
   */
  scaleToCanvasDimensions(image) {
    const canvasWidth = state.get('canvas.width');
    const canvasHeight = state.get('canvas.height');
    const resolution = state.get('processing.resolution') || 'medium';

    // Get resolution settings
    const resSettings = CONSTANTS.RESOLUTION_SETTINGS[resolution];
    const maxDimension = resSettings.maxDimension;

    // Calculate target dimensions maintaining aspect ratio
    const scale = Math.min(
      maxDimension / Math.max(image.width, image.height),
      1 // Don't upscale beyond original
    );

    const targetWidth = Math.floor(image.width * scale);
    const targetHeight = Math.floor(image.height * scale);

    return this.resizeImage(image, {
      maxWidth: targetWidth,
      maxHeight: targetHeight,
      maintainAspectRatio: true
    });
  }

  /**
   * Extracts color channels from ImageData
   * @param {ImageData} imageData - Source image data
   * @returns {Object} Object with r, g, b, a channel arrays
   */
  extractChannels(imageData) {
    const pixels = imageData.width * imageData.height;
    const r = new Uint8ClampedArray(pixels);
    const g = new Uint8ClampedArray(pixels);
    const b = new Uint8ClampedArray(pixels);
    const a = new Uint8ClampedArray(pixels);

    for (let i = 0; i < pixels; i++) {
      const idx = i * 4;
      r[i] = imageData.data[idx];
      g[i] = imageData.data[idx + 1];
      b[i] = imageData.data[idx + 2];
      a[i] = imageData.data[idx + 3];
    }

    return { r, g, b, a, width: imageData.width, height: imageData.height };
  }

  /**
   * Normalizes pixel values to 0-1 range
   * @param {Uint8ClampedArray} data - Pixel data (0-255)
   * @returns {Float32Array} Normalized data (0-1)
   */
  normalizePixelData(data) {
    const normalized = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      normalized[i] = data[i] / 255;
    }
    return normalized;
  }

  /**
   * Gets ImageData from an image
   * @param {HTMLImageElement} image - Source image
   * @returns {ImageData}
   * @private
   */
  _getImageData(image) {
    this._tempCanvas.width = image.width;
    this._tempCanvas.height = image.height;
    this._tempContext.drawImage(image, 0, 0);
    return this._tempContext.getImageData(0, 0, image.width, image.height);
  }

  /**
   * Converts ImageData to HTMLImageElement
   * @param {ImageData} imageData - Source image data
   * @returns {HTMLImageElement}
   * @private
   */
  _imageDataToImage(imageData) {
    this._tempCanvas.width = imageData.width;
    this._tempCanvas.height = imageData.height;
    this._tempContext.putImageData(imageData, 0, 0);

    const image = new Image();
    image.src = this._tempCanvas.toDataURL('image/png');
    return image;
  }

  /**
   * Applies a convolution kernel to ImageData (for filters like blur, sharpen, edge detection)
   * @param {ImageData} imageData - Source image data
   * @param {number[][]} kernel - Convolution kernel matrix
   * @param {number} divisor - Kernel divisor (default: sum of kernel values or 1)
   * @returns {ImageData} Filtered image data
   */
  applyConvolution(imageData, kernel, divisor = null) {
    const width = imageData.width;
    const height = imageData.height;
    const src = imageData.data;
    const dst = new Uint8ClampedArray(src.length);

    // Calculate divisor if not provided
    if (divisor === null) {
      divisor = kernel.flat().reduce((sum, val) => sum + val, 0) || 1;
    }

    const kernelSize = kernel.length;
    const half = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0;

        // Apply kernel
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const px = Math.min(width - 1, Math.max(0, x + kx - half));
            const py = Math.min(height - 1, Math.max(0, y + ky - half));
            const idx = (py * width + px) * 4;
            const weight = kernel[ky][kx];

            r += src[idx] * weight;
            g += src[idx + 1] * weight;
            b += src[idx + 2] * weight;
          }
        }

        const dstIdx = (y * width + x) * 4;
        dst[dstIdx] = Math.max(0, Math.min(255, r / divisor));
        dst[dstIdx + 1] = Math.max(0, Math.min(255, g / divisor));
        dst[dstIdx + 2] = Math.max(0, Math.min(255, b / divisor));
        dst[dstIdx + 3] = src[dstIdx + 3]; // Copy alpha
      }
    }

    return new ImageData(dst, width, height);
  }

  /**
   * Enables or disables debug logging
   * @param {boolean} enabled - Debug mode flag
   */
  setDebug(enabled) {
    this._debug = enabled;
    console.log(`[ImagePreprocessor] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create and export singleton instance
const imagePreprocessor = new ImagePreprocessor();

export default imagePreprocessor;