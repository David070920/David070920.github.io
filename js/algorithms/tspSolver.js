/**
 * TSP Solver Module
 * 
 * Implements Traveling Salesman Problem algorithms for optimizing point order
 * in pointillism mode. Uses nearest-neighbor heuristic and optional 2-opt optimization.
 * 
 * @module algorithms/tspSolver
 */

import { EventBus } from '../core/eventBus.js';
import { SpatialIndex } from './spatialIndex.js';

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
 * Calculate the total length of a tour
 * @param {Array<number>} tour - Array of point indices representing the tour
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @returns {number} Total tour length
 */
export function calculateTourLength(tour, points) {
    if (tour.length < 2) return 0;
    
    let totalLength = 0;
    
    for (let i = 0; i < tour.length - 1; i++) {
        const p1 = points[tour[i]];
        const p2 = points[tour[i + 1]];
        totalLength += distance(p1, p2);
    }
    
    return totalLength;
}

/**
 * Solve TSP using nearest-neighbor heuristic
 * @param {Array<{x: number, y: number}>} points - Array of points to visit
 * @param {number} startIndex - Index of starting point (default: 0)
 * @returns {Array<number>} Ordered array of point indices representing the tour
 */
export function nearestNeighbor(points, startIndex = 0) {
    if (points.length === 0) return [];
    if (points.length === 1) return [0];
    
    EventBus.emit('PATH_PLANNING_STARTED', {
        algorithm: 'nearest-neighbor',
        pointCount: points.length
    });
    
    const visited = new Set();
    const tour = [];
    
    // Use spatial index for large point sets
    const useSpatialIndex = points.length > 1000;
    const spatialIndex = useSpatialIndex ? new SpatialIndex(points) : null;
    
    let currentIndex = startIndex;
    tour.push(currentIndex);
    visited.add(currentIndex);
    
    // Greedy nearest-neighbor construction
    while (visited.size < points.length) {
        const currentPoint = points[currentIndex];
        let nearestIndex = -1;
        let nearestDistance = Infinity;
        
        if (useSpatialIndex) {
            // Use spatial index for faster nearest-neighbor search
            // Check increasingly larger radii until we find an unvisited point
            let searchRadius = spatialIndex.gridSize;
            const maxRadius = Math.max(
                Math.abs(points.reduce((max, p) => Math.max(max, p.x), 0)),
                Math.abs(points.reduce((max, p) => Math.max(max, p.y), 0))
            ) * 2;
            
            while (nearestIndex === -1 && searchRadius <= maxRadius) {
                const candidates = spatialIndex.findInRadius(currentPoint, searchRadius);
                
                for (const candidate of candidates) {
                    if (!visited.has(candidate.index) && candidate.distance < nearestDistance) {
                        nearestDistance = candidate.distance;
                        nearestIndex = candidate.index;
                    }
                }
                
                if (nearestIndex === -1) {
                    searchRadius *= 2;
                }
            }
        } else {
            // Brute force for smaller point sets
            for (let i = 0; i < points.length; i++) {
                if (visited.has(i)) continue;
                
                const dist = distance(currentPoint, points[i]);
                if (dist < nearestDistance) {
                    nearestDistance = dist;
                    nearestIndex = i;
                }
            }
        }
        
        if (nearestIndex === -1) break; // Shouldn't happen, but safety check
        
        tour.push(nearestIndex);
        visited.add(nearestIndex);
        currentIndex = nearestIndex;
        
        // Emit progress periodically
        if (tour.length % 100 === 0) {
            EventBus.emit('PATH_PLANNING_PROGRESS', {
                progress: visited.size / points.length
            });
        }
    }
    
    const tourLength = calculateTourLength(tour, points);
    
    EventBus.emit('PATH_PLANNING_COMPLETE', {
        algorithm: 'nearest-neighbor',
        pointCount: points.length,
        tourLength
    });
    
    return tour;
}

/**
 * Optimize tour using 2-opt local search
 * @param {Array<number>} tour - Initial tour (array of point indices)
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @param {number} maxIterations - Maximum number of iterations (default: 1000)
 * @returns {Array<number>} Improved tour
 */
export function twoOpt(tour, points, maxIterations = 1000) {
    if (tour.length < 4) return tour; // 2-opt requires at least 4 points
    
    EventBus.emit('PATH_PLANNING_STARTED', {
        algorithm: '2-opt',
        pointCount: tour.length
    });
    
    let improved = true;
    let iterations = 0;
    let bestTour = [...tour];
    let bestLength = calculateTourLength(bestTour, points);
    
    while (improved && iterations < maxIterations) {
        improved = false;
        iterations++;
        
        // Try all possible 2-opt swaps
        for (let i = 1; i < tour.length - 2; i++) {
            for (let j = i + 1; j < tour.length - 1; j++) {
                // Calculate the change in tour length from this swap
                const A = points[bestTour[i - 1]];
                const B = points[bestTour[i]];
                const C = points[bestTour[j]];
                const D = points[bestTour[j + 1]];
                
                const currentDist = distance(A, B) + distance(C, D);
                const newDist = distance(A, C) + distance(B, D);
                
                // If this swap improves the tour
                if (newDist < currentDist) {
                    // Reverse the segment between i and j
                    const newTour = [
                        ...bestTour.slice(0, i),
                        ...bestTour.slice(i, j + 1).reverse(),
                        ...bestTour.slice(j + 1)
                    ];
                    
                    bestTour = newTour;
                    bestLength = calculateTourLength(bestTour, points);
                    improved = true;
                }
            }
        }
        
        // Emit progress periodically
        if (iterations % 10 === 0) {
            EventBus.emit('PATH_PLANNING_PROGRESS', {
                progress: Math.min(0.99, iterations / maxIterations)
            });
        }
    }
    
    EventBus.emit('PATH_PLANNING_COMPLETE', {
        algorithm: '2-opt',
        pointCount: tour.length,
        tourLength: bestLength,
        iterations
    });
    
    return bestTour;
}

/**
 * Solve TSP with optional 2-opt optimization
 * @param {Array<{x: number, y: number}>} points - Array of points to visit
 * @param {Object} options - Configuration options
 * @param {number} options.startIndex - Starting point index (default: 0)
 * @param {boolean} options.optimize - Apply 2-opt optimization (default: false for large sets)
 * @param {number} options.maxIterations - Max 2-opt iterations (default: 1000)
 * @returns {Array<number>} Optimized tour
 */
export function solveTSP(points, options = {}) {
    const {
        startIndex = 0,
        optimize = points.length < 500, // Only optimize smaller sets by default
        maxIterations = 1000
    } = options;
    
    // Get initial tour using nearest-neighbor
    let tour = nearestNeighbor(points, startIndex);
    
    // Optionally improve with 2-opt
    if (optimize && tour.length >= 4) {
        tour = twoOpt(tour, points, maxIterations);
    }
    
    return tour;
}