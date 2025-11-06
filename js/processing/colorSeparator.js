/**
 * Color Separator Module
 * Separates images into distinct color layers based on a color palette
 * @module processing/colorSeparator
 */

import eventBus from '../core/eventBus.js';
import { rgbDistance, areColorsSimilar } from '../algorithms/colorUtils.js';

/**
 * Color Separator class for creating color-based image layers
 */
export class ColorSeparator {
    constructor() {
        this.eventBus = eventBus;
    }

    /**
     * Separate image into N color layers based on palette
     * Each layer contains only pixels of one color from the palette
     * @param {ImageData} imageData - Original image data
     * @param {Array} palette - Color palette [{r, g, b}, ...]
     * @param {number} tolerance - Color matching tolerance (default: 30)
     * @returns {Promise<Array>} Array of layer objects {color, imageData, pixelCount}
     */
    async separateColors(imageData, palette, tolerance = 30) {
        return new Promise((resolve, reject) => {
            try {
                const width = imageData.width;
                const height = imageData.height;
                const layers = [];

                // Create a layer for each color in the palette
                for (let i = 0; i < palette.length; i++) {
                    const color = palette[i];
                    
                    this.eventBus.emit('COLOR_SEPARATION_PROGRESS', {
                        currentLayer: i + 1,
                        totalLayers: palette.length,
                        progress: ((i + 1) / palette.length) * 100
                    });

                    // Create color mask and layer
                    const layerData = this.createColorMask(imageData, color, tolerance);
                    
                    // Count non-transparent pixels
                    const pixelCount = this._countOpaquePixels(layerData);

                    layers.push({
                        color: { ...color },
                        imageData: layerData,
                        pixelCount,
                        index: i
                    });
                }

                // Sort layers by pixel count (descending) for processing efficiency
                layers.sort((a, b) => b.pixelCount - a.pixelCount);

                this.eventBus.emit('COLOR_SEPARATION_COMPLETE', {
                    layers: layers.map(l => ({
                        color: l.color,
                        pixelCount: l.pixelCount,
                        index: l.index
                    })),
                    totalLayers: layers.length
                });

                resolve(layers);
            } catch (error) {
                this.eventBus.emit('COLOR_SEPARATION_ERROR', { error: error.message });
                reject(error);
            }
        });
    }

    /**
     * Create a binary mask for a specific color
     * Pixels matching the target color become opaque, others transparent
     * @param {ImageData} imageData - Original image data
     * @param {Object} targetColor - Target color {r, g, b}
     * @param {number} tolerance - Color matching tolerance (default: 30)
     * @returns {ImageData} Binary mask image data
     */
    createColorMask(imageData, targetColor, tolerance = 30) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const mask = new ImageData(width, height);
        const maskData = mask.data;

        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
            const pixel = {
                r: data[i],
                g: data[i + 1],
                b: data[i + 2]
            };
            const alpha = data[i + 3];

            // Check if pixel matches target color within tolerance
            const distance = rgbDistance(pixel, targetColor);
            const isMatch = distance <= tolerance && alpha > 0;

