/**
 * Time Calculator Module
 * Calculate detailed time breakdown for robot operations
 * @module estimation/timeCalculator
 */

import { calculateMoveDistance } from './distanceCalculator.js';

/**
 * Calculate time for a single move
 * 
 * @param {number} distance - Distance to travel (mm)
 * @param {number} feedRate - Feed rate (mm/min)
 * @returns {number} Time in seconds
 * 
 * @example
 * const time = calculateMoveTime(1000, 3000);
 * console.log(time); // 20 seconds
 */
export function calculateMoveTime(distance, feedRate) {
    if (feedRate <= 0) {
        return 0;
    }
    
    // Time = distance / speed
    // Convert from minutes to seconds
    const timeMinutes = distance / feedRate;
    return timeMinutes * 60;
}

/**
 * Calculate time to spray a dot or line segment
 * 
 * @param {Object} action - Painting action object
 * @param {string} action.type - 'dot' or 'line'
 * @param {number} [action.dwellTime] - Dwell time for dot (seconds)
 * @param {number} [action.distance] - Distance for line (mm)
 * @param {number} [action.paintSpeed] - Paint speed for line (mm/min)
 * @param {Object} config - Configuration object
 * @returns {number} Time in seconds
 * 
 * @example
 * // Dot spray time
 * const dotTime = calculateSprayTime(
 *   {type: 'dot', dwellTime: 0.1},
 *   {}
 * );
 * 
 * // Line spray time
 * const lineTime = calculateSprayTime(
 *   {type: 'line', distance: 50, paintSpeed: 1500},
 *   {}
 * );
 */
export function calculateSprayTime(action, config) {
    if (action.type === 'dot') {
        // For dots, use dwell time directly
        return action.dwellTime || 0.1;
    } else if (action.type === 'line') {
        // For lines, calculate based on distance and paint speed
        const distance = action.distance || 0;
        const paintSpeed = action.paintSpeed || config.robot?.paintSpeed || 1500;
        return calculateMoveTime(distance, paintSpeed);
    }
    
    return 0;
}

/**
 * Calculate time for one color layer
 * 
 * @param {Object} layer - Layer object with move and paint actions
 * @param {Array} layer.moves - Array of move objects
 * @param {Array} layer.actions - Array of paint actions
 * @param {Object} config - Configuration object
 * @returns {Object} Time breakdown {travel, painting, total}
 * 
 * @example
 * const layer = {
 *   moves: [{X: 1000, Y: 1500, Z: 800, painting: false}, ...],
 *   actions: [{type: 'dot', dwellTime: 0.1}, ...]
 * };
 * const times = calculateLayerTime(layer, config);
 * // Returns: {travel: 120, painting: 45, total: 165}
 */
export function calculateLayerTime(layer, config) {
    let travelTime = 0;
    let paintingTime = 0;
    
    const moveSpeed = config.robot?.moveSpeed || 3000;
    const paintSpeed = config.robot?.paintSpeed || 1500;
    
    // Calculate move times
    if (layer.moves && layer.moves.length > 0) {
        let lastPosition = null;
        
        for (const move of layer.moves) {
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
    }
    
    // Add spray action times
    if (layer.actions && layer.actions.length > 0) {
        for (const action of layer.actions) {
            paintingTime += calculateSprayTime(action, config);
        }
    }
    
    return {
        travel: travelTime,
        painting: paintingTime,
        total: travelTime + paintingTime
    };
}

/**
 * Format time in human-readable format
 * 
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (e.g., "1h 23m 45s")
 * 
 * @example
 * formatTime(125); // "2m 5s"
 * formatTime(3665); // "1h 1m 5s"
 * formatTime(45); // "45s"
 */
export function formatTime(seconds) {
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
}

export default {
    calculateMoveTime,
    calculateSprayTime,
    calculateLayerTime,
    formatTime
};