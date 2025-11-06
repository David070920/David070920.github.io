/**
 * PreviewGenerator - High-level interface for generating simulation previews
 * Integrates renderer, simulator, and animation controller
 */

import { EventBus } from '../core/eventBus.js';
import { SimulationRenderer } from './simulationRenderer.js';
import { GCodeSimulator } from './gcodeSimulator.js';
import { AnimationController } from './animationController.js';
import { scaleToPixels } from '../gcode/coordinateTransformer.js';

/**
 * Preview generation events
 */
export const PreviewEvents = {
    GENERATION_STARTED: 'PREVIEW_GENERATION_STARTED',
    GENERATION_PROGRESS: 'PREVIEW_GENERATION_PROGRESS',
    GENERATION_COMPLETE: 'PREVIEW_GENERATION_COMPLETE',
    GENERATION_ERROR: 'PREVIEW_GENERATION_ERROR'
};

/**
 * PreviewGenerator class
 * High-level interface for generating previews
 */
export class PreviewGenerator {
    /**
     * Create a new PreviewGenerator
     * @param {HTMLCanvasElement} canvas - Canvas element for rendering
     */
    constructor(canvas) {
        if (!canvas) {
            throw new Error('PreviewGenerator requires a canvas element');
        }

        this.canvas = canvas;
        this.renderer = new SimulationRenderer(canvas);
        this.simulator = null;
        this.animationController = null;
        this.eventBus = EventBus.getInstance();
    }

