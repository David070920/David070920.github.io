/**
 * Edge Detection Module
 * Implements Canny edge detection algorithm for sketch mode
 * @module algorithms/edgeDetection
 */

import EventBus from '../core/eventBus.js';
import { rgbToGray } from './colorUtils.js';

/**
 * Edge Detection class implementing Canny algorithm
 */
export class EdgeDetection {
    constructor() {
        this.eventBus = EventBus.getInstance();
    }

    /**
     * Detect edges in an image using Canny edge detection
     * @param {ImageData} imageData - Input image data
     * @param {number} lowThreshold - Low threshold for hysteresis (0-255, default: 50)
     * @param {number} highThreshold - High threshold for hysteresis (0-255, default: 100)
     * @param {number} kernelSize - Gaussian kernel size (default: 5)
     * @param {number} sigma - Gaussian sigma (default: 1.4)
     * @returns {Promise<ImageData>} Edge map as binary image (white edges on black)
     */
    async detectEdges(imageData, lowThreshold = 50, highThreshold = 100, kernelSize = 5, sigma = 1.4) {
        return new Promise((resolve, reject) => {
            try {
                const width = imageData.width;
                const height = imageData.height;

                this.eventBus.emit('EDGE_DETECTION_PROGRESS', { step: 'grayscale', progress: 10 });
                
                // Step 1: Convert to grayscale
                const grayData = this._toGrayscale(imageData);

                this.eventBus.emit('EDGE_DETECTION_PROGRESS', { step: 'blur', progress: 25 });
                
                // Step 2: Apply Gaussian blur to reduce noise
                const blurred = this._gaussianBlur(grayData, width, height, kernelSize, sigma);

                this.eventBus.emit('EDGE_DETECTION_PROGRESS', { step: 'gradient', progress: 50 });
                
                // Step 3: Calculate gradients using Sobel operator
                const { magnitude, direction } = this._sobelFilter(blurred, width, height);

                this.eventBus.emit('EDGE_DETECTION_PROGRESS', { step: 'suppression', progress: 70 });
                
                // Step 4: Non-maximum suppression
                const suppressed = this._nonMaximumSuppression(magnitude, direction, width, height);

                this.eventBus.emit('EDGE_DETECTION_PROGRESS', { step: 'hysteresis', progress: 85 });
                
                // Step 5: Double threshold and edge tracking by hysteresis
                const edges = this._hysteresis(suppressed, width, height, lowThreshold, highThreshold);

                // Convert edge map to ImageData
                const edgeImageData = this._edgeMapToImageData(edges, width, height);

                this.eventBus.emit('EDGE_DETECTION_COMPLETE', {
                    width,
                    height,
                    lowThreshold,
                    highThreshold
                });

                resolve(edgeImageData);
            } catch (error) {
                this.eventBus.emit('EDGE_DETECTION_ERROR', { error: error.message });
                reject(error);
            }
        });
    }

    /**
     * Apply Sobel filter to detect gradients
     * @param {ImageData} imageData - Input image data
     * @returns {Object} Object with magnitude and direction ImageData
     */
    sobelFilter(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const grayData = this._toGrayscale(imageData);
        return this._sobelFilter(grayData, width, height);
    }

    /**
     * Convert image to grayscale
     * @private
     * @param {ImageData} imageData - Input image data
     * @returns {Uint8ClampedArray} Grayscale pixel array
     */
    _toGrayscale(imageData) {
        const data = imageData.data;
        const grayData = new Uint8ClampedArray(data.length / 4);

        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            grayData[j] = rgbToGray(data[i], data[i + 1], data[i + 2]);
        }

