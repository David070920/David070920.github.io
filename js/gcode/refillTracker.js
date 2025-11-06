/**
 * Refill Tracker Module
 * Tracks paint consumption and determines when refills are needed
 * @module gcode/refillTracker
 */

/**
 * RefillTracker class
 * Manages paint capacity and consumption tracking
 */
export class RefillTracker {
    constructor() {
        this._paintCapacity = 0;        // Maximum paint capacity (ml)
        this._remainingCapacity = 0;     // Current remaining paint (ml)
        this._consumedPaint = 0;         // Total paint consumed (ml)
        this._refillCount = 0;           // Number of refills performed
        this._usageHistory = [];         // History of usage events
        this._debug = false;
    }

    /**
     * Reset tracker with new paint capacity
     * 
     * @param {number} paintCapacity - Maximum paint capacity in ml
     * 
     * @example
     * tracker.reset(50);
     */
    reset(paintCapacity) {
        if (typeof paintCapacity !== 'number' || paintCapacity <= 0) {
            throw new Error('Paint capacity must be a positive number');
        }

        this._paintCapacity = paintCapacity;
        this._remainingCapacity = paintCapacity;
        this._consumedPaint = 0;
        this._refillCount = 0;
        this._usageHistory = [];

        if (this._debug) {
            console.log(`[RefillTracker] Reset with capacity: ${paintCapacity}ml`);
        }
    }

    /**
     * Add paint usage based on area painted
     * Estimates paint consumption based on painted area
     * 
     * @param {number} area - Area painted in mm²
     * @param {number} [thickness=0.1] - Paint thickness in mm (default: 0.1mm)
     * @returns {boolean} True if refill needed after this usage
     * 
     * @example
     * // Paint a 10mm x 10mm dot
     * const needsRefill = tracker.addUsage(100);
     */
    addUsage(area, thickness = 0.1) {
        if (typeof area !== 'number' || area < 0) {
            throw new Error('Area must be a non-negative number');
        }

        // Calculate volume in ml
        // Volume = area (mm²) × thickness (mm) = mm³
        // Convert mm³ to ml: 1ml = 1000mm³
        const volumeMm3 = area * thickness;
        const volumeMl = volumeMm3 / 1000;

        // Update tracking
        this._remainingCapacity -= volumeMl;
        this._consumedPaint += volumeMl;

        // Record usage
        this._usageHistory.push({
            timestamp: Date.now(),
            area,
            thickness,
            volume: volumeMl,
            remainingAfter: this._remainingCapacity
        });

        if (this._debug) {
            console.log(`[RefillTracker] Used ${volumeMl.toFixed(3)}ml, remaining: ${this._remainingCapacity.toFixed(2)}ml`);
        }

        // Check if refill needed
        return this.needsRefill();
    }

    /**
     * Add paint usage based on line length
     * Estimates paint consumption for a line segment
     * 
     * @param {number} length - Line length in mm
     * @param {number} width - Line width in mm
     * @param {number} [thickness=0.1] - Paint thickness in mm
     * @returns {boolean} True if refill needed after this usage
     * 
     * @example
     * // Paint a 50mm line with 2mm width
     * const needsRefill = tracker.addLineUsage(50, 2);
     */
    addLineUsage(length, width, thickness = 0.1) {
        const area = length * width;
        return this.addUsage(area, thickness);
    }

    /**
     * Add paint usage for a circular dot
     * 
     * @param {number} diameter - Dot diameter in mm
     * @param {number} [thickness=0.1] - Paint thickness in mm
     * @returns {boolean} True if refill needed after this usage
     * 
     * @example
     * // Paint a 5mm diameter dot
     * const needsRefill = tracker.addDotUsage(5);
     */
    addDotUsage(diameter, thickness = 0.1) {
        const radius = diameter / 2;
        const area = Math.PI * radius * radius;
        return this.addUsage(area, thickness);
    }

    /**
     * Check if refill is needed
     * Uses a threshold to ensure we refill before running out
     * 
     * @param {number} [threshold=0.1] - Refill threshold (0-1), default 10% capacity
     * @returns {boolean} True if refill is needed
     * 
     * @example
     * if (tracker.needsRefill()) {
     *   // Generate refill sequence
     * }
     */
    needsRefill(threshold = 0.1) {
        if (threshold < 0 || threshold > 1) {
            throw new Error('Threshold must be between 0 and 1');
        }

        const thresholdCapacity = this._paintCapacity * threshold;
        return this._remainingCapacity <= thresholdCapacity;
    }

