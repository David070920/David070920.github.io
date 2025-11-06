/**
 * Scanline Path Planner Module
 * 
 * Implements horizontal and vertical scanline algorithms for strokes mode.
 * Traces continuous segments of color in each row/column and optimizes
 * the order to minimize travel distance.
 * 
 * @module algorithms/scanlinePlanner
 */

import { EventBus } from '../core/eventBus.js';

/**
 * Calculate Euclidean distance between two points
 * @param {{x: number, y: number}} p1 - First point
 * @param {{x: number, y: number}} p2 - Second point
 * @returns {number} Distance
 */
function distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if pixel matches target color within tolerance
 * @param {Uint8ClampedArray} imageData - Image data
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Image width
 * @param {Array<number>} targetColor - Target RGB color [r, g, b]
 * @param {number} tolerance - Color matching tolerance
 * @returns {boolean} True if pixel matches
 */
function matchesColor(imageData, x, y, width, targetColor, tolerance) {
    const index = (y * width + x) * 4;
    const r = imageData[index];
    const g = imageData[index + 1];
    const b = imageData[index + 2];
    const a = imageData[index + 3];
    
    // Skip transparent pixels
    if (a < 128) return false;
    
    const dr = r - targetColor[0];
    const dg = g - targetColor[1];
    const db = b - targetColor[2];
    
    const colorDistance = Math.sqrt(dr * dr + dg * dg + db * db);
    return colorDistance <= tolerance;
}

/**
 * Plan horizontal scanline paths
 * @param {Object} imageData - Image data object with data, width, height
 * @param {Array<number>} targetColor - Target RGB color [r, g, b]
 * @param {number} tolerance - Color matching tolerance (default: 30)
 * @returns {Array<Object>} Array of line segments {startX, startY, endX, endY, length}
 */
export function planHorizontalScanlines(imageData, targetColor, tolerance = 30) {
    EventBus.emit('PATH_PLANNING_STARTED', {
        algorithm: 'horizontal-scanlines',
        imageSize: `${imageData.width}x${imageData.height}`
    });
    
    const segments = [];
    const { data, width, height } = imageData;
    
    // Scan each row
    for (let y = 0; y < height; y++) {
        let segmentStart = null;
        
        for (let x = 0; x < width; x++) {
            const matches = matchesColor(data, x, y, width, targetColor, tolerance);
            
            if (matches && segmentStart === null) {
                // Start new segment
                segmentStart = x;
            } else if (!matches && segmentStart !== null) {
                // End current segment
                const segment = {
                    startX: segmentStart,
                    startY: y,
                    endX: x - 1,
                    endY: y,
                    length: x - segmentStart
                };
                segments.push(segment);
                segmentStart = null;
            }
        }
        
        // Close segment at end of row if needed
        if (segmentStart !== null) {
            const segment = {
                startX: segmentStart,
                startY: y,
                endX: width - 1,
                endY: y,
                length: width - segmentStart
            };
            segments.push(segment);
        }
        
        // Emit progress periodically
        if (y % 50 === 0) {
            EventBus.emit('PATH_PLANNING_PROGRESS', {
                progress: y / height
            });
        }
    }
    
    EventBus.emit('PATH_PLANNING_COMPLETE', {
        algorithm: 'horizontal-scanlines',
        segmentCount: segments.length
    });
    
    return segments;
}

/**
 * Plan vertical scanline paths
 * @param {Object} imageData - Image data object with data, width, height
 * @param {Array<number>} targetColor - Target RGB color [r, g, b]
 * @param {number} tolerance - Color matching tolerance (default: 30)
 * @returns {Array<Object>} Array of line segments {startX, startY, endX, endY, length}
 */
