/**
 * Color Utilities Module
 * Provides helper functions for color operations and conversions
 * @module algorithms/colorUtils
 */

/**
 * Calculate Euclidean distance between two RGB colors
 * @param {Object} color1 - First color {r, g, b}
 * @param {Object} color2 - Second color {r, g, b}
 * @returns {number} Distance between colors
 */
export function rgbDistance(color1, color2) {
    const rDiff = color1.r - color2.r;
    const gDiff = color1.g - color2.g;
    const bDiff = color1.b - color2.b;
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

/**
 * Convert RGB color to hex string
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {string} Hex color string (e.g., "#FF0000")
 */
export function rgbToHex(r, g, b) {
    const toHex = (value) => {
        const hex = Math.round(Math.max(0, Math.min(255, value))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert hex string to RGB object
 * @param {string} hex - Hex color string (e.g., "#FF0000" or "FF0000")
 * @returns {Object} RGB color {r, g, b}
 */
export function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Handle shorthand hex (e.g., "F00")
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    
    const bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

/**
 * Convert RGB to LAB color space (better perceptual uniformity)
 * LAB is more perceptually uniform than RGB
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {Object} LAB color {l, a, b}
 */
export function rgbToLab(r, g, b) {
    // First convert RGB to XYZ
    let rNorm = r / 255;
    let gNorm = g / 255;
    let bNorm = b / 255;
    
    // Apply gamma correction
    rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
    gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
    bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;
    
    // Convert to XYZ using D65 illuminant
    let x = (rNorm * 0.4124564 + gNorm * 0.3575761 + bNorm * 0.1804375) * 100;
    let y = (rNorm * 0.2126729 + gNorm * 0.7151522 + bNorm * 0.0721750) * 100;
    let z = (rNorm * 0.0193339 + gNorm * 0.1191920 + bNorm * 0.9503041) * 100;
    
    // Normalize for D65 white point
    x /= 95.047;
    y /= 100.000;
    z /= 108.883;
    
    // Convert XYZ to LAB
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
    
    return {
        l: (116 * y) - 16,
        a: 500 * (x - y),
        b: 200 * (y - z)
    };
}

/**
 * Calculate Delta E (CIE76) - perceptual color difference
 * Delta E < 1: Not perceptible by human eyes
 * Delta E 1-2: Perceptible through close observation
 * Delta E 2-10: Perceptible at a glance
 * Delta E > 10: Colors are more different than similar
 * @param {Object} color1 - First color {r, g, b}
 * @param {Object} color2 - Second color {r, g, b}
 * @returns {number} Delta E value
 */
export function deltaE(color1, color2) {
    const lab1 = rgbToLab(color1.r, color1.g, color1.b);
    const lab2 = rgbToLab(color2.r, color2.g, color2.b);
    
    const lDiff = lab1.l - lab2.l;
    const aDiff = lab1.a - lab2.a;
    const bDiff = lab1.b - lab2.b;
    
    return Math.sqrt(lDiff * lDiff + aDiff * aDiff + bDiff * bDiff);
}

/**
 * Find the closest color in a palette to a target color
 * @param {Object} targetColor - Target color {r, g, b}
 * @param {Array} palette - Array of colors {r, g, b}
 * @param {boolean} usePerceptual - Use perceptual distance (deltaE) instead of RGB
 * @returns {Object} Closest color and its index {color, index, distance}
 */
export function findClosestColor(targetColor, palette, usePerceptual = false) {
    let minDistance = Infinity;
    let closestColor = null;
    let closestIndex = -1;
    
    const distanceFunc = usePerceptual ? deltaE : rgbDistance;
    
    palette.forEach((color, index) => {
        const distance = distanceFunc(targetColor, color);
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
            closestIndex = index;
        }
    });
    
    return {
        color: closestColor,
        index: closestIndex,
        distance: minDistance
    };
}

/**
 * Check if two colors are similar within a tolerance
 * @param {Object} color1 - First color {r, g, b}
 * @param {Object} color2 - Second color {r, g, b}
 * @param {number} tolerance - Maximum distance to consider similar (default: 30)
 * @param {boolean} usePerceptual - Use perceptual distance
 * @returns {boolean} True if colors are similar
 */
export function areColorsSimilar(color1, color2, tolerance = 30, usePerceptual = false) {
    const distanceFunc = usePerceptual ? deltaE : rgbDistance;
    return distanceFunc(color1, color2) <= tolerance;
}

/**
 * Convert grayscale value to RGB
 * @param {number} gray - Grayscale value (0-255)
 * @returns {Object} RGB color {r, g, b}
 */
export function grayToRgb(gray) {
    return { r: gray, g: gray, b: gray };
}

/**
 * Convert RGB to grayscale using luminosity method
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {number} Grayscale value (0-255)
 */
export function rgbToGray(r, g, b) {
    // Luminosity method: weighted average based on human perception
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

/**
 * Clamp RGB values to valid range
 * @param {Object} color - Color object {r, g, b}
 * @returns {Object} Clamped color {r, g, b}
 */
export function clampRgb(color) {
    return {
        r: Math.max(0, Math.min(255, Math.round(color.r))),
        g: Math.max(0, Math.min(255, Math.round(color.g))),
        b: Math.max(0, Math.min(255, Math.round(color.b)))
    };
}

/**
 * Blend two colors with a given ratio
 * @param {Object} color1 - First color {r, g, b}
 * @param {Object} color2 - Second color {r, g, b}
 * @param {number} ratio - Blend ratio (0 = color1, 1 = color2)
 * @returns {Object} Blended color {r, g, b}
 */
export function blendColors(color1, color2, ratio) {
    ratio = Math.max(0, Math.min(1, ratio));
    return {
        r: Math.round(color1.r * (1 - ratio) + color2.r * ratio),
        g: Math.round(color1.g * (1 - ratio) + color2.g * ratio),
        b: Math.round(color1.b * (1 - ratio) + color2.b * ratio)
    };
}