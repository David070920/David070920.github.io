/**
 * Coordinate Transformer Module
 * Transforms between Cartesian (pixel/mm) coordinates and trilateration coordinates
 * for the MuralBot cable robot system
 * @module gcode/coordinateTransformer
 */

/**
 * Transform Cartesian coordinates to trilateration coordinates
 * 
 * The robot uses three anchor points to control position:
 * - X: Distance from top-left anchor
 * - Y: Distance from top-right anchor
 * - Z: Distance from bottom-center anchor
 * 
 * @param {number} x - Cartesian X coordinate (mm)
 * @param {number} y - Cartesian Y coordinate (mm)
 * @param {Object} anchors - Anchor point positions
 * @param {Object} anchors.topLeft - Top-left anchor {x, y}
 * @param {Object} anchors.topRight - Top-right anchor {x, y}
 * @param {Object} anchors.bottomCenter - Bottom-center anchor {x, y}
 * @returns {Object} Trilateration coordinates {X, Y, Z}
 * 
 * @example
 * const anchors = {
 *   topLeft: { x: 0, y: 0 },
 *   topRight: { x: 2000, y: 0 },
 *   bottomCenter: { x: 1000, y: 1500 }
 * };
 * const result = cartesianToTrilateration(500, 300, anchors);
 * // result: { X: 583.095, Y: 1500.000, Z: 538.516 }
 */
export function cartesianToTrilateration(x, y, anchors) {
    // Validate inputs
    if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('Coordinates must be numbers');
    }
    
    if (!anchors || !anchors.topLeft || !anchors.topRight || !anchors.bottomCenter) {
        throw new Error('Invalid anchor configuration');
    }
    
    const { topLeft, topRight, bottomCenter } = anchors;
    
    // Calculate distance from each anchor using Euclidean distance formula
    // Distance = sqrt((x2 - x1)² + (y2 - y1)²)
    
    // X: Distance from top-left anchor
    const X = Math.sqrt(
        Math.pow(topLeft.x - x, 2) + Math.pow(topLeft.y - y, 2)
    );
    
    // Y: Distance from top-right anchor
    const Y = Math.sqrt(
        Math.pow(topRight.x - x, 2) + Math.pow(topRight.y - y, 2)
    );
    
    // Z: Distance from bottom-center anchor
    const Z = Math.sqrt(
        Math.pow(bottomCenter.x - x, 2) + Math.pow(bottomCenter.y - y, 2)
    );
    
    return {
        X: Math.round(X * 100) / 100, // Round to 2 decimal places
        Y: Math.round(Y * 100) / 100,
        Z: Math.round(Z * 100) / 100
    };
}

/**
 * Transform trilateration coordinates back to Cartesian coordinates
 * This is the inverse transformation, used for validation and verification
 * 
 * Uses trilateration algorithm to find the intersection point of three circles
 * 
 * @param {number} X - Distance from top-left anchor (mm)
 * @param {number} Y - Distance from top-right anchor (mm)
 * @param {number} Z - Distance from bottom-center anchor (mm)
 * @param {Object} anchors - Anchor point positions
 * @param {Object} anchors.topLeft - Top-left anchor {x, y}
 * @param {Object} anchors.topRight - Top-right anchor {x, y}
 * @param {Object} anchors.bottomCenter - Bottom-center anchor {x, y}
 * @returns {Object} Cartesian coordinates {x, y} or null if no valid solution
 * 
 * @example
 * const anchors = {
 *   topLeft: { x: 0, y: 0 },
 *   topRight: { x: 2000, y: 0 },
 *   bottomCenter: { x: 1000, y: 1500 }
 * };
 * const result = trilaterationToCartesian(583.10, 1500.00, 538.52, anchors);
 * // result: { x: 500, y: 300 }
 */
export function trilaterationToCartesian(X, Y, Z, anchors) {
    // Validate inputs
    if (typeof X !== 'number' || typeof Y !== 'number' || typeof Z !== 'number') {
        throw new Error('Distances must be numbers');
    }
    
    if (!anchors || !anchors.topLeft || !anchors.topRight || !anchors.bottomCenter) {
        throw new Error('Invalid anchor configuration');
    }
    
    const { topLeft, topRight, bottomCenter } = anchors;
    
    // Use top-left and top-right anchors to solve for x coordinate
    // Based on the circle intersection formula
    const d = Math.sqrt(
        Math.pow(topRight.x - topLeft.x, 2) + Math.pow(topRight.y - topLeft.y, 2)
    );
    
    if (d === 0) {
        throw new Error('Top anchors cannot be at the same position');
    }
    
    // Calculate x position relative to top-left anchor
    const x = (X * X - Y * Y + d * d) / (2 * d);
    
    // Calculate y position using distance from top-left anchor
    const ySquared = X * X - x * x;
    
    if (ySquared < 0) {
        // No valid solution - distances are inconsistent
        return null;
    }
    
    const y = Math.sqrt(ySquared);
    
    // Transform from anchor-relative to absolute coordinates
    const absX = topLeft.x + x;
    const absY = topLeft.y + y;
    
    // Verify against bottom-center anchor
    const verifyZ = Math.sqrt(
        Math.pow(bottomCenter.x - absX, 2) + Math.pow(bottomCenter.y - absY, 2)
    );
    
    // Allow small error margin (1mm) due to rounding
    if (Math.abs(verifyZ - Z) > 1) {
        console.warn(`Trilateration verification failed: expected Z=${Z}, got ${verifyZ}`);
    }
    
    return {
        x: Math.round(absX * 100) / 100,
        y: Math.round(absY * 100) / 100
    };
}