        return grayData;
    }

    /**
     * Apply Gaussian blur
     * @private
     * @param {Uint8ClampedArray} grayData - Grayscale data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} kernelSize - Kernel size (must be odd)
     * @param {number} sigma - Standard deviation
     * @returns {Uint8ClampedArray} Blurred data
     */
    _gaussianBlur(grayData, width, height, kernelSize, sigma) {
        // Create Gaussian kernel
        const kernel = this._createGaussianKernel(kernelSize, sigma);
        const radius = Math.floor(kernelSize / 2);
        const blurred = new Uint8ClampedArray(grayData.length);

        // Apply convolution
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sum = 0;
                let weightSum = 0;

                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const px = Math.min(Math.max(x + kx, 0), width - 1);
                        const py = Math.min(Math.max(y + ky, 0), height - 1);
                        const weight = kernel[ky + radius][kx + radius];
                        
                        sum += grayData[py * width + px] * weight;
                        weightSum += weight;
                    }
                }

                blurred[y * width + x] = sum / weightSum;
            }
        }

        return blurred;
    }

    /**
     * Create Gaussian kernel
     * @private
     * @param {number} size - Kernel size
     * @param {number} sigma - Standard deviation
     * @returns {Array} 2D kernel array
     */
    _createGaussianKernel(size, sigma) {
        const kernel = [];
        const radius = Math.floor(size / 2);
        const sigma2 = 2 * sigma * sigma;
        const coefficient = 1 / (Math.PI * sigma2);

        for (let y = -radius; y <= radius; y++) {
            const row = [];
            for (let x = -radius; x <= radius; x++) {
                const exponent = -(x * x + y * y) / sigma2;
                row.push(coefficient * Math.exp(exponent));
            }
            kernel.push(row);
        }

        return kernel;
    }

    /**
     * Apply Sobel operator to calculate gradients
     * @private
     * @param {Uint8ClampedArray} grayData - Grayscale data
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Object} Magnitude and direction arrays
     */
    _sobelFilter(grayData, width, height) {
        const magnitude = new Float32Array(width * height);
        const direction = new Float32Array(width * height);

        // Sobel kernels
        const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
        const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0;
                let gy = 0;

                // Apply Sobel kernels
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixel = grayData[(y + ky) * width + (x + kx)];
                        gx += pixel * sobelX[ky + 1][kx + 1];
                        gy += pixel * sobelY[ky + 1][kx + 1];
                    }
                }

                const idx = y * width + x;
                magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
                direction[idx] = Math.atan2(gy, gx);
            }
        }

        return { magnitude, direction };
    }

    /**
     * Non-maximum suppression to thin edges
     * @private
     * @param {Float32Array} magnitude - Gradient magnitude
     * @param {Float32Array} direction - Gradient direction
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Float32Array} Suppressed magnitude
     */
    _nonMaximumSuppression(magnitude, direction, width, height) {
        const suppressed = new Float32Array(width * height);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                const angle = direction[idx] * (180 / Math.PI);
                const mag = magnitude[idx];

                // Normalize angle to 0-180
                let normalizedAngle = angle < 0 ? angle + 180 : angle;

                // Determine neighbors to compare based on gradient direction
                let neighbor1, neighbor2;

                if ((normalizedAngle >= 0 && normalizedAngle < 22.5) || 
                    (normalizedAngle >= 157.5 && normalizedAngle <= 180)) {
                    // Horizontal edge (0°)
                    neighbor1 = magnitude[idx - 1];
                    neighbor2 = magnitude[idx + 1];
                } else if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) {
                    // Diagonal edge (45°)
                    neighbor1 = magnitude[(y - 1) * width + (x + 1)];
                    neighbor2 = magnitude[(y + 1) * width + (x - 1)];
                } else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) {
                    // Vertical edge (90°)
                    neighbor1 = magnitude[(y - 1) * width + x];
                    neighbor2 = magnitude[(y + 1) * width + x];
                } else {
                    // Diagonal edge (135°)
                    neighbor1 = magnitude[(y - 1) * width + (x - 1)];
                    neighbor2 = magnitude[(y + 1) * width + (x + 1)];
                }

                // Keep only local maxima
                if (mag >= neighbor1 && mag >= neighbor2) {
                    suppressed[idx] = mag;
                } else {
                    suppressed[idx] = 0;
                }
            }
        }

        return suppressed;
    }

    /**
     * Double threshold and hysteresis edge tracking
     * @private
     * @param {Float32Array} magnitude - Suppressed magnitude
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} lowThreshold - Low threshold
     * @param {number} highThreshold - High threshold
     * @returns {Uint8ClampedArray} Binary edge map
     */
    _hysteresis(magnitude, width, height, lowThreshold, highThreshold) {
        const edges = new Uint8ClampedArray(width * height);
        const STRONG = 255;
        const WEAK = 128;

        // Apply double threshold
        for (let i = 0; i < magnitude.length; i++) {
            if (magnitude[i] >= highThreshold) {
                edges[i] = STRONG;
            } else if (magnitude[i] >= lowThreshold) {
                edges[i] = WEAK;
            } else {
                edges[i] = 0;
            }
        }

        // Edge tracking by hysteresis - connect weak edges to strong edges
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                if (edges[idx] === WEAK) {
                    // Check if any neighbor is a strong edge
                    const hasStrongNeighbor = 
                        edges[(y - 1) * width + (x - 1)] === STRONG ||
                        edges[(y - 1) * width + x] === STRONG ||
                        edges[(y - 1) * width + (x + 1)] === STRONG ||
                        edges[y * width + (x - 1)] === STRONG ||
                        edges[y * width + (x + 1)] === STRONG ||
                        edges[(y + 1) * width + (x - 1)] === STRONG ||
                        edges[(y + 1) * width + x] === STRONG ||
                        edges[(y + 1) * width + (x + 1)] === STRONG;

                    edges[idx] = hasStrongNeighbor ? STRONG : 0;
                }
            }
        }

        // Convert weak edges that weren't promoted to 0
        for (let i = 0; i < edges.length; i++) {
            if (edges[i] === WEAK) {
                edges[i] = 0;
            }
        }

        return edges;
    }

    /**
     * Convert edge map array to ImageData
     * @private
     * @param {Uint8ClampedArray} edges - Binary edge map
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {ImageData} Edge map as ImageData
     */
    _edgeMapToImageData(edges, width, height) {
        const imageData = new ImageData(width, height);
        const data = imageData.data;

        for (let i = 0, j = 0; i < edges.length; i++, j += 4) {
            const value = edges[i];
            data[j] = value;     // R
            data[j + 1] = value; // G
            data[j + 2] = value; // B
            data[j + 3] = 255;   // A
        }

        return imageData;
    }

    /**
     * Invert edge map (black edges on white background)
     * @param {ImageData} edgeData - Edge map ImageData
     * @returns {ImageData} Inverted edge map
     */
    invertEdges(edgeData) {
        const inverted = new ImageData(edgeData.width, edgeData.height);
        const data = edgeData.data;
        const invertedData = inverted.data;

        for (let i = 0; i < data.length; i += 4) {
            const value = 255 - data[i];
            invertedData[i] = value;
            invertedData[i + 1] = value;
            invertedData[i + 2] = value;
            invertedData[i + 3] = data[i + 3];
        }

        return inverted;
    }
}

// Export singleton instance
export default new EdgeDetection();