            if (isMatch) {
                // Keep the color and make it opaque
                maskData[i] = targetColor.r;
                maskData[i + 1] = targetColor.g;
                maskData[i + 2] = targetColor.b;
                maskData[i + 3] = 255;
            } else {
                // Make transparent
                maskData[i] = 0;
                maskData[i + 1] = 0;
                maskData[i + 2] = 0;
                maskData[i + 3] = 0;
            }
        }

        return mask;
    }

    /**
     * Create a mask that shows which pixels belong to which color layer
     * Useful for visualization and debugging
     * @param {ImageData} imageData - Original image data
     * @param {Array} palette - Color palette
     * @param {number} tolerance - Color matching tolerance
     * @returns {ImageData} Color assignment map
     */
    createColorAssignmentMap(imageData, palette, tolerance = 30) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const assignmentMap = new ImageData(width, height);
        const mapData = assignmentMap.data;

        for (let i = 0; i < data.length; i += 4) {
            const pixel = {
                r: data[i],
                g: data[i + 1],
                b: data[i + 2]
            };
            const alpha = data[i + 3];

            if (alpha === 0) {
                // Transparent pixel
                mapData[i] = 0;
                mapData[i + 1] = 0;
                mapData[i + 2] = 0;
                mapData[i + 3] = 0;
                continue;
            }

            // Find closest color in palette
            let minDistance = Infinity;
            let closestColor = palette[0];

            for (const color of palette) {
                const distance = rgbDistance(pixel, color);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestColor = color;
                }
            }

            // Assign the closest palette color
            mapData[i] = closestColor.r;
            mapData[i + 1] = closestColor.g;
            mapData[i + 2] = closestColor.b;
            mapData[i + 3] = 255;
        }

        return assignmentMap;
    }

    /**
     * Merge multiple color layers back into a single image
     * @param {Array} layers - Array of layer objects {color, imageData}
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {ImageData} Merged image data
     */
    mergeLayers(layers, width, height) {
        const merged = new ImageData(width, height);
        const mergedData = merged.data;

        // Process each layer
        for (const layer of layers) {
            const layerData = layer.imageData.data;

            for (let i = 0; i < layerData.length; i += 4) {
                const alpha = layerData[i + 3];

                // Only merge opaque pixels
                if (alpha > 0) {
                    mergedData[i] = layerData[i];
                    mergedData[i + 1] = layerData[i + 1];
                    mergedData[i + 2] = layerData[i + 2];
                    mergedData[i + 3] = alpha;
                }
            }
        }

        return merged;
    }

    /**
     * Get statistics about color separation
     * @param {Array} layers - Array of layer objects
     * @returns {Object} Statistics object
     */
    getLayerStatistics(layers) {
        const totalPixels = layers.reduce((sum, layer) => sum + layer.pixelCount, 0);
        
        return {
            totalLayers: layers.length,
            totalPixels,
            layers: layers.map(layer => ({
                color: layer.color,
                pixelCount: layer.pixelCount,
                percentage: totalPixels > 0 ? (layer.pixelCount / totalPixels * 100).toFixed(2) : 0
            }))
        };
    }

    /**
     * Apply morphological operations to clean up layer masks
     * @param {ImageData} maskData - Binary mask data
     * @param {string} operation - 'erode' or 'dilate'
     * @param {number} iterations - Number of iterations
     * @returns {ImageData} Processed mask
     */
    morphologicalOperation(maskData, operation = 'erode', iterations = 1) {
        const width = maskData.width;
        const height = maskData.height;
        let current = maskData;

        for (let iter = 0; iter < iterations; iter++) {
            const result = new ImageData(width, height);
            const currentData = current.data;
            const resultData = result.data;

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;
                    
                    // Check 3x3 neighborhood
                    const neighbors = [
                        currentData[((y - 1) * width + (x - 1)) * 4 + 3], // top-left
                        currentData[((y - 1) * width + x) * 4 + 3],       // top
                        currentData[((y - 1) * width + (x + 1)) * 4 + 3], // top-right
                        currentData[(y * width + (x - 1)) * 4 + 3],       // left
                        currentData[idx + 3],                              // center
                        currentData[(y * width + (x + 1)) * 4 + 3],       // right
                        currentData[((y + 1) * width + (x - 1)) * 4 + 3], // bottom-left
                        currentData[((y + 1) * width + x) * 4 + 3],       // bottom
                        currentData[((y + 1) * width + (x + 1)) * 4 + 3]  // bottom-right
                    ];

                    let newAlpha;
                    if (operation === 'erode') {
                        // Erode: keep pixel only if all neighbors are opaque
                        newAlpha = neighbors.every(n => n > 0) ? 255 : 0;
                    } else {
                        // Dilate: make pixel opaque if any neighbor is opaque
                        newAlpha = neighbors.some(n => n > 0) ? 255 : 0;
                    }

                    resultData[idx] = currentData[idx];
                    resultData[idx + 1] = currentData[idx + 1];
                    resultData[idx + 2] = currentData[idx + 2];
                    resultData[idx + 3] = newAlpha;
                }
            }

            current = result;
        }

        return current;
    }

    /**
     * Count opaque pixels in image data
     * @private
     * @param {ImageData} imageData - Image data
     * @returns {number} Count of opaque pixels
     */
    _countOpaquePixels(imageData) {
        const data = imageData.data;
        let count = 0;

        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) {
                count++;
            }
        }

        return count;
    }
}

// Export singleton instance
export default new ColorSeparator();