    /**
     * Generate instant preview without animation
     * Renders all color layers immediately
     * 
     * @param {Array<Object>} colorLayers - Array of color layers with paths
     * @param {Object} config - Configuration object
     * @param {Object} config.anchors - Anchor positions
     * @param {Object} config.canvas - Canvas dimensions {width, height} in cm
     * @param {Object} config.image - Image dimensions {width, height} in pixels
     * @param {number} config.nozzleSize - Nozzle size in mm
     * @param {string} config.nozzleShape - Nozzle shape ('circular' or 'flat')
     * @returns {Promise<void>}
     */
    async generateInstantPreview(colorLayers, config) {
        try {
            this.eventBus.emit(PreviewEvents.GENERATION_STARTED, {
                type: 'instant',
                layerCount: colorLayers.length
            });

            // Clear canvas
            this.renderer.clear();

            // Render each color layer
            for (let i = 0; i < colorLayers.length; i++) {
                const layer = colorLayers[i];
                await this.renderLayer(layer, config);

                // Emit progress
                const progress = (i + 1) / colorLayers.length;
                this.eventBus.emit(PreviewEvents.GENERATION_PROGRESS, {
                    progress: progress,
                    currentLayer: i + 1,
                    totalLayers: colorLayers.length
                });
            }

            this.eventBus.emit(PreviewEvents.GENERATION_COMPLETE, {
                type: 'instant',
                layerCount: colorLayers.length
            });
        } catch (error) {
            this.eventBus.emit(PreviewEvents.GENERATION_ERROR, {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate animated preview from G-code
     * Simulates robot execution with animation
     * 
     * @param {string} gcode - G-code string to simulate
     * @param {Object} config - Configuration object
     * @param {Object} config.anchors - Anchor positions
     * @param {Object} config.canvas - Canvas dimensions {width, height} in cm
     * @param {Object} config.image - Image dimensions {width, height} in pixels
     * @param {number} config.nozzleSize - Nozzle size in mm
     * @param {string} config.nozzleShape - Nozzle shape ('circular' or 'flat')
     * @param {string} speed - Animation speed: 'instant', 'fast', 'normal', 'slow'
     * @returns {Promise<AnimationController>} Animation controller for playback control
     */
    async generateAnimatedPreview(gcode, config, speed = 'normal') {
        try {
            this.eventBus.emit(PreviewEvents.GENERATION_STARTED, {
                type: 'animated',
                speed: speed
            });

            // Create simulator
            this.simulator = new GCodeSimulator(this.renderer, config);
            
            // Create animation controller
            this.animationController = new AnimationController(this.simulator);

            // Start simulation
            await this.simulator.simulate(gcode, speed);

            this.eventBus.emit(PreviewEvents.GENERATION_COMPLETE, {
                type: 'animated',
                speed: speed
            });

            return this.animationController;
        } catch (error) {
            this.eventBus.emit(PreviewEvents.GENERATION_ERROR, {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate preview for a single color layer
     * 
     * @param {Object} layer - Color layer object
     * @param {string} layer.color - Hex color string
     * @param {Array<Array<Object>>} layer.paths - Array of path arrays
     * @param {Object} config - Configuration object
     * @returns {Promise<void>}
     */
    async generateLayerPreview(layer, config) {
        try {
            this.eventBus.emit(PreviewEvents.GENERATION_STARTED, {
                type: 'layer',
                color: layer.color
            });

            // Clear canvas
            this.renderer.clear();

            // Render the layer
            await this.renderLayer(layer, config);

            this.eventBus.emit(PreviewEvents.GENERATION_COMPLETE, {
                type: 'layer',
                color: layer.color
            });
        } catch (error) {
            this.eventBus.emit(PreviewEvents.GENERATION_ERROR, {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Render a single color layer
     * @private
     * @param {Object} layer - Color layer object
     * @param {Object} config - Configuration object
     */
    async renderLayer(layer, config) {
        if (!layer || !layer.paths || layer.paths.length === 0) {
            return;
        }

        const nozzleSize = this.getNozzleSizeInPixels(config);
        const nozzleShape = config.nozzleShape || 'circular';
        const color = layer.color || '#000000';

        // Render each path
        for (const path of layer.paths) {
            if (!path || path.length === 0) continue;

            // Convert path points to pixel coordinates
            const pixelPath = path.map(point => {
                return this.physicalToPixels(point, config);
            }).filter(p => p !== null);

            if (pixelPath.length < 2) continue;

            // Render as polyline
            this.renderer.renderPolyline(pixelPath, color, nozzleSize, nozzleShape);
        }
    }

    /**
     * Convert physical coordinates (mm) to pixel coordinates
     * @private
     * @param {Object} point - Point with {x, y} in mm
     * @param {Object} config - Configuration object
     * @returns {Object|null} Pixel coordinates {x, y} or null
     */
    physicalToPixels(point, config) {
        if (!point || point.x === undefined || point.y === undefined) {
            return null;
        }

        try {
            const pixels = scaleToPixels(
                point.x,
                point.y,
                config.image.width,
                config.image.height,
                config.canvas.width * 10, // Convert cm to mm
                config.canvas.height * 10
            );
            return pixels;
        } catch (error) {
            console.warn('Coordinate transformation error:', error);
            return null;
        }
    }

    /**
     * Get nozzle size in pixels
     * @private
     * @param {Object} config - Configuration object
     * @returns {number} Nozzle size in pixels
     */
    getNozzleSizeInPixels(config) {
        const nozzleMM = config.nozzleSize || 5;
        const canvasMM = config.canvas.width * 10;
        const canvasPixels = config.image.width;
        const pixelsPerMM = canvasPixels / canvasMM;
        return nozzleMM * pixelsPerMM;
    }

    /**
     * Clear the preview canvas
     */
    clear() {
        this.renderer.clear();
    }

    /**
     * Set canvas background color
     * @param {string} color - CSS color string
     */
    setBackground(color) {
        this.renderer.setBackground(color);
    }

    /**
     * Resize the preview canvas
     * @param {number} width - New width in pixels
     * @param {number} height - New height in pixels
     */
    resize(width, height) {
        this.renderer.resize(width, height);
    }

    /**
     * Export preview as data URL
     * @param {string} type - Image MIME type (default: 'image/png')
     * @param {number} quality - Image quality for lossy formats (0-1)
     * @returns {string} Data URL
     */
    export(type = 'image/png', quality = 1.0) {
        return this.renderer.toDataURL(type, quality);
    }

    /**
     * Export preview as Blob
     * @param {string} type - Image MIME type (default: 'image/png')
     * @param {number} quality - Image quality for lossy formats (0-1)
     * @returns {Promise<Blob>} Promise resolving to Blob
     */
    async exportBlob(type = 'image/png', quality = 1.0) {
        return this.renderer.toBlob(type, quality);
    }

    /**
     * Get the renderer instance
     * @returns {SimulationRenderer} Renderer instance
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * Get the current simulator instance
     * @returns {GCodeSimulator|null} Simulator instance or null
     */
    getSimulator() {
        return this.simulator;
    }

    /**
     * Get the current animation controller
     * @returns {AnimationController|null} Animation controller or null
     */
    getAnimationController() {
        return this.animationController;
    }

    /**
     * Stop any running animation
     */
    stopAnimation() {
        if (this.animationController) {
            this.animationController.stop();
        }
        if (this.simulator) {
            this.simulator.stop();
        }
    }

    /**
     * Pause any running animation
     */
    pauseAnimation() {
        if (this.animationController) {
            this.animationController.pause();
        }
        if (this.simulator) {
            this.simulator.pause();
        }
    }

    /**
     * Resume paused animation
     */
    resumeAnimation() {
        if (this.animationController) {
            this.animationController.play();
        }
        if (this.simulator) {
            this.simulator.resume();
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopAnimation();
        
        if (this.animationController) {
            this.animationController.destroy();
            this.animationController = null;
        }
        
        this.simulator = null;
        this.renderer = null;
        this.canvas = null;
    }

    /**
     * Create a configuration object from state
     * @param {Object} state - Application state
     * @returns {Object} Configuration object for preview generation
     */
    static createConfigFromState(state) {
        const canvas = state.canvas || {};
        const image = state.processedImage || state.originalImage || {};
        const robot = state.robot || {};

        return {
            anchors: state.anchors || {
                topLeft: { x: 0, y: 0 },
                topRight: { x: canvas.width * 10 || 2000, y: 0 },
                bottomCenter: { 
                    x: (canvas.width * 10 || 2000) / 2, 
                    y: canvas.height * 10 || 1500 
                }
            },
            canvas: {
                width: canvas.width || 200, // cm
                height: canvas.height || 150 // cm
            },
            image: {
                width: image.width || 800,
                height: image.height || 600
            },
            nozzleSize: robot.nozzleSize || 5, // mm
            nozzleShape: robot.nozzleShape || 'circular'
        };
    }

    /**
     * Generate preview from color separation data
     * @param {Array<Object>} colorLayers - Color layers from color separator
     * @param {Object} state - Application state
     * @returns {Promise<void>}
     */
    static async generateFromColorLayers(canvas, colorLayers, state) {
        const generator = new PreviewGenerator(canvas);
        const config = PreviewGenerator.createConfigFromState(state);
        await generator.generateInstantPreview(colorLayers, config);
        return generator;
    }

    /**
     * Generate preview from G-code
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {string} gcode - G-code string
     * @param {Object} state - Application state
     * @param {string} speed - Animation speed
     * @returns {Promise<PreviewGenerator>}
     */
    static async generateFromGCode(canvas, gcode, state, speed = 'normal') {
        const generator = new PreviewGenerator(canvas);
        const config = PreviewGenerator.createConfigFromState(state);
        await generator.generateAnimatedPreview(gcode, config, speed);
        return generator;
    }
}

export default PreviewGenerator;