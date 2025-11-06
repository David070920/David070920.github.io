/**
 * Image Loader Module
 * Handles image file upload, validation, and loading
 * @module processing/imageLoader
 */

import eventBus, { Events } from '../core/eventBus.js';
import { CONSTANTS } from '../core/config.js';

/**
 * ImageLoader class for handling image file operations
 */
class ImageLoader {
  constructor() {
    /**
     * Currently loaded image
     * @type {HTMLImageElement|null}
     * @private
     */
    this._currentImage = null;

    /**
     * Debug mode flag
     * @type {boolean}
     * @private
     */
    this._debug = true;
  }

  /**
   * Loads an image file from a File object
   * @param {File} file - Image file to load
   * @returns {Promise<{image: HTMLImageElement, imageData: ImageData, file: File}>}
   */
  async loadImage(file) {
    try {
      if (this._debug) {
        console.log('[ImageLoader] Loading image:', file.name);
      }

      // Validate file
      this._validateFile(file);

      // Create Image object
      const image = await this._createImageFromFile(file);
      
      // Store current image
      this._currentImage = image;

      // Extract ImageData
      const imageData = this._extractImageData(image);

      // Emit success event
      eventBus.emit(Events.IMAGE_UPLOADED, {
        image,
        imageData,
        file: {
          name: file.name,
          type: file.type,
          size: file.size
        }
      });

      if (this._debug) {
        console.log('[ImageLoader] Image loaded successfully:', {
          width: image.width,
          height: image.height,
          size: file.size
        });
      }

      return { image, imageData, file };

    } catch (error) {
      console.error('[ImageLoader] Error loading image:', error);
      eventBus.emit(Events.PROCESSING_ERROR, {
        type: 'image_load',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handles file input change event
   * @param {Event} event - File input change event
   * @returns {Promise<Object>} Load result
   */
  async handleFileInput(event) {
    const file = event.target.files[0];
    if (!file) {
      throw new Error('No file selected');
    }
    return this.loadImage(file);
  }

  /**
   * Handles drag and drop file upload
   * @param {DragEvent} event - Drag event
   * @returns {Promise<Object>} Load result
   */
  async handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files[0];
    if (!file) {
      throw new Error('No file dropped');
    }

    return this.loadImage(file);
  }

  /**
   * Gets the currently loaded image
   * @returns {HTMLImageElement|null}
   */
  getCurrentImage() {
    return this._currentImage;
  }

  /**
   * Clears the currently loaded image
   */
  clear() {
    this._currentImage = null;
    if (this._debug) {
      console.log('[ImageLoader] Cleared current image');
    }
  }

  /**
   * Validates image file
   * @param {File} file - File to validate
   * @throws {Error} If file is invalid
   * @private
   */
  _validateFile(file) {
    // Check file type
    if (!CONSTANTS.SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
      throw new Error(
        `Unsupported file type: ${file.type}. ` +
        `Supported formats: ${CONSTANTS.SUPPORTED_IMAGE_FORMATS.join(', ')}`
      );
    }

    // Check file size
    if (file.size > CONSTANTS.MAX_IMAGE_SIZE) {
      const maxSizeMB = CONSTANTS.MAX_IMAGE_SIZE / (1024 * 1024);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(
        `File too large: ${fileSizeMB}MB. Maximum size: ${maxSizeMB}MB`
      );
    }

    if (this._debug) {
      console.log('[ImageLoader] File validation passed:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`
      });
    }
  }

  /**
   * Creates an Image object from a File
   * @param {File} file - File to load
   * @returns {Promise<HTMLImageElement>}
   * @private
   */
  _createImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const image = new Image();

      reader.onload = (e) => {
        image.onload = () => {
          resolve(image);
        };

        image.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        image.src = e.target.result;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Extracts ImageData from an Image object
   * @param {HTMLImageElement} image - Image to extract data from
   * @returns {ImageData}
   * @private
   */
  _extractImageData(image) {
    // Create temporary canvas
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    return ctx.getImageData(0, 0, image.width, image.height);
  }

  /**
   * Enables or disables debug logging
   * @param {boolean} enabled - Debug mode flag
   */
  setDebug(enabled) {
    this._debug = enabled;
    console.log(`[ImageLoader] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Converts SVG to high-resolution bitmap (rasterization)
   * @param {string} svgString - SVG content as string
   * @param {number} width - Target width
   * @param {number} height - Target height
   * @returns {Promise<HTMLImageElement>}
   */
  async rasterizeSVG(svgString, width, height) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        
        // Create canvas to rasterize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);

        // Convert back to image
        const rasterImage = new Image();
        rasterImage.onload = () => resolve(rasterImage);
        rasterImage.onerror = () => reject(new Error('Failed to rasterize SVG'));
        rasterImage.src = canvas.toDataURL('image/png');
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG'));
      };

      image.src = url;
    });
  }
}

// Create and export singleton instance
const imageLoader = new ImageLoader();

export default imageLoader;