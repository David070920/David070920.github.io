/**
 * Spatial Index Module
 * 
 * Provides grid-based spatial indexing for fast nearest-neighbor queries.
 * Used to optimize path planning algorithms for large point sets.
 * 
 * @module algorithms/spatialIndex
 */

/**
 * Grid-based spatial index for fast spatial queries
 */
export class SpatialIndex {
    /**
     * Create a spatial index
     * @param {Array<{x: number, y: number}>} points - Array of points to index
     * @param {number} gridSize - Size of each grid cell (default: auto-calculated)
     */
    constructor(points, gridSize = null) {
        this.points = points;
        this.gridSize = gridSize || this._calculateOptimalGridSize(points);
        this.grid = new Map();
        this._buildIndex();
    }

    /**
     * Calculate optimal grid size based on point distribution
     * @private
     * @param {Array<{x: number, y: number}>} points - Points to analyze
     * @returns {number} Optimal grid size
     */
    _calculateOptimalGridSize(points) {
        if (points.length === 0) return 10;
        
        // Find bounds
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (const point of points) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        
        const width = maxX - minX;
        const height = maxY - minY;
        const area = width * height;
        
        // Aim for approximately sqrt(n) cells per dimension
        const targetCells = Math.sqrt(points.length);
        const avgDimension = Math.sqrt(area);
        
        return Math.max(1, avgDimension / targetCells);
    }

    /**
     * Build the spatial index
     * @private
     */
    _buildIndex() {
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const cellKey = this._getCellKey(point);
            
            if (!this.grid.has(cellKey)) {
                this.grid.set(cellKey, []);
            }
            
            this.grid.get(cellKey).push({ index: i, point });
        }
    }

    /**
     * Get grid cell key for a point
     * @param {{x: number, y: number}} point - Point to get cell for
     * @returns {string} Cell key
     */
    _getCellKey(point) {
        const cellX = Math.floor(point.x / this.gridSize);
        const cellY = Math.floor(point.y / this.gridSize);
        return `${cellX},${cellY}`;
    }

    /**
     * Get the grid cell coordinates for a point
     * @param {{x: number, y: number}} point - Point to get cell for
     * @returns {{x: number, y: number}} Grid cell coordinates
     */
    getGridCell(point) {
        return {
            x: Math.floor(point.x / this.gridSize),
            y: Math.floor(point.y / this.gridSize)
        };
    }

    /**
     * Calculate Euclidean distance between two points
     * @private
     * @param {{x: number, y: number}} p1 - First point
     * @param {{x: number, y: number}} p2 - Second point
     * @returns {number} Distance
     */
    _distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Find the nearest point to a given point
     * @param {{x: number, y: number}} point - Query point
     * @param {number} maxDistance - Maximum search distance (optional)
     * @returns {{index: number, point: {x: number, y: number}, distance: number}|null} Nearest point info or null
     */
    findNearest(point, maxDistance = Infinity) {
        const cellX = Math.floor(point.x / this.gridSize);
        const cellY = Math.floor(point.y / this.gridSize);
        
        let nearestIndex = -1;
        let nearestPoint = null;
        let nearestDistance = maxDistance;
        
        // Search in expanding rings around the query point
        const maxRadius = Math.ceil(maxDistance / this.gridSize);
        
        for (let radius = 0; radius <= maxRadius; radius++) {
            let found = false;
            
            // Check cells in the current ring
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    // Only check cells on the perimeter of the current ring
                    if (radius > 0 && Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
                        continue;
                    }
                    
                    const cellKey = `${cellX + dx},${cellY + dy}`;
                    const cellPoints = this.grid.get(cellKey);
                    
                    if (!cellPoints) continue;
                    
                    for (const item of cellPoints) {
                        const distance = this._distance(point, item.point);
                        
                        if (distance < nearestDistance) {
                            nearestDistance = distance;
                            nearestIndex = item.index;
                            nearestPoint = item.point;
                            found = true;
                        }
                    }
                }
            }
            
            // If we found something in this ring and the next ring is farther than our best distance, stop
            if (found && (radius + 1) * this.gridSize > nearestDistance) {
                break;
            }
        }
        
        if (nearestIndex === -1) return null;
        
        return {
            index: nearestIndex,
            point: nearestPoint,
            distance: nearestDistance
        };
    }

    /**
     * Find all points within a radius of a given point
     * @param {{x: number, y: number}} point - Query point
     * @param {number} radius - Search radius
     * @returns {Array<{index: number, point: {x: number, y: number}, distance: number}>} Points within radius
     */
    findInRadius(point, radius) {
        const cellX = Math.floor(point.x / this.gridSize);
        const cellY = Math.floor(point.y / this.gridSize);
        const cellRadius = Math.ceil(radius / this.gridSize);
        
        const results = [];
        
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const cellKey = `${cellX + dx},${cellY + dy}`;
                const cellPoints = this.grid.get(cellKey);
                
                if (!cellPoints) continue;
                
                for (const item of cellPoints) {
                    const distance = this._distance(point, item.point);
                    
                    if (distance <= radius) {
                        results.push({
                            index: item.index,
                            point: item.point,
                            distance
                        });
                    }
                }
            }
        }
        
        return results;
    }

    /**
     * Get statistics about the spatial index
     * @returns {Object} Index statistics
     */
    getStats() {
        const cellCounts = Array.from(this.grid.values()).map(cell => cell.length);
        
        return {
            totalPoints: this.points.length,
            totalCells: this.grid.size,
            gridSize: this.gridSize,
            avgPointsPerCell: cellCounts.reduce((a, b) => a + b, 0) / cellCounts.length,
            maxPointsPerCell: Math.max(...cellCounts),
            minPointsPerCell: Math.min(...cellCounts)
        };
    }
}