/**
 * Scale pixel coordinates to physical coordinates
 * 
 * @param {number} pixelX - X coordinate in pixels
 * @param {number} pixelY - Y coordinate in pixels
 * @param {number} imageWidth - Image width in pixels
 * @param {number} imageHeight - Image height in pixels
 * @param {number} physicalWidth - Physical canvas width (mm)
 * @param {number} physicalHeight - Physical canvas height (mm)
 * @returns {Object} Physical coordinates {x, y} in mm
 * 
 * @example
 * // Scale a 100x100 pixel on a 800x600 image to a 2000x1500mm canvas
 * const result = scaleToPhysical(100, 100, 800, 600, 2000, 1500);
 * // result: { x: 250, y: 250 }
 */
export function scaleToPhysical(pixelX, pixelY, imageWidth, imageHeight, physicalWidth, physicalHeight) {
    // Validate inputs
    if (imageWidth <= 0 || imageHeight <= 0) {
        throw new Error('Image dimensions must be positive');
    }
    
    if (physicalWidth <= 0 || physicalHeight <= 0) {
        throw new Error('Physical dimensions must be positive');
    }
    
    // Calculate scale factors
    const scaleX = physicalWidth / imageWidth;
    const scaleY = physicalHeight / imageHeight;
    
    // Scale coordinates
    const x = pixelX * scaleX;
    const y = pixelY * scaleY;
    
    return {
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100
    };
}

/**
 * Scale physical coordinates to pixel coordinates
 * Inverse of scaleToPhysical
 * 
 * @param {number} physicalX - X coordinate in mm
 * @param {number} physicalY - Y coordinate in mm
 * @param {number} imageWidth - Image width in pixels
 * @param {number} imageHeight - Image height in pixels
 * @param {number} physicalWidth - Physical canvas width (mm)
 * @param {number} physicalHeight - Physical canvas height (mm)
 * @returns {Object} Pixel coordinates {x, y}
 */
export function scaleToPixels(physicalX, physicalY, imageWidth, imageHeight, physicalWidth, physicalHeight) {
    // Validate inputs
    if (physicalWidth <= 0 || physicalHeight <= 0) {
        throw new Error('Physical dimensions must be positive');
    }
    
    if (imageWidth <= 0 || imageHeight <= 0) {
        throw new Error('Image dimensions must be positive');
    }
    
    // Calculate scale factors
    const scaleX = imageWidth / physicalWidth;
    const scaleY = imageHeight / physicalHeight;
    
    // Scale coordinates
    const x = physicalX * scaleX;
    const y = physicalY * scaleY;
    
    return {
        x: Math.round(x),
        y: Math.round(y)
    };
}

/**
 * Create anchor configuration from state
 * Converts cm to mm and creates the proper anchor structure
 * 
 * @param {Object} canvasState - Canvas state object
 * @returns {Object} Anchor configuration for transformation functions
 */
export function createAnchorConfig(canvasState) {
    const { anchorTopLeft, anchorTopRight, anchorBottomLeft, anchorBottomRight, width, height } = canvasState;
    
    // Calculate bottom-center anchor position
    // This is the midpoint between bottom-left and bottom-right
    const bottomCenter = {
        x: ((anchorBottomLeft?.x || 0) + (anchorBottomRight?.x || width)) / 2,
        y: (anchorBottomLeft?.y || height)
    };
    
    // Convert cm to mm for all coordinates
    return {
        topLeft: {
            x: (anchorTopLeft?.x || 0) * 10,
            y: (anchorTopLeft?.y || 0) * 10
        },
        topRight: {
            x: (anchorTopRight?.x || width) * 10,
            y: (anchorTopRight?.y || 0) * 10
        },
        bottomCenter: {
            x: bottomCenter.x * 10,
            y: bottomCenter.y * 10
        }
    };
}

/**
 * Validate that a point is within canvas bounds
 * 
 * @param {number} x - X coordinate (mm)
 * @param {number} y - Y coordinate (mm)
 * @param {number} width - Canvas width (mm)
 * @param {number} height - Canvas height (mm)
 * @returns {boolean} True if point is within bounds
 */
export function isWithinBounds(x, y, width, height) {
    return x >= 0 && x <= width && y >= 0 && y <= height;
}

/**
 * Clamp coordinates to canvas bounds
 * 
 * @param {number} x - X coordinate (mm)
 * @param {number} y - Y coordinate (mm)
 * @param {number} width - Canvas width (mm)
 * @param {number} height - Canvas height (mm)
 * @returns {Object} Clamped coordinates {x, y}
 */
export function clampToBounds(x, y, width, height) {
    return {
        x: Math.max(0, Math.min(width, x)),
        y: Math.max(0, Math.min(height, y))
    };
}

export default {
    cartesianToTrilateration,
    trilaterationToCartesian,
    scaleToPhysical,
    scaleToPixels,
    createAnchorConfig,
    isWithinBounds,
    clampToBounds
};