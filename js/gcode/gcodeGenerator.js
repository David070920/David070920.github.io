/**
 * G-code Generator Module
 * Main orchestrator for G-code generation from processed images
 * @module gcode/gcodeGenerator
 */

import eventBus, { Events } from '../core/eventBus.js';
import * as builder from './gcodeBuilder.js';
import * as transformer from './coordinateTransformer.js';
import { RefillTracker } from './refillTracker.js';
import { solveTSP } from '../algorithms/tspSolver.js';
import { planHorizontalScanlines, optimizeScanlineOrder, planBidirectionalScanlines } from '../algorithms/scanlinePlanner.js';
import { traceEdges, optimizeContourOrder } from '../algorithms/edgeTracer.js';

/**
 * GCodeGenerator class
 * Orchestrates G-code generation from color layers or edge maps
 */
export class GCodeGenerator {
    constructor() {
        this._debug = false;
        this._currentPosition = null; // Track current position for path planning
    }

    /**
     * Generate complete G-code from processed image data
     * 
     * @param {Object} config - Configuration object
     * @param {Object} config.canvas - Canvas configuration
     * @param {Object} config.robot - Robot configuration
     * @param {Object} config.paint - Paint configuration
     * @param {Object} config.nozzle - Nozzle configuration
     * @param {Array} [colorLayers] - Color layers for pointillism/strokes modes
     * @param {ImageData} [edgeMap] - Edge map for spray/sketch mode
     * @returns {Promise<string>} Generated G-code
     */
    async generate(config, colorLayers = null, edgeMap = null) {
        try {
            // Emit start event
            eventBus.emit(Events.GCODE_GENERATION_STARTED, { config });

            const lines = [];
            
            // Generate header
            lines.push(...this.generateHeader(config));
            lines.push('');

            // Initialize refill tracker
            const refillTracker = new RefillTracker();
            refillTracker.reset(config.robot.paintCapacity);

            // Create anchor configuration
            const anchors = transformer.createAnchorConfig(config.canvas);
            const canvasWidthMm = config.canvas.width * 10; // cm to mm
            const canvasHeightMm = config.canvas.height * 10; // cm to mm

            if (colorLayers && colorLayers.length > 0) {
                // Generate G-code for color-based painting (pointillism/strokes)
                const layerGcode = await this.generateColorLayersGcode(
                    colorLayers,
                    config,
                    anchors,
                    canvasWidthMm,
                    canvasHeightMm,
                    refillTracker
                );
                lines.push(...layerGcode);
            } else if (edgeMap) {
                // Generate G-code for edge-based painting (spray/sketch)
                const edgeGcode = await this.generateEdgeMapGcode(
                    edgeMap,
                    config,
                    anchors,
                    canvasWidthMm,
                    canvasHeightMm,
                    refillTracker
                );
                lines.push(...edgeGcode);
            } else {
                throw new Error('No image data provided for G-code generation');
            }

            lines.push('');
            
            // Generate footer
            lines.push(...this.generateFooter());

            // Join all lines
            const gcode = lines.join('\n');

            // Emit complete event
            eventBus.emit(Events.GCODE_GENERATION_COMPLETE, {
                success: true,
                lineCount: lines.length,
                refillCount: refillTracker.getRefillCount()
            });

            return gcode;

        } catch (error) {
            console.error('[GCodeGenerator] Generation failed:', error);
            eventBus.emit(Events.ERROR_OCCURRED, {
                type: 'gcode_generation',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Generate G-code header with initialization commands
     * 
     * @param {Object} config - Configuration object
     * @returns {string[]} Array of G-code lines
     */
    generateHeader(config) {
        const timestamp = new Date().toISOString();
        const lines = [];

        lines.push(builder.commentBlock('MURALBOT G-CODE', [
            `Generated: ${timestamp}`,
            `Canvas: ${config.canvas.width}cm x ${config.canvas.height}cm`,
            `Painting Mode: ${config.paint.paintingMode}`,
            `Paint Capacity: ${config.robot.paintCapacity}ml`,
            `Move Speed: ${config.robot.moveSpeed}mm/min`,
            `Paint Speed: ${config.robot.paintSpeed}mm/min`
        ]));

        lines.push('');
        lines.push(builder.separator('INITIALIZATION'));
        lines.push(builder.G21());  // Set units to millimeters
        lines.push(builder.G90());  // Absolute positioning
        lines.push(builder.G28());  // Home all axes
        lines.push(builder.M5());   // Ensure nozzle off
        lines.push(builder.comment('Ready to paint'));

        return lines;
    }

    /**
     * Generate G-code footer with safe end sequence
     * 
     * @returns {string[]} Array of G-code lines
     */
    generateFooter() {
        const lines = [];

        lines.push('');
        lines.push(builder.separator('END SEQUENCE'));
        lines.push(builder.M5());   // Ensure nozzle off
        lines.push(builder.G28());  // Return to home
        lines.push(builder.M84());  // Disable motors
        lines.push(builder.comment('End of G-Code'));

        return lines;
    }

    /**
     * Generate G-code for color layers (pointillism/strokes modes)
     * 
     * @param {Array} colorLayers - Array of color layer objects
     * @param {Object} config - Configuration object
     * @param {Object} anchors - Anchor configuration
     * @param {number} canvasWidthMm - Canvas width in mm
     * @param {number} canvasHeightMm - Canvas height in mm
     * @param {RefillTracker} refillTracker - Refill tracker instance
     * @returns {Promise<string[]>} Array of G-code lines
     */
    async generateColorLayersGcode(colorLayers, config, anchors, canvasWidthMm, canvasHeightMm, refillTracker) {
        const lines = [];
        const paintingMode = config.paint.paintingMode;

        for (let i = 0; i < colorLayers.length; i++) {
            const layer = colorLayers[i];
            
            // Emit progress
            const progress = ((i + 1) / colorLayers.length) * 100;
            eventBus.emit('GCODE_GENERATION_PROGRESS', {
                progress,
                currentLayer: i + 1,
                totalLayers: colorLayers.length
            });

            // Generate layer G-code
            const layerGcode = await this.generateLayerGcode(
                layer,
                i,
                config,
                anchors,
                canvasWidthMm,
                canvasHeightMm,
                refillTracker
            );

            lines.push(...layerGcode);
            lines.push('');
        }

        return lines;
    }

    /**
     * Generate G-code for a single color layer
     * 
     * @param {Object} layer - Color layer object
     * @param {number} layerIndex - Layer index
     * @param {Object} config - Configuration object
     * @param {Object} anchors - Anchor configuration
     * @param {number} canvasWidthMm - Canvas width in mm
     * @param {number} canvasHeightMm - Canvas height in mm
     * @param {RefillTracker} refillTracker - Refill tracker instance
     * @returns {Promise<string[]>} Array of G-code lines
     */
    async generateLayerGcode(layer, layerIndex, config, anchors, canvasWidthMm, canvasHeightMm, refillTracker) {
        const lines = [];
        
        // DEBUG: Log what we receive
        console.log('🔍 [GCodeGenerator] generateLayerGcode called with layer:', {
            hasColor: !!layer.color,
            hasImageData: !!layer.imageData,
            hasPixelCount: !!layer.pixelCount,
            hasPixels: !!layer.pixels,
            layerKeys: Object.keys(layer)
        });
        
        const { color, imageData, pixelCount } = layer;
        const paintingMode = config.paint.paintingMode;

        // Extract pixel coordinates from ImageData
        console.log('🔍 [GCodeGenerator] Extracting pixels from ImageData...');
        const pixels = this._extractPixelCoordinates(imageData);
        const imageWidth = imageData.width;
        const imageHeight = imageData.height;
        
        console.log(`✅ [GCodeGenerator] Extracted ${pixels.length} pixels from ${imageWidth}x${imageHeight} image`);

        // Layer header
        lines.push(builder.separator(`COLOR LAYER ${layerIndex + 1}`));
        lines.push(builder.comment(`Color: RGB(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`));
        lines.push(builder.comment(`Pixels: ${pixels.length}`));
        
        // Tool/can change if not first layer
        if (layerIndex > 0) {
            lines.push(...this.generateColorChangeSequence(config, anchors));
        }

        // Generate painting commands based on mode
        if (paintingMode === 'pointillism') {
            lines.push(...await this.generatePointillismGcode(
                pixels,
                imageWidth,
                imageHeight,
                config,
                anchors,
                canvasWidthMm,
                canvasHeightMm,
                refillTracker
            ));
        } else if (paintingMode === 'strokes') {
            lines.push(...await this.generateStrokesGcode(
                pixels,
                imageWidth,
                imageHeight,
                config,
                anchors,
                canvasWidthMm,
                canvasHeightMm,
                refillTracker
            ));
        }

        return lines;
    }

    /**
     * Generate G-code for pointillism painting mode
     * 
     * @param {Array} pixels - Array of pixel coordinates [{x, y}]
     * @param {number} imageWidth - Image width in pixels
     * @param {number} imageHeight - Image height in pixels
     * @param {Object} config - Configuration object
     * @param {Object} anchors - Anchor configuration
     * @param {number} canvasWidthMm - Canvas width in mm
     * @param {number} canvasHeightMm - Canvas height in mm
     * @param {RefillTracker} refillTracker - Refill tracker instance
     * @returns {Promise<string[]>} Array of G-code lines
     */
    async generatePointillismGcode(pixels, imageWidth, imageHeight, config, anchors, canvasWidthMm, canvasHeightMm, refillTracker) {
        const lines = [];
        const { minDotSize, maxDotSize, dotDensity } = config.paint.pointillism;
        const moveSpeed = config.robot.moveSpeed;
        const dwellTime = 0.1; // 100ms spray time per dot

        console.log(`🔍 [GCodeGenerator] Pointillism mode - original pixels: ${pixels.length}`);
        
        // Downsample pixels based on dot density to prevent stack overflow
        // dotDensity is a percentage (0-100), we use it to calculate grid spacing
        const sampledPixels = this._downsamplePixels(pixels, imageWidth, imageHeight, dotDensity);
        
        console.log(`✅ [GCodeGenerator] Downsampled to ${sampledPixels.length} dots (density: ${dotDensity}%)`);
        
        lines.push(builder.comment(`Painting ${sampledPixels.length} dots (${dotDensity}% density)`));

        // SAFETY: Skip TSP for very large sets (>10000 pixels)
        if (sampledPixels.length > 10000) {
            console.warn(`⚠️ [GCodeGenerator] Too many dots (${sampledPixels.length}), using simple grid order instead of TSP`);
            lines.push(builder.comment('Using grid order (too many dots for TSP optimization)'));
            
            // Paint in simple grid order
            for (let i = 0; i < sampledPixels.length; i++) {
                const pixel = sampledPixels[i];
                await this._paintSingleDot(pixel, imageWidth, imageHeight, config, anchors, canvasWidthMm, canvasHeightMm, refillTracker, minDotSize, maxDotSize, moveSpeed, dwellTime, lines);
                
                if (i % 100 === 0) {
                    eventBus.emit('GCODE_GENERATION_PROGRESS', {
                        progress: (i / sampledPixels.length) * 100,
                        message: `Painting dot ${i + 1}/${sampledPixels.length}`
                    });
                }
            }
            
            return lines;
        }

        // Determine starting point for TSP
        let startIndex = 0;
        if (this._currentPosition && pixels.length > 0) {
            // Find closest pixel to current position
            let minDist = Infinity;
            for (let i = 0; i < pixels.length; i++) {
                const dx = pixels[i].x - this._currentPosition.x;
                const dy = pixels[i].y - this._currentPosition.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    startIndex = i;
                }
            }
        }

        // Optimize dot order using TSP solver
        lines.push(builder.comment('Optimizing dot order using TSP...'));
        const tour = solveTSP(sampledPixels, {
            startIndex,
            optimize: sampledPixels.length < 500 // Use 2-opt for smaller sets
        });
        lines.push(builder.comment(`Tour optimized: ${tour.length} dots`));

        // Paint dots in optimized order
        for (let i = 0; i < tour.length; i++) {
            const pixelIndex = tour[i];
            const pixel = sampledPixels[pixelIndex];
            
            await this._paintSingleDot(pixel, imageWidth, imageHeight, config, anchors, canvasWidthMm, canvasHeightMm, refillTracker, minDotSize, maxDotSize, moveSpeed, dwellTime, lines);

            // Emit progress periodically
            if (i % 100 === 0) {
                eventBus.emit('GCODE_GENERATION_PROGRESS', {
                    progress: (i / tour.length) * 100,
                    message: `Painting dot ${i + 1}/${tour.length}`
                });
            }
        }

        return lines;
    }

    /**
     * Generate G-code for strokes painting mode
     * 
     * @param {Array} pixels - Array of pixel coordinates
     * @param {number} imageWidth - Image width in pixels
     * @param {number} imageHeight - Image height in pixels
     * @param {Object} config - Configuration object
     * @param {Object} anchors - Anchor configuration
     * @param {number} canvasWidthMm - Canvas width in mm
     * @param {number} canvasHeightMm - Canvas height in mm
     * @param {RefillTracker} refillTracker - Refill tracker instance
     * @returns {Promise<string[]>} Array of G-code lines
     */
    async generateStrokesGcode(pixels, imageWidth, imageHeight, config, anchors, canvasWidthMm, canvasHeightMm, refillTracker) {
        const lines = [];
        const { strokeLength, strokeWidth } = config.paint.strokes;
        const moveSpeed = config.robot.moveSpeed;
        const paintSpeed = config.robot.paintSpeed;

        lines.push(builder.comment(`Painting strokes for ${pixels.length} pixels`));

        // Create image data structure for scanline planning
        const imageData = {
            data: new Uint8ClampedArray(imageWidth * imageHeight * 4),
            width: imageWidth,
            height: imageHeight
        };

        // Mark pixels in image data (white = paint, black = skip)
        for (const pixel of pixels) {
            const idx = (pixel.y * imageWidth + pixel.x) * 4;
            imageData.data[idx] = 255;     // R
            imageData.data[idx + 1] = 255; // G
            imageData.data[idx + 2] = 255; // B
            imageData.data[idx + 3] = 255; // A
        }

        // Plan scanline paths using bidirectional scanning for efficiency
        lines.push(builder.comment('Planning scanline paths...'));
        const segments = planBidirectionalScanlines(imageData, [255, 255, 255], 10, 'horizontal');
        lines.push(builder.comment(`Found ${segments.length} stroke segments`));

        // Determine starting position
        const startPos = this._currentPosition || { x: 0, y: 0 };

        // Optimize segment order to minimize travel
        lines.push(builder.comment('Optimizing stroke order...'));
        const orderedSegments = optimizeScanlineOrder(segments, startPos);
        lines.push(builder.comment(`Optimized ${orderedSegments.length} segments`));

        // Paint each segment
        for (let i = 0; i < orderedSegments.length; i++) {
            const segment = orderedSegments[i];

            // Determine start and end based on reversed flag
            const startX = segment.reversed ? segment.endX : segment.startX;
            const startY = segment.reversed ? segment.endY : segment.startY;
            const endX = segment.reversed ? segment.startX : segment.endX;
            const endY = segment.reversed ? segment.startY : segment.endY;

            // Scale to physical coordinates
            const physicalStart = transformer.scaleToPhysical(
                startX, startY, imageWidth, imageHeight,
                canvasWidthMm, canvasHeightMm
            );
            const physicalEnd = transformer.scaleToPhysical(
                endX, endY, imageWidth, imageHeight,
                canvasWidthMm, canvasHeightMm
            );

            // Transform to trilateration
            const coordsStart = transformer.cartesianToTrilateration(
                physicalStart.x, physicalStart.y, anchors
            );
            const coordsEnd = transformer.cartesianToTrilateration(
                physicalEnd.x, physicalEnd.y, anchors
            );

            // Track paint usage
            const needsRefill = refillTracker.addLineUsage(segment.length, strokeWidth);

            if (needsRefill) {
                lines.push(builder.comment('Paint low - refill needed'));
                lines.push(...this.generateRefillSequence(coordsStart, config, anchors));
                refillTracker.refill();
            }

            // Paint stroke segment
            lines.push(builder.G0(coordsStart.X, coordsStart.Y, coordsStart.Z, moveSpeed));
            lines.push(builder.M3()); // Start paint
            lines.push(builder.G1(coordsEnd.X, coordsEnd.Y, coordsEnd.Z, paintSpeed));
            lines.push(builder.M5()); // Stop paint

            // Update current position
            this._currentPosition = { x: endX, y: endY };

            // Emit progress periodically
            if (i % 50 === 0) {
                eventBus.emit('GCODE_GENERATION_PROGRESS', {
                    progress: (i / orderedSegments.length) * 100,
                    message: `Painting stroke ${i + 1}/${orderedSegments.length}`
                });
            }
        }

        return lines;
    }

    /**
     * Generate G-code for edge map (spray/sketch mode)
     * 
     * @param {ImageData} edgeMap - Edge detection result
     * @param {Object} config - Configuration object
     * @param {Object} anchors - Anchor configuration
     * @param {number} canvasWidthMm - Canvas width in mm
     * @param {number} canvasHeightMm - Canvas height in mm
     * @param {RefillTracker} refillTracker - Refill tracker instance
     * @returns {Promise<string[]>} Array of G-code lines
     */
    async generateEdgeMapGcode(edgeMap, config, anchors, canvasWidthMm, canvasHeightMm, refillTracker) {
        const lines = [];
        const moveSpeed = config.robot.moveSpeed;
        const paintSpeed = config.robot.paintSpeed;

        lines.push(builder.separator('EDGE TRACING'));
        lines.push(builder.comment(`Image: ${edgeMap.width}x${edgeMap.height}`));

        // Trace edges to find continuous polylines
        lines.push(builder.comment('Tracing edge contours...'));
        const polylines = traceEdges(edgeMap, {
            threshold: 128,
            minLength: 5,  // Minimum 5mm segments
            simplifyTolerance: 2  // Douglas-Peucker tolerance
        });
        lines.push(builder.comment(`Found ${polylines.length} contours`));

        if (polylines.length === 0) {
            lines.push(builder.comment('No edges found to trace'));
            return lines;
        }

        // Determine starting position
        const startPos = this._currentPosition || { x: 0, y: 0 };

        // Optimize contour order to minimize travel
        lines.push(builder.comment('Optimizing contour order...'));
        const orderedPolylines = optimizeContourOrder(polylines, startPos);
        lines.push(builder.comment(`Optimized ${orderedPolylines.length} contours`));

        // Paint each polyline
        for (let i = 0; i < orderedPolylines.length; i++) {
            const { points } = orderedPolylines[i];

            if (points.length < 2) continue;

            lines.push(builder.comment(`Contour ${i + 1}/${orderedPolylines.length}: ${points.length} points`));

            // Move to start of polyline
            const startPoint = points[0];
            const physicalStart = transformer.scaleToPhysical(
                startPoint.x, startPoint.y,
                edgeMap.width, edgeMap.height,
                canvasWidthMm, canvasHeightMm
            );
            const coordsStart = transformer.cartesianToTrilateration(
                physicalStart.x, physicalStart.y, anchors
            );

            lines.push(builder.G0(coordsStart.X, coordsStart.Y, coordsStart.Z, moveSpeed));
            lines.push(builder.M3()); // Start paint

            // Draw the polyline
            for (let j = 1; j < points.length; j++) {
                const point = points[j];
                const physical = transformer.scaleToPhysical(
                    point.x, point.y,
                    edgeMap.width, edgeMap.height,
                    canvasWidthMm, canvasHeightMm
                );
                const coords = transformer.cartesianToTrilateration(
                    physical.x, physical.y, anchors
                );

                lines.push(builder.G1(coords.X, coords.Y, coords.Z, paintSpeed));

                // Update current position
                this._currentPosition = { x: point.x, y: point.y };
            }

            lines.push(builder.M5()); // Stop paint

            // Calculate polyline length for paint tracking
            let polylineLength = 0;
            for (let j = 1; j < points.length; j++) {
                const dx = points[j].x - points[j - 1].x;
                const dy = points[j].y - points[j - 1].y;
                polylineLength += Math.sqrt(dx * dx + dy * dy);
            }

            // Track paint usage
            const needsRefill = refillTracker.addLineUsage(polylineLength, 1);

            if (needsRefill) {
                const lastPoint = points[points.length - 1];
                const physical = transformer.scaleToPhysical(
                    lastPoint.x, lastPoint.y,
                    edgeMap.width, edgeMap.height,
                    canvasWidthMm, canvasHeightMm
                );
                const coords = transformer.cartesianToTrilateration(
                    physical.x, physical.y, anchors
                );

                lines.push(builder.comment('Paint low - refill needed'));
                lines.push(...this.generateRefillSequence(coords, config, anchors));
                refillTracker.refill();
            }

            // Emit progress periodically
            if (i % 10 === 0) {
                eventBus.emit('GCODE_GENERATION_PROGRESS', {
                    progress: (i / orderedPolylines.length) * 100,
                    message: `Tracing contour ${i + 1}/${orderedPolylines.length}`
                });
            }
        }

        return lines;
    }

    /**
     * Generate refill sequence
     * Moves to refill position, pauses for refill, returns to painting
     * 
     * @param {Object} currentPos - Current position {X, Y, Z}
     * @param {Object} config - Configuration object
     * @param {Object} anchors - Anchor configuration
     * @returns {string[]} Array of G-code lines
     */
    generateRefillSequence(currentPos, config, anchors) {
        const lines = [];
        const { refillPosition } = config.robot;
        const moveSpeed = config.robot.moveSpeed;

        // Convert refill position from cm to mm
        const refillPosMm = {
            x: refillPosition.x * 10,
            y: refillPosition.y * 10
        };

        // Transform refill position to trilateration
        const refillCoords = transformer.cartesianToTrilateration(
            refillPosMm.x,
            refillPosMm.y,
            anchors
        );

        lines.push(builder.separator('REFILL SEQUENCE'));
        lines.push(builder.comment('Moving to refill position'));
        lines.push(builder.G0(refillCoords.X, refillCoords.Y, refillCoords.Z, moveSpeed));
        lines.push(builder.comment('Waiting for refill (30 seconds)'));
        lines.push(builder.G4(30));
        lines.push(builder.comment('Returning to painting'));
        lines.push(builder.G0(currentPos.X, currentPos.Y, currentPos.Z, moveSpeed));

        return lines;
    }

    /**
     * Generate color change sequence
     * Moves to safe position, pauses for can change
     * 
     * @param {Object} config - Configuration object
     * @param {Object} anchors - Anchor configuration
     * @returns {string[]} Array of G-code lines
     */
    generateColorChangeSequence(config, anchors) {
        const lines = [];
        const moveSpeed = config.robot.moveSpeed;

        // Use refill position for color change
        const { refillPosition } = config.robot;
        const changePosMm = {
            x: refillPosition.x * 10,
            y: refillPosition.y * 10
        };

        const changeCoords = transformer.cartesianToTrilateration(
            changePosMm.x,
            changePosMm.y,
            anchors
        );

        lines.push(builder.separator('COLOR CHANGE'));
        lines.push(builder.M6());
        lines.push(builder.comment('Moving to change position'));
        lines.push(builder.G0(changeCoords.X, changeCoords.Y, changeCoords.Z, moveSpeed));
        lines.push(builder.comment('Waiting for can change (60 seconds)'));
        lines.push(builder.G4(60));
        lines.push(builder.comment('Ready to continue'));

        return lines;
    }

    /**
     * Extract pixel coordinates from ImageData
     * Returns array of {x, y} coordinates for all opaque pixels
     *
     * @private
     * @param {ImageData} imageData - Image data to extract from
     * @returns {Array} Array of {x, y} coordinates
     */
    _extractPixelCoordinates(imageData) {
        const pixels = [];
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const alpha = data[idx + 3];
                
                // Include pixel if it's opaque
                if (alpha > 0) {
                    pixels.push({ x, y });
                }
            }
        }

        return pixels;
    }

    /**
     * Downsample pixels using grid-based sampling
     * @private
     * @param {Array} pixels - Array of pixel coordinates
     * @param {number} imageWidth - Image width
     * @param {number} imageHeight - Image height
     * @param {number} density - Density percentage (0-100)
     * @returns {Array} Downsampled pixel array
     */
    _downsamplePixels(pixels, imageWidth, imageHeight, density) {
        // Calculate grid spacing based on density
        // density 100% = every 1 pixel, 50% = every 2 pixels, 25% = every 4 pixels, etc.
        const spacing = Math.max(1, Math.floor(Math.sqrt(10000 / density)));
        
        console.log(`🔍 [GCodeGenerator] Downsampling with grid spacing: ${spacing}`);
        
        // Create a 2D grid to track which cells have pixels
        const grid = new Map();
        
        for (const pixel of pixels) {
            const gridX = Math.floor(pixel.x / spacing);
            const gridY = Math.floor(pixel.y / spacing);
            const key = `${gridX},${gridY}`;
            
            // Keep first pixel in each grid cell
            if (!grid.has(key)) {
                grid.set(key, pixel);
            }
        }
        
        return Array.from(grid.values());
    }

    /**
     * Paint a single dot
     * @private
     */
    async _paintSingleDot(pixel, imageWidth, imageHeight, config, anchors, canvasWidthMm, canvasHeightMm, refillTracker, minDotSize, maxDotSize, moveSpeed, dwellTime, lines) {
        // Scale pixel to physical coordinates
        const physical = transformer.scaleToPhysical(
            pixel.x,
            pixel.y,
            imageWidth,
            imageHeight,
            canvasWidthMm,
            canvasHeightMm
        );

        // Transform to trilateration coordinates
        const coords = transformer.cartesianToTrilateration(
            physical.x,
            physical.y,
            anchors
        );

        // Calculate dot size (random between min and max)
        const dotSize = minDotSize + Math.random() * (maxDotSize - minDotSize);

        // Add paint usage
        const needsRefill = refillTracker.addDotUsage(dotSize);

        // Check if refill needed
        if (needsRefill) {
            lines.push(builder.comment('Paint low - refill needed'));
            lines.push(...this.generateRefillSequence(coords, config, anchors));
            refillTracker.refill();
        }

        // Generate dot painting commands
        lines.push(...builder.paintDot(coords.X, coords.Y, coords.Z, dwellTime, moveSpeed));

        // Update current position
        this._currentPosition = { x: pixel.x, y: pixel.y };
    }

    /**
     * Enable or disable debug logging
     *
     * @param {boolean} enabled - Debug mode flag
     */
    setDebug(enabled) {
        this._debug = enabled;
        console.log(`[GCodeGenerator] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

/**
 * Create a new G-code generator instance
 * 
 * @returns {GCodeGenerator} New generator instance
 */
export function createGenerator() {
    return new GCodeGenerator();
}

// Export singleton instance
const generator = new GCodeGenerator();
export default generator;