export function planVerticalScanlines(imageData, targetColor, tolerance = 30) {
    EventBus.emit('PATH_PLANNING_STARTED', {
        algorithm: 'vertical-scanlines',
        imageSize: `${imageData.width}x${imageData.height}`
    });
    
    const segments = [];
    const { data, width, height } = imageData;
    
    // Scan each column
    for (let x = 0; x < width; x++) {
        let segmentStart = null;
        
        for (let y = 0; y < height; y++) {
            const matches = matchesColor(data, x, y, width, targetColor, tolerance);
            
            if (matches && segmentStart === null) {
                // Start new segment
                segmentStart = y;
            } else if (!matches && segmentStart !== null) {
                // End current segment
                const segment = {
                    startX: x,
                    startY: segmentStart,
                    endX: x,
                    endY: y - 1,
                    length: y - segmentStart
                };
                segments.push(segment);
                segmentStart = null;
            }
        }
        
        // Close segment at end of column if needed
        if (segmentStart !== null) {
            const segment = {
                startX: x,
                startY: segmentStart,
                endX: x,
                endY: height - 1,
                length: height - segmentStart
            };
            segments.push(segment);
        }
        
        // Emit progress periodically
        if (x % 50 === 0) {
            EventBus.emit('PATH_PLANNING_PROGRESS', {
                progress: x / width
            });
        }
    }
    
    EventBus.emit('PATH_PLANNING_COMPLETE', {
        algorithm: 'vertical-scanlines',
        segmentCount: segments.length
    });
    
    return segments;
}

/**
 * Optimize scanline segment order to minimize travel distance
 * Uses a greedy nearest-neighbor approach with bidirectional consideration
 * @param {Array<Object>} segments - Array of line segments
 * @param {{x: number, y: number}} startPos - Starting position (default: {x: 0, y: 0})
 * @returns {Array<Object>} Reordered segments with direction flags
 */
export function optimizeScanlineOrder(segments, startPos = { x: 0, y: 0 }) {
    if (segments.length === 0) return [];
    if (segments.length === 1) {
        return [{
            ...segments[0],
            reversed: false
        }];
    }
    
    EventBus.emit('PATH_PLANNING_STARTED', {
        algorithm: 'scanline-optimization',
        segmentCount: segments.length
    });
    
    const remaining = new Set(segments.map((_, i) => i));
    const orderedSegments = [];
    let currentPos = startPos;
    
    while (remaining.size > 0) {
        let bestIndex = -1;
        let bestDistance = Infinity;
        let bestReversed = false;
        let bestEndPos = null;
        
        // Find nearest segment (considering both directions)
        for (const index of remaining) {
            const segment = segments[index];
            
            // Distance to segment start
            const distToStart = distance(currentPos, {
                x: segment.startX,
                y: segment.startY
            });
            
            // Distance to segment end (if we reverse it)
            const distToEnd = distance(currentPos, {
                x: segment.endX,
                y: segment.endY
            });
            
            if (distToStart < bestDistance) {
                bestDistance = distToStart;
                bestIndex = index;
                bestReversed = false;
                bestEndPos = { x: segment.endX, y: segment.endY };
            }
            
            if (distToEnd < bestDistance) {
                bestDistance = distToEnd;
                bestIndex = index;
                bestReversed = true;
                bestEndPos = { x: segment.startX, y: segment.startY };
            }
        }
        
        const selectedSegment = segments[bestIndex];
        orderedSegments.push({
            ...selectedSegment,
            reversed: bestReversed
        });
        
        remaining.delete(bestIndex);
        currentPos = bestEndPos;
        
        // Emit progress periodically
        if (orderedSegments.length % 100 === 0) {
            EventBus.emit('PATH_PLANNING_PROGRESS', {
                progress: orderedSegments.length / segments.length
            });
        }
    }
    
    EventBus.emit('PATH_PLANNING_COMPLETE', {
        algorithm: 'scanline-optimization',
        segmentCount: orderedSegments.length
    });
    
    return orderedSegments;
}

/**
 * Create bidirectional scanline paths
 * Alternates direction in consecutive rows/columns to minimize travel
 * @param {Object} imageData - Image data object with data, width, height
 * @param {Array<number>} targetColor - Target RGB color [r, g, b]
 * @param {number} tolerance - Color matching tolerance (default: 30)
 * @param {string} direction - 'horizontal' or 'vertical' (default: 'horizontal')
 * @returns {Array<Object>} Array of optimized line segments with direction
 */
export function planBidirectionalScanlines(imageData, targetColor, tolerance = 30, direction = 'horizontal') {
    EventBus.emit('PATH_PLANNING_STARTED', {
        algorithm: `bidirectional-${direction}-scanlines`,
        imageSize: `${imageData.width}x${imageData.height}`
    });
    
    const segments = [];
    const { data, width, height } = imageData;
    
    if (direction === 'horizontal') {
        // Scan rows, alternating direction
        for (let y = 0; y < height; y++) {
            const leftToRight = y % 2 === 0;
            let segmentStart = null;
            
            const xStart = leftToRight ? 0 : width - 1;
            const xEnd = leftToRight ? width : -1;
            const xStep = leftToRight ? 1 : -1;
            
            for (let x = xStart; x !== xEnd; x += xStep) {
                const matches = matchesColor(data, x, y, width, targetColor, tolerance);
                
                if (matches && segmentStart === null) {
                    segmentStart = x;
                } else if (!matches && segmentStart !== null) {
                    const segment = {
                        startX: leftToRight ? segmentStart : x + 1,
                        startY: y,
                        endX: leftToRight ? x - 1 : segmentStart,
                        endY: y,
                        length: Math.abs(x - segmentStart),
                        reversed: !leftToRight
                    };
                    segments.push(segment);
                    segmentStart = null;
                }
            }
            
            // Close segment at end if needed
            if (segmentStart !== null) {
                const segment = {
                    startX: leftToRight ? segmentStart : 0,
                    startY: y,
                    endX: leftToRight ? width - 1 : segmentStart,
                    endY: y,
                    length: Math.abs((leftToRight ? width : 0) - segmentStart),
                    reversed: !leftToRight
                };
                segments.push(segment);
            }
            
            if (y % 50 === 0) {
                EventBus.emit('PATH_PLANNING_PROGRESS', {
                    progress: y / height
                });
            }
        }
    } else {
        // Scan columns, alternating direction
        for (let x = 0; x < width; x++) {
            const topToBottom = x % 2 === 0;
            let segmentStart = null;
            
            const yStart = topToBottom ? 0 : height - 1;
            const yEnd = topToBottom ? height : -1;
            const yStep = topToBottom ? 1 : -1;
            
            for (let y = yStart; y !== yEnd; y += yStep) {
                const matches = matchesColor(data, x, y, width, targetColor, tolerance);
                
                if (matches && segmentStart === null) {
                    segmentStart = y;
                } else if (!matches && segmentStart !== null) {
                    const segment = {
                        startX: x,
                        startY: topToBottom ? segmentStart : y + 1,
                        endX: x,
                        endY: topToBottom ? y - 1 : segmentStart,
                        length: Math.abs(y - segmentStart),
                        reversed: !topToBottom
                    };
                    segments.push(segment);
                    segmentStart = null;
                }
            }
            
            // Close segment at end if needed
            if (segmentStart !== null) {
                const segment = {
                    startX: x,
                    startY: topToBottom ? segmentStart : 0,
                    endX: x,
                    endY: topToBottom ? height - 1 : segmentStart,
                    length: Math.abs((topToBottom ? height : 0) - segmentStart),
                    reversed: !topToBottom
                };
                segments.push(segment);
            }
            
            if (x % 50 === 0) {
                EventBus.emit('PATH_PLANNING_PROGRESS', {
                    progress: x / width
                });
            }
        }
    }
    
    EventBus.emit('PATH_PLANNING_COMPLETE', {
        algorithm: `bidirectional-${direction}-scanlines`,
        segmentCount: segments.length
    });
    
    return segments;
}