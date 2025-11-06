/**
 * Distance Calculator Module
 * Calculate travel distances for robot movements
 * @module estimation/distanceCalculator
 */

/**
 * Calculate 3D distance between two points in trilateration space
 * 
 * @param {number} x1 - Distance from top-left anchor (mm)
 * @param {number} y1 - Distance from top-right anchor (mm)
 * @param {number} z1 - Distance from bottom-center anchor (mm)
 * @param {number} x2 - Distance from top-left anchor (mm)
 * @param {number} y2 - Distance from top-right anchor (mm)
 * @param {number} z2 - Distance from bottom-center anchor (mm)
 * @returns {number} Distance in mm
 * 
 * @example
 * const dist = calculateMoveDistance(1000, 1500, 800, 1100, 1600, 900);
 * console.log(dist); // 173.21
 */
export function calculateMoveDistance(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate 2D Cartesian distance between two points
 * 
 * @param {number} x1 - X coordinate (mm)
 * @param {number} y1 - Y coordinate (mm)
 * @param {number} x2 - X coordinate (mm)
 * @param {number} y2 - Y coordinate (mm)
 * @returns {number} Distance in mm
 * 
 * @example
 * const dist = calculateCartesianDistance(0, 0, 100, 100);
 * console.log(dist); // 141.42
 */
export function calculateCartesianDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate total length of a path defined by multiple points
 * 
 * @param {Array<Object>} points - Array of points with {X, Y, Z} properties
 * @returns {number} Total path length in mm
 * 
 * @example
 * const points = [
 *   {X: 1000, Y: 1500, Z: 800},
 *   {X: 1100, Y: 1600, Z: 900},
 *   {X: 1200, Y: 1700, Z: 1000}
 * ];
 * const length = calculatePathLength(points);
 */
export function calculatePathLength(points) {
    if (!points || points.length < 2) {
        return 0;
    }
    
    let totalDistance = 0;
    
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        totalDistance += calculateMoveDistance(
            prev.X, prev.Y, prev.Z,
            curr.X, curr.Y, curr.Z
        );
    }
    
    return totalDistance;
}

/**
 * Calculate total distance from an array of moves
 * Distinguishes between painting moves and travel moves
 * 
 * @param {Array<Object>} moves - Array of move objects with {X, Y, Z, painting} properties
 * @returns {Object} Breakdown of distances {painting, travel, total}
 * 
 * @example
 * const moves = [
 *   {X: 1000, Y: 1500, Z: 800, painting: false},
 *   {X: 1100, Y: 1600, Z: 900, painting: true},
 *   {X: 1200, Y: 1700, Z: 1000, painting: true}
 * ];
 * const distances = calculateTotalDistance(moves);
 * // Returns: {painting: 346.41, travel: 173.21, total: 519.62}
 */
export function calculateTotalDistance(moves) {
    if (!moves || moves.length === 0) {
        return { painting: 0, travel: 0, total: 0 };
    }
    
    let paintingDistance = 0;
    let travelDistance = 0;
    let lastPosition = null;
    
    for (const move of moves) {
        if (lastPosition) {
            const distance = calculateMoveDistance(
                lastPosition.X, lastPosition.Y, lastPosition.Z,
                move.X, move.Y, move.Z
            );
            
            if (move.painting) {
                paintingDistance += distance;
            } else {
                travelDistance += distance;
            }
        }
        
        lastPosition = { X: move.X, Y: move.Y, Z: move.Z };
    }
    
    return {
        painting: paintingDistance,
        travel: travelDistance,
        total: paintingDistance + travelDistance
    };
}

/**
 * Format distance value for display
 * Converts to meters if >= 1000mm, otherwise displays in mm
 * 
 * @param {number} mm - Distance in millimeters
 * @returns {string} Formatted distance string
 * 
 * @example
 * formatDistance(500); // "500.0 mm"
 * formatDistance(1500); // "1.50 m"
 * formatDistance(12345); // "12.35 m"
 */
export function formatDistance(mm) {
    if (mm >= 1000) {
        const meters = mm / 1000;
        return `${meters.toFixed(2)} m`;
    } else {
        return `${mm.toFixed(1)} mm`;
    }
}

export default {
    calculateMoveDistance,
    calculateCartesianDistance,
    calculatePathLength,
    calculateTotalDistance,
    formatDistance
};