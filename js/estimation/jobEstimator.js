/**
 * Job Estimator Module
 * Main estimation calculator for time, paint, and distance
 * @module estimation/jobEstimator
 */

import eventBus from '../core/eventBus.js';
import { calculateMoveTime } from './timeCalculator.js';
import { calculateMoveDistance, calculateTotalDistance, formatDistance } from './distanceCalculator.js';
import { calculateDotPaint, calculateLinePaint, calculateLayerPaint, calculateRefills, formatPaintVolume } from './paintCalculator.js';
import { formatTime } from './timeCalculator.js';

/**
 * Events emitted by JobEstimator
 */
export const EstimationEvents = {
    ESTIMATION_STARTED: 'ESTIMATION_STARTED',
    ESTIMATION_COMPLETE: 'ESTIMATION_COMPLETE',
    ESTIMATION_ERROR: 'ESTIMATION_ERROR'
};

/**
 * JobEstimator class
 * Calculates job estimates from G-code or path data
 */
export class JobEstimator {
    /**
     * Create a new JobEstimator
     * 
     * @param {Object} config - Configuration object
     * @param {Object} config.robot - Robot configuration
     * @param {number} config.robot.moveSpeed - Move speed (mm/min)
     * @param {number} config.robot.paintSpeed - Paint speed (mm/min)
     * @param {number} config.robot.paintCapacity - Paint capacity (ml)
     */
    constructor(config) {
        this.config = config || {};
        this._debug = false;
    }

    /**
     * Parse G-code and calculate estimates
     * 
     * @param {string} gcode - G-code string
     * @returns {Object} Estimation results
     * 
     * @example
     * const estimator = new JobEstimator(config);
     * const estimates = estimator.estimateFromGCode(gcode);
     */
    estimateFromGCode(gcode) {
        try {
            eventBus.emit(EstimationEvents.ESTIMATION_STARTED, {
                source: 'gcode'
            });

            if (!gcode || gcode.trim().length === 0) {
                throw new Error('No G-code provided');
            }

            const lines = gcode.split('\n');
            const moves = [];
            const paintingActions = [];
            let currentPosition = { X: 0, Y: 0, Z: 0 };
            let sprayOn = false;
            let totalPauseTime = 0;
            let colorChanges = 0;
            let sprayStartPosition = null;

            // Parse G-code line by line
            for (const line of lines) {
                const trimmed = line.trim();
                
                // Skip comments and empty lines
                if (trimmed.startsWith(';') || trimmed.length === 0) {
                    // Count color changes from comments
                    if (trimmed.includes('COLOR LAYER') || trimmed.includes('REFILL SEQUENCE')) {
                        colorChanges++;
                    }
                    continue;
                }

                // Parse G0/G1 moves
                if (trimmed.startsWith('G0') || trimmed.startsWith('G1')) {
                    const coords = this._parseCoordinates(trimmed);
                    const newPosition = {
                        X: coords.X !== null ? coords.X : currentPosition.X,
                        Y: coords.Y !== null ? coords.Y : currentPosition.Y,
                        Z: coords.Z !== null ? coords.Z : currentPosition.Z
                    };

                    moves.push({
                        ...newPosition,
                        painting: sprayOn,
                        feedRate: coords.F
                    });

                    currentPosition = newPosition;
                }
                // Parse M3 (spray on)
                else if (trimmed.startsWith('M3')) {
                    sprayOn = true;
                    sprayStartPosition = { ...currentPosition };
                }
                // Parse M5 (spray off)
                else if (trimmed.startsWith('M5')) {
                    if (sprayOn && sprayStartPosition) {
                        // Record painting action
                        const distance = calculateMoveDistance(
                            sprayStartPosition.X, sprayStartPosition.Y, sprayStartPosition.Z,
                            currentPosition.X, currentPosition.Y, currentPosition.Z
                        );
                        
                        if (distance > 0.1) {
                            // Line painting
                            paintingActions.push({
                                type: 'line',
                                distance: distance
                            });
                        } else {
                            // Dot painting (assume previous G4 dwell time)
                            paintingActions.push({
                                type: 'dot',
                                dwellTime: 0.1 // Default dwell time
                            });
                        }
                    }
                    sprayOn = false;
                    sprayStartPosition = null;
                }
                // Parse G4 (dwell/pause)
                else if (trimmed.startsWith('G4')) {
                    const match = trimmed.match(/P([\d.]+)/);
                    if (match) {
                        const pauseTime = parseFloat(match[1]);
                        totalPauseTime += pauseTime;
                        
                        // Update last painting action with dwell time if it's a dot
                        if (paintingActions.length > 0 && paintingActions[paintingActions.length - 1].type === 'dot') {
                            paintingActions[paintingActions.length - 1].dwellTime = pauseTime;
                        }
                    }
                }
                // Parse M6 (tool/color change)
                else if (trimmed.startsWith('M6')) {
                    colorChanges++;
                }
            }

            // Calculate estimates
            const time = this.calculateTime(moves, this.config);
            const paint = this.calculatePaintConsumption(paintingActions, this.config);
            const distance = this.calculateTravelDistance(moves);

            const estimates = {
                time: {
                    travel: time.travel,
                    painting: time.painting,
                    pauses: totalPauseTime,
                    colorChanges: colorChanges * 30, // 30 seconds per color change
                    total: time.total + totalPauseTime + (colorChanges * 30),
                    formatted: formatTime(time.total + totalPauseTime + (colorChanges * 30))
                },
                paint: {
                    total: paint.total,
                    perColor: paint.perColor || [],
                    refills: calculateRefills(paint.total, this.config.robot?.paintCapacity || 50),
                    formatted: formatPaintVolume(paint.total)
                },
                distance: {
                    painting: distance.painting,
                    travel: distance.travel,
                    total: distance.total,
                    formatted: formatDistance(distance.total)
                },
                stats: {
                    moveCount: moves.length,
                    paintingActions: paintingActions.length,
                    colorChanges: colorChanges
                }
            };

            if (this._debug) {
                console.log('[JobEstimator] Estimates calculated from G-code:', estimates);
            }

            eventBus.emit(EstimationEvents.ESTIMATION_COMPLETE, {
                source: 'gcode',
                estimates
            });

            return estimates;

        } catch (error) {
            console.error('[JobEstimator] Error estimating from G-code:', error);
            eventBus.emit(EstimationEvents.ESTIMATION_ERROR, {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Estimate directly from path data
     * 
     * @param {Array} paths - Array of path objects
     * @param {Object} config - Configuration object
     * @returns {Object} Estimation results
     * 
     * @example
     * const paths = [
     *   {color: '#FF0000', points: [...], type: 'dots'},
     *   {color: '#00FF00', points: [...], type: 'lines'}
     * ];
     * const estimates = estimator.estimateFromPaths(paths, config);
     */
    estimateFromPaths(paths, config) {
        try {
            eventBus.emit(EstimationEvents.ESTIMATION_STARTED, {
                source: 'paths'
            });

            if (!paths || paths.length === 0) {
                throw new Error('No paths provided');
            }

            const mergedConfig = { ...this.config, ...config };
            let totalTime = 0;
            let totalPaint = 0;
            let totalDistance = 0;
            const perColorPaint = [];

            for (const path of paths) {
                // Calculate for each color layer
                const layerTime = this._estimateLayerTime(path, mergedConfig);
                const layerPaint = this._estimateLayerPaint(path, mergedConfig);
                const layerDistance = this._estimateLayerDistance(path);

                totalTime += layerTime;
                totalPaint += layerPaint;
                totalDistance += layerDistance;

                perColorPaint.push({
                    color: path.color,
                    volume: layerPaint,
                    formatted: formatPaintVolume(layerPaint)
                });
            }

            const estimates = {
                time: {
                    total: totalTime,
                    formatted: formatTime(totalTime)
                },
                paint: {
                    total: totalPaint,
                    perColor: perColorPaint,
                    refills: calculateRefills(totalPaint, mergedConfig.robot?.paintCapacity || 50),
                    formatted: formatPaintVolume(totalPaint)
                },
                distance: {
                    total: totalDistance,
                    formatted: formatDistance(totalDistance)
                },
                stats: {
                    layerCount: paths.length
                }
            };

            if (this._debug) {
                console.log('[JobEstimator] Estimates calculated from paths:', estimates);
            }

            eventBus.emit(EstimationEvents.ESTIMATION_COMPLETE, {
                source: 'paths',
                estimates
            });

            return estimates;

        } catch (error) {
            console.error('[JobEstimator] Error estimating from paths:', error);
            eventBus.emit(EstimationEvents.ESTIMATION_ERROR, {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Calculate total job time including moves, sprays, and pauses
     * 
     * @param {Array} moves - Array of move objects
     * @param {Object} config - Configuration object
     * @returns {Object} Time breakdown {travel, painting, total}
     */
    calculateTime(moves, config) {
        let travelTime = 0;
        let paintingTime = 0;
        let lastPosition = null;

        const moveSpeed = config.robot?.moveSpeed || 3000;
        const paintSpeed = config.robot?.paintSpeed || 1500;

        for (const move of moves) {
            if (lastPosition) {
                const distance = calculateMoveDistance(
                    lastPosition.X, lastPosition.Y, lastPosition.Z,
                    move.X, move.Y, move.Z
                );

                if (move.painting) {
                    paintingTime += calculateMoveTime(distance, paintSpeed);
                } else {
                    travelTime += calculateMoveTime(distance, moveSpeed);
                }
            }

            lastPosition = { X: move.X, Y: move.Y, Z: move.Z };
        }

        return {
            travel: travelTime,
            painting: paintingTime,
            total: travelTime + paintingTime
        };
    }

    /**
     * Calculate total paint consumption
     * 
     * @param {Array} paintingActions - Array of painting action objects
     * @param {Object} config - Configuration object
     * @returns {Object} Paint consumption {total, perColor}
     */
    calculatePaintConsumption(paintingActions, config) {
        let totalPaint = 0;

        for (const action of paintingActions) {
            if (action.type === 'dot') {
                const dotSize = config.paint?.pointillism?.maxDotSize || 3;
                totalPaint += calculateDotPaint(1, dotSize, 0.1);
            } else if (action.type === 'line') {
                const lineWidth = config.paint?.strokes?.strokeWidth || 2;
                totalPaint += calculateLinePaint(action.distance, lineWidth, 0.1);
            }
        }

        return {
            total: totalPaint,
            perColor: []
        };
    }

    /**
     * Calculate total travel distance
     * 
     * @param {Array} moves - Array of move objects
     * @returns {Object} Distance breakdown {painting, travel, total}
     */
    calculateTravelDistance(moves) {
        return calculateTotalDistance(moves);
    }

    /**
     * Parse coordinates from G-code line
     * @private
     */
    _parseCoordinates(line) {
        const coords = { X: null, Y: null, Z: null, F: null };
        
        const xMatch = line.match(/X([-\d.]+)/);
        const yMatch = line.match(/Y([-\d.]+)/);
        const zMatch = line.match(/Z([-\d.]+)/);
        const fMatch = line.match(/F([-\d.]+)/);
        
        if (xMatch) coords.X = parseFloat(xMatch[1]);
        if (yMatch) coords.Y = parseFloat(yMatch[1]);
        if (zMatch) coords.Z = parseFloat(zMatch[1]);
        if (fMatch) coords.F = parseFloat(fMatch[1]);
        
        return coords;
    }

    /**
     * Estimate time for a single layer
     * @private
     */
    _estimateLayerTime(layer, config) {
        // Simplified estimation based on point count
        const pointCount = layer.points?.length || layer.pixelCount || 0;
        const avgTimePerPoint = 0.2; // seconds
        return pointCount * avgTimePerPoint;
    }

    /**
     * Estimate paint for a single layer
     * @private
     */
    _estimateLayerPaint(layer, config) {
        return calculateLayerPaint(layer, config).volume;
    }

    /**
     * Estimate distance for a single layer
     * @private
     */
    _estimateLayerDistance(layer) {
        const pointCount = layer.points?.length || 0;
        const avgDistancePerMove = 50; // mm
        return pointCount * avgDistancePerMove;
    }

    /**
     * Enable or disable debug logging
     * 
     * @param {boolean} enabled - Debug mode flag
     */
    setDebug(enabled) {
        this._debug = enabled;
    }
}

export default {
    JobEstimator,
    EstimationEvents
};