    /**
     * Perform refill operation
     * Resets remaining capacity to full and increments refill count
     * 
     * @example
     * tracker.refill();
     */
    refill() {
        this._remainingCapacity = this._paintCapacity;
        this._refillCount++;

        if (this._debug) {
            console.log(`[RefillTracker] Refill #${this._refillCount} completed. Capacity: ${this._paintCapacity}ml`);
        }
    }

    /**
     * Get remaining paint capacity
     * 
     * @returns {number} Remaining capacity in ml
     */
    getRemainingCapacity() {
        return Math.max(0, this._remainingCapacity);
    }

    /**
     * Get remaining capacity as percentage
     * 
     * @returns {number} Percentage (0-100)
     */
    getRemainingPercentage() {
        if (this._paintCapacity === 0) return 0;
        return (this._remainingCapacity / this._paintCapacity) * 100;
    }

    /**
     * Get total number of refills performed
     * 
     * @returns {number} Number of refills
     */
    getRefillCount() {
        return this._refillCount;
    }

    /**
     * Get total paint consumed
     * 
     * @returns {number} Total consumed in ml
     */
    getTotalConsumed() {
        return this._consumedPaint;
    }

    /**
     * Get paint capacity
     * 
     * @returns {number} Paint capacity in ml
     */
    getPaintCapacity() {
        return this._paintCapacity;
    }

    /**
     * Get usage history
     * 
     * @returns {Array} Array of usage events
     */
    getUsageHistory() {
        return [...this._usageHistory];
    }

    /**
     * Get usage statistics
     * 
     * @returns {Object} Statistics object
     */
    getStatistics() {
        return {
            capacity: this._paintCapacity,
            remaining: this.getRemainingCapacity(),
            remainingPercentage: this.getRemainingPercentage(),
            consumed: this._consumedPaint,
            refillCount: this._refillCount,
            usageEvents: this._usageHistory.length,
            averageUsagePerEvent: this._usageHistory.length > 0
                ? this._consumedPaint / this._usageHistory.length
                : 0
        };
    }

    /**
     * Estimate remaining operations
     * Estimates how many more operations can be performed before refill
     * 
     * @param {number} averageUsagePerOperation - Average ml per operation
     * @returns {number} Estimated number of operations
     */
    estimateRemainingOperations(averageUsagePerOperation) {
        if (averageUsagePerOperation <= 0) {
            return Infinity;
        }
        return Math.floor(this._remainingCapacity / averageUsagePerOperation);
    }

    /**
     * Predict if operations can be completed without refill
     * 
     * @param {number} operationCount - Number of operations planned
     * @param {number} averageUsagePerOperation - Average ml per operation
     * @returns {boolean} True if operations can be completed
     */
    canCompleteOperations(operationCount, averageUsagePerOperation) {
        const requiredCapacity = operationCount * averageUsagePerOperation;
        return this._remainingCapacity >= requiredCapacity;
    }

    /**
     * Enable or disable debug logging
     * 
     * @param {boolean} enabled - Debug mode flag
     */
    setDebug(enabled) {
        this._debug = enabled;
        console.log(`[RefillTracker] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Export tracker state as JSON
     * 
     * @returns {string} JSON string
     */
    exportState() {
        return JSON.stringify({
            paintCapacity: this._paintCapacity,
            remainingCapacity: this._remainingCapacity,
            consumedPaint: this._consumedPaint,
            refillCount: this._refillCount,
            usageHistory: this._usageHistory
        }, null, 2);
    }

    /**
     * Import tracker state from JSON
     * 
     * @param {string} json - JSON string
     */
    importState(json) {
        try {
            const state = JSON.parse(json);
            this._paintCapacity = state.paintCapacity;
            this._remainingCapacity = state.remainingCapacity;
            this._consumedPaint = state.consumedPaint;
            this._refillCount = state.refillCount;
            this._usageHistory = state.usageHistory || [];

            if (this._debug) {
                console.log('[RefillTracker] State imported successfully');
            }
        } catch (error) {
            throw new Error(`Failed to import state: ${error.message}`);
        }
    }
}

/**
 * Create a new refill tracker instance
 * 
 * @param {number} paintCapacity - Initial paint capacity in ml
 * @returns {RefillTracker} New tracker instance
 */
export function createRefillTracker(paintCapacity) {
    const tracker = new RefillTracker();
    tracker.reset(paintCapacity);
    return tracker;
}

export default {
    RefillTracker,
    createRefillTracker
};