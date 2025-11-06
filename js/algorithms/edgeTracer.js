/**
 * Edge Tracer Module
 * 
 * Traces edge pixels from edge detection output for sketch mode.
 * Follows connected edge pixels to create continuous paths (polylines).
 * Includes Douglas-Peucker simplification and path optimization.
 * 
 * @module algorithms/edgeTracer
 */

import eventBus from '../core/eventBus.js';

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
 * Calculate perpendicular distance from point to line segment
 * @param {{x: number, y: number}} point - Point to measure from
 * @param {{x: number, y: number}} lineStart - Line segment start
 * @param {{x: number, y: number}} lineEnd - Line segment end
 * @returns {number} Perpendicular distance
 */
function perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lenSquared = dx * dx + dy * dy;
    
    if (lenSquared === 0) {
        return distance(point, lineStart);
    }
    
    const t = Math.max(0, Math.min(1, 
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSquared
    ));
    
    const projection = {
        x: lineStart.x + t * dx,
        y: lineStart.y + t * dy
    };
    
    return distance(point, projection);
}

/**
 * Simplify polyline using Douglas-Peucker algorithm
 * @param {Array<{x: number, y: number}>} points - Polyline points
 * @param {number} tolerance - Simplification tolerance in pixels (default: 2)
 * @returns {Array<{x: number, y: number}>} Simplified polyline
 */
export function simplifyPolyline(points, tolerance = 2) {
    if (points.length <= 2) return points;
    
    // Find the point with maximum distance from line segment
    let maxDistance = 0;
    let maxIndex = 0;
    const end = points.length - 1;
    
    for (let i = 1; i < end; i++) {
        const dist = perpendicularDistance(points[i], points[0], points[end]);
        if (dist > maxDistance) {
            maxDistance = dist;
            maxIndex = i;
        }
    }
    
    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
        const left = simplifyPolyline(points.slice(0, maxIndex + 1), tolerance);
        const right = simplifyPolyline(points.slice(maxIndex), tolerance);
        
        // Concatenate results, avoiding duplicate middle point
        return [...left.slice(0, -1), ...right];
    }
    
    // If max distance is within tolerance, return endpoints only
    return [points[0], points[end]];
}

/**
 * Check if pixel is an edge pixel
 * @param {Uint8ClampedArray} edgeMap - Edge detection result (grayscale)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Image width
 * @param {number} threshold - Edge threshold (default: 128)
 * @returns {boolean} True if edge pixel
 */
function isEdgePixel(edgeMap, x, y, width, threshold = 128) {
    const index = (y * width + x) * 4;
    return edgeMap[index] >= threshold;
}

/**
 * Get 8-connected neighbors of a pixel
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Array<{x: number, y: number}>} Neighbor coordinates
 */
function getNeighbors(x, y, width, height) {
    const neighbors = [];
    
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                neighbors.push({ x: nx, y: ny });
            }
        }
    }
    
    return neighbors;
}

/**
 * Trace a single contour starting from a seed point
 * @param {Uint8ClampedArray} edgeMap - Edge detection result
 * @param {number} startX - Starting X coordinate
 * @param {number} startY - Starting Y coordinate
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {Set<string>} visited - Set of visited pixel keys
 * @param {number} threshold - Edge threshold
 * @returns {Array<{x: number, y: number}>} Traced polyline
 */
function traceContour(edgeMap, startX, startY, width, height, visited, threshold = 128) {
    const polyline = [{ x: startX, y: startY }];
    const queue = [{ x: startX, y: startY }];
    visited.add(`${startX},${startY}`);
    
    while (queue.length > 0) {
        const current = queue.shift();
        const neighbors = getNeighbors(current.x, current.y, width, height);
        
        for (const neighbor of neighbors) {
            const key = `${neighbor.x},${neighbor.y}`;
            
            if (!visited.has(key) && isEdgePixel(edgeMap, neighbor.x, neighbor.y, width, threshold)) {
                visited.add(key);
                polyline.push(neighbor);
                queue.push(neighbor);
            }
        }
    }
    
    return polyline;
}

/**
 * Find separate edge contours in edge map
 * @param {Object} edgeMap - Edge map object with data, width, height
 * @param {number} threshold - Edge threshold (default: 128)
 * @returns {Array<Array<{x: number, y: number}>>} Array of contours (each is an array of points)
 */
export function findEdgeContours(edgeMap, threshold = 128) {
    eventBus.emit('PATH_PLANNING_STARTED', {
        algorithm: 'edge-contour-detection',
        imageSize: `${edgeMap.width}x${edgeMap.height}`
    });
    
    const { data, width, height } = edgeMap;
    const contours = [];
    const visited = new Set();
    
    let pixelsProcessed = 0;
    const totalPixels = width * height;
    
    // Scan for edge pixels and trace contours
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const key = `${x},${y}`;
            
            if (!visited.has(key) && isEdgePixel(data, x, y, width, threshold)) {
                const contour = traceContour(data, x, y, width, height, visited, threshold);
                
                if (contour.length > 1) {
                    contours.push(contour);
                }
            }
            
            pixelsProcessed++;
        }
        
        // Emit progress periodically
        if (y % 50 === 0) {
            eventBus.emit('PATH_PLANNING_PROGRESS', {
                progress: pixelsProcessed / totalPixels
            });
        }
    }
    
    eventBus.emit('PATH_PLANNING_COMPLETE', {
        algorithm: 'edge-contour-detection',
        contourCount: contours.length
    });
    
    return contours;
}

/**
 * Trace edges from edge detection output
 * @param {Object} edgeMap - Edge map object with data, width, height
 * @param {Object} options - Tracing options
 * @param {number} options.threshold - Edge threshold (default: 128)
 * @param {number} options.minLength - Minimum contour length in pixels (default: 5)
 * @param {number} options.simplifyTolerance - Douglas-Peucker tolerance (default: 2)
 * @returns {Array<Array<{x: number, y: number}>>} Array of traced and simplified polylines
 */
export function traceEdges(edgeMap, options = {}) {
    const {
        threshold = 128,
        minLength = 5,
        simplifyTolerance = 2
    } = options;
    
    eventBus.emit('PATH_PLANNING_STARTED', {
        algorithm: 'edge-tracing',
        imageSize: `${edgeMap.width}x${edgeMap.height}`
    });
    
    // Find all contours
    const contours = findEdgeContours(edgeMap, threshold);
    
    eventBus.emit('PATH_PLANNING_PROGRESS', {
        progress: 0.5,
        message: 'Simplifying contours...'
    });
    
    // Filter and simplify contours
    const polylines = [];
    
    for (let i = 0; i < contours.length; i++) {
        const contour = contours[i];
        
        // Calculate contour length
        let length = 0;
        for (let j = 1; j < contour.length; j++) {
            length += distance(contour[j - 1], contour[j]);
        }
        
        // Skip very short contours
        if (length < minLength) continue;
        
        // Simplify the contour
        const simplified = simplifyPolyline(contour, simplifyTolerance);
        
        // Only keep if we still have at least 2 points after simplification
        if (simplified.length >= 2) {
            polylines.push(simplified);
        }
        
        // Emit progress
        if (i % 100 === 0) {
            eventBus.emit('PATH_PLANNING_PROGRESS', {
                progress: 0.5 + (i / contours.length) * 0.5
            });
        }
    }
    
    eventBus.emit('PATH_PLANNING_COMPLETE', {
        algorithm: 'edge-tracing',
        polylineCount: polylines.length,
        originalContours: contours.length
    });
    
    return polylines;
}

/**
 * Order contours to minimize travel distance
 * Uses greedy nearest-neighbor considering both start and end points
 * @param {Array<Array<{x: number, y: number}>>} polylines - Array of polylines
 * @param {{x: number, y: number}} startPos - Starting position (default: {x: 0, y: 0})
 * @returns {Array<Object>} Ordered polylines with direction flags
 */
export function optimizeContourOrder(polylines, startPos = { x: 0, y: 0 }) {
    if (polylines.length === 0) return [];
    if (polylines.length === 1) {
        return [{
            points: polylines[0],
            reversed: false
        }];
    }
    
    eventBus.emit('PATH_PLANNING_STARTED', {
        algorithm: 'contour-optimization',
        polylineCount: polylines.length
    });
    
    const remaining = new Set(polylines.map((_, i) => i));
    const ordered = [];
    let currentPos = startPos;
    
    while (remaining.size > 0) {
        let bestIndex = -1;
        let bestDistance = Infinity;
        let bestReversed = false;
        let bestEndPos = null;
        
        // Find nearest polyline (considering both directions)
        for (const index of remaining) {
            const polyline = polylines[index];
            const start = polyline[0];
            const end = polyline[polyline.length - 1];
            
            // Distance to polyline start
            const distToStart = distance(currentPos, start);
            
            // Distance to polyline end (if we reverse it)
            const distToEnd = distance(currentPos, end);
            
            if (distToStart < bestDistance) {
                bestDistance = distToStart;
                bestIndex = index;
                bestReversed = false;
                bestEndPos = end;
            }
            
            if (distToEnd < bestDistance) {
                bestDistance = distToEnd;
                bestIndex = index;
                bestReversed = true;
                bestEndPos = start;
            }
        }
        
        const selectedPolyline = polylines[bestIndex];
        ordered.push({
            points: bestReversed ? [...selectedPolyline].reverse() : selectedPolyline,
            reversed: bestReversed
        });
        
        remaining.delete(bestIndex);
        currentPos = bestEndPos;
        
        // Emit progress periodically
        if (ordered.length % 50 === 0) {
            eventBus.emit('PATH_PLANNING_PROGRESS', {
                progress: ordered.length / polylines.length
            });
        }
    }
    
    eventBus.emit('PATH_PLANNING_COMPLETE', {
        algorithm: 'contour-optimization',
        polylineCount: ordered.length
    });
    
    return ordered;
}