/**
 * K-Means Clustering Module
 * Implements K-Means++ initialization and clustering for finding dominant colors
 * @module algorithms/kMeans
 */

import EventBus from '../core/eventBus.js';
import { rgbDistance, clampRgb } from './colorUtils.js';

/**
 * K-Means clustering class for color quantization
 */
export class KMeans {
    constructor() {
        this.eventBus = EventBus.getInstance();
    }

    /**
     * Find dominant colors in an image using K-Means clustering
     * @param {ImageData} imageData - Image data to analyze
     * @param {number} numColors - Number of dominant colors to find
     * @param {number} maxIterations - Maximum iterations (default: 50)
     * @param {number} sampleRate - Sample rate for large images (default: 1, no sampling)
     * @returns {Promise<Array>} Array of dominant colors [{r, g, b}, ...]
     */
    async findDominantColors(imageData, numColors, maxIterations = 50, sampleRate = 1) {
        return new Promise((resolve, reject) => {
            try {
                // Extract color samples from image
                const samples = this._extractColorSamples(imageData, sampleRate);
                
                if (samples.length === 0) {
                    reject(new Error('No color samples extracted from image'));
                    return;
                }

                // Handle edge case: fewer unique colors than requested
                if (samples.length <= numColors) {
                    this.eventBus.emit('CLUSTERING_COMPLETE', { 
                        colors: samples.slice(0, numColors),
                        iterations: 0
                    });
                    resolve(samples.slice(0, numColors));
                    return;
                }

                // Initialize centroids using K-Means++
                let centroids = this._kMeansPlusPlus(samples, numColors);
                
                let iteration = 0;
                let hasConverged = false;
                const convergenceThreshold = 1.0; // Stop if centroids move less than this

                // Main K-Means iteration
                while (iteration < maxIterations && !hasConverged) {
                    // Assign samples to nearest centroid
                    const clusters = this._assignToClusters(samples, centroids);
                    
                    // Calculate new centroids
                    const newCentroids = this._calculateCentroids(clusters);
                    
                    // Check for convergence
                    hasConverged = this._checkConvergence(centroids, newCentroids, convergenceThreshold);
                    
                    centroids = newCentroids;
                    iteration++;
                    
                    // Emit progress update every 5 iterations
                    if (iteration % 5 === 0) {
                        this.eventBus.emit('CLUSTERING_PROGRESS', {
                            iteration,
                            maxIterations,
                            progress: (iteration / maxIterations) * 100
                        });
                    }
                }

                // Clamp final centroids to valid RGB range
                const finalColors = centroids.map(clampRgb);

                this.eventBus.emit('CLUSTERING_COMPLETE', {
                    colors: finalColors,
                    iterations: iteration,
                    converged: hasConverged
                });

                resolve(finalColors);
            } catch (error) {
                this.eventBus.emit('CLUSTERING_ERROR', { error: error.message });
                reject(error);
            }
        });
    }

    /**
     * Quantize image to use only colors from the provided palette
     * Maps each pixel to the nearest palette color
     * @param {ImageData} imageData - Original image data
     * @param {Array} palette - Array of colors to use [{r, g, b}, ...]
     * @returns {ImageData} Quantized image data
     */
    quantizeImage(imageData, palette) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const quantized = new ImageData(width, height);
        const quantizedData = quantized.data;

        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
            const pixel = {
                r: data[i],
                g: data[i + 1],
                b: data[i + 2]
            };
            const alpha = data[i + 3];

            // Find nearest palette color
            const nearestColor = this._findNearestColor(pixel, palette);

            // Set quantized pixel
            quantizedData[i] = nearestColor.r;
            quantizedData[i + 1] = nearestColor.g;
            quantizedData[i + 2] = nearestColor.b;
            quantizedData[i + 3] = alpha;
        }

        return quantized;
    }

    /**
     * Extract color samples from image data
     * @private
     * @param {ImageData} imageData - Image data
     * @param {number} sampleRate - Sample every Nth pixel (1 = all pixels)
     * @returns {Array} Array of color samples [{r, g, b}, ...]
     */
    _extractColorSamples(imageData, sampleRate = 1) {
        const samples = [];
        const data = imageData.data;
        const step = Math.max(1, Math.floor(sampleRate));

        for (let i = 0; i < data.length; i += 4 * step) {
            const alpha = data[i + 3];
            
            // Skip fully transparent pixels
            if (alpha === 0) continue;

            samples.push({
                r: data[i],
                g: data[i + 1],
                b: data[i + 2]
            });
        }

        return samples;
    }

    /**
     * Initialize centroids using K-Means++ algorithm
     * Provides better initial centroids than random selection
     * @private
     * @param {Array} samples - Color samples
     * @param {number} k - Number of centroids
     * @returns {Array} Initial centroids
     */
    _kMeansPlusPlus(samples, k) {
        const centroids = [];
        
        // Choose first centroid randomly
        const firstIndex = Math.floor(Math.random() * samples.length);
        centroids.push({ ...samples[firstIndex] });

        // Choose remaining centroids
        for (let i = 1; i < k; i++) {
            // Calculate distance from each sample to nearest centroid
            const distances = samples.map(sample => {
                let minDist = Infinity;
                for (const centroid of centroids) {
                    const dist = rgbDistance(sample, centroid);
                    minDist = Math.min(minDist, dist);
                }
                return minDist * minDist; // Square for weighted probability
            });

            // Choose next centroid with probability proportional to distance
            const totalDistance = distances.reduce((sum, d) => sum + d, 0);
            let random = Math.random() * totalDistance;
            
            for (let j = 0; j < samples.length; j++) {
                random -= distances[j];
                if (random <= 0) {
                    centroids.push({ ...samples[j] });
                    break;
                }
            }
        }

        return centroids;
    }

    /**
     * Assign each sample to the nearest centroid
     * @private
     * @param {Array} samples - Color samples
     * @param {Array} centroids - Current centroids
     * @returns {Array} Array of clusters (arrays of samples)
     */
    _assignToClusters(samples, centroids) {
        const clusters = Array.from({ length: centroids.length }, () => []);

        for (const sample of samples) {
            let minDist = Infinity;
            let nearestCluster = 0;

            for (let i = 0; i < centroids.length; i++) {
                const dist = rgbDistance(sample, centroids[i]);
                if (dist < minDist) {
                    minDist = dist;
                    nearestCluster = i;
                }
            }

            clusters[nearestCluster].push(sample);
        }

        return clusters;
    }

    /**
     * Calculate new centroids as the mean of each cluster
     * @private
     * @param {Array} clusters - Array of clusters
     * @returns {Array} New centroids
     */
    _calculateCentroids(clusters) {
        return clusters.map(cluster => {
            if (cluster.length === 0) {
                // Handle empty cluster - return random color
                return {
                    r: Math.floor(Math.random() * 256),
                    g: Math.floor(Math.random() * 256),
                    b: Math.floor(Math.random() * 256)
                };
            }

            const sum = cluster.reduce((acc, color) => ({
                r: acc.r + color.r,
                g: acc.g + color.g,
                b: acc.b + color.b
            }), { r: 0, g: 0, b: 0 });

            return {
                r: sum.r / cluster.length,
                g: sum.g / cluster.length,
                b: sum.b / cluster.length
            };
        });
    }

    /**
     * Check if centroids have converged
     * @private
     * @param {Array} oldCentroids - Previous centroids
     * @param {Array} newCentroids - New centroids
     * @param {number} threshold - Convergence threshold
     * @returns {boolean} True if converged
     */
    _checkConvergence(oldCentroids, newCentroids, threshold) {
        for (let i = 0; i < oldCentroids.length; i++) {
            const distance = rgbDistance(oldCentroids[i], newCentroids[i]);
            if (distance > threshold) {
                return false;
            }
        }
        return true;
    }

    /**
     * Find nearest color in palette to given pixel
     * @private
     * @param {Object} pixel - Pixel color {r, g, b}
     * @param {Array} palette - Color palette
     * @returns {Object} Nearest color
     */
    _findNearestColor(pixel, palette) {
        let minDist = Infinity;
        let nearest = palette[0];

        for (const color of palette) {
            const dist = rgbDistance(pixel, color);
            if (dist < minDist) {
                minDist = dist;
                nearest = color;
            }
        }

        return nearest;
    }
}

// Export singleton instance
export default new KMeans();