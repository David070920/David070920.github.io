/**
 * Paint Calculator Module
 * Calculate detailed paint consumption for robot operations
 * @module estimation/paintCalculator
 */

/**
 * Calculate paint volume for a circular dot
 * 
 * @param {number} dotCount - Number of dots
 * @param {number} dotSize - Dot diameter (mm)
 * @param {number} [thickness=0.1] - Paint thickness (mm)
 * @returns {number} Paint volume in ml
 * 
 * @example
 * const paint = calculateDotPaint(100, 5, 0.1);
 * console.log(paint); // 0.196 ml
 */
export function calculateDotPaint(dotCount, dotSize, thickness = 0.1) {
    if (dotCount <= 0 || dotSize <= 0) {
        return 0;
    }
    
    // Calculate area of one dot: π × r²
    const radius = dotSize / 2;
    const areaPerDot = Math.PI * radius * radius;
    
    // Calculate volume: area × thickness
    // Volume in mm³
    const volumeMm3 = areaPerDot * thickness * dotCount;
    
    // Convert mm³ to ml (1ml = 1000mm³)
    return volumeMm3 / 1000;
}

/**
 * Calculate paint volume for line segments
 * 
 * @param {number} lineLength - Total line length (mm)
 * @param {number} lineThickness - Line width/thickness (mm)
 * @param {number} [thickness=0.1] - Paint thickness/depth (mm)
 * @returns {number} Paint volume in ml
 * 
 * @example
 * const paint = calculateLinePaint(500, 2, 0.1);
 * console.log(paint); // 0.1 ml
 */
export function calculateLinePaint(lineLength, lineThickness, thickness = 0.1) {
    if (lineLength <= 0 || lineThickness <= 0) {
        return 0;
    }
    
    // Calculate area: length × width
    const area = lineLength * lineThickness;
    
    // Calculate volume: area × thickness
    // Volume in mm³
    const volumeMm3 = area * thickness;
    
    // Convert mm³ to ml (1ml = 1000mm³)
    return volumeMm3 / 1000;
}

/**
 * Calculate paint consumption for one color layer
 * 
 * @param {Object} layer - Layer object
 * @param {string} layer.color - Hex color code
 * @param {number} layer.pixelCount - Number of pixels in layer
 * @param {Array} [layer.dots] - Array of dot objects
 * @param {Array} [layer.lines] - Array of line objects
 * @param {Object} config - Configuration object
 * @returns {Object} Paint info {color, volume, formatted}
 * 
 * @example
 * const layer = {
 *   color: '#FF0000',
 *   pixelCount: 1500,
 *   dots: [{size: 5}, {size: 4}, ...],
 *   lines: [{length: 50, width: 2}, ...]
 * };
 * const paint = calculateLayerPaint(layer, config);
 * // Returns: {color: '#FF0000', volume: 2.5, formatted: '2.50 ml'}
 */
export function calculateLayerPaint(layer, config) {
    let totalVolume = 0;
    const paintThickness = 0.1; // mm - default paint thickness
    
    // Calculate from dots
    if (layer.dots && layer.dots.length > 0) {
        for (const dot of layer.dots) {
            totalVolume += calculateDotPaint(1, dot.size || 3, paintThickness);
        }
    }
    
    // Calculate from lines
    if (layer.lines && layer.lines.length > 0) {
        for (const line of layer.lines) {
            const length = line.length || 0;
            const width = line.width || config?.paint?.strokes?.strokeWidth || 2;
            totalVolume += calculateLinePaint(length, width, paintThickness);
        }
    }
    
    // If no detailed data, estimate from pixel count
    if (totalVolume === 0 && layer.pixelCount > 0) {
        // Estimate: average dot size from config
        const avgDotSize = config?.paint?.pointillism?.maxDotSize || 3;
        totalVolume = calculateDotPaint(layer.pixelCount, avgDotSize, paintThickness);
    }
    
    return {
        color: layer.color || '#000000',
        volume: totalVolume,
        formatted: formatPaintVolume(totalVolume)
    };
}

/**
 * Calculate number of refills needed
 * 
 * @param {number} totalPaint - Total paint needed (ml)
 * @param {number} paintCapacity - Paint can/reservoir capacity (ml)
 * @returns {Object} Refill info {refills, cans, formatted}
 * 
 * @example
 * const refills = calculateRefills(125, 50);
 * // Returns: {refills: 2, cans: 3, formatted: '3 cans (2 refills)'}
 */
export function calculateRefills(totalPaint, paintCapacity) {
    if (paintCapacity <= 0) {
        return { refills: 0, cans: 0, formatted: 'N/A' };
    }
    
    // Number of full cans needed
    const cans = Math.ceil(totalPaint / paintCapacity);
    
    // Number of refills (first can doesn't count as refill)
    const refills = Math.max(0, cans - 1);
    
    let formatted;
    if (cans === 0) {
        formatted = '0 cans';
    } else if (cans === 1) {
        formatted = '1 can';
    } else {
        formatted = `${cans} cans (${refills} refill${refills === 1 ? '' : 's'})`;
    }
    
    return {
        refills,
        cans,
        formatted
    };
}

/**
 * Format paint volume for display
 * 
 * @param {number} ml - Paint volume in milliliters
 * @returns {string} Formatted volume string
 * 
 * @example
 * formatPaintVolume(0.5); // "0.50 ml"
 * formatPaintVolume(1.234); // "1.23 ml"
 * formatPaintVolume(1250); // "1.25 L"
 */
export function formatPaintVolume(ml) {
    if (ml >= 1000) {
        const liters = ml / 1000;
        return `${liters.toFixed(2)} L`;
    } else {
        return `${ml.toFixed(2)} ml`;
    }
}

export default {
    calculateDotPaint,
    calculateLinePaint,
    calculateLayerPaint,
    calculateRefills,
    formatPaintVolume
};