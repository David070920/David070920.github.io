/**
 * SimulationRenderer - Renders painting simulation on canvas
 * Supports different nozzle shapes and realistic paint effects
 */

/**
 * SimulationRenderer class
 * Handles rendering of robot painting actions on a canvas
 */
export class SimulationRenderer {
    /**
     * Create a new SimulationRenderer
     * @param {HTMLCanvasElement} canvas - The canvas element to render on
     */
    constructor(canvas) {
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error('SimulationRenderer requires a valid canvas element');
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { willReadFrequently: false });
        this.backgroundColor = '#FFFFFF';
        
        // Enable image smoothing for better quality
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Initialize with white background
        this.clear();
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Set the canvas background color
     * @param {string} color - CSS color string
     */
    setBackground(color) {
        this.backgroundColor = color;
        this.clear();
    }

    /**
     * Render a single dot (spray point)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} color - CSS color string
     * @param {number} size - Dot size in pixels
     * @param {string} shape - Nozzle shape: 'circular' or 'flat'
     */
    renderDot(x, y, color, size, shape = 'circular') {
        if (!this._isValidCoordinate(x, y)) {
            return;
        }

        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.globalCompositeOperation = 'source-over';

        if (shape === 'circular') {
            // Circular nozzle - render as circle
            this.ctx.beginPath();
            this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            // Flat/rectangular nozzle - render as square
            const halfSize = size / 2;
            this.ctx.fillRect(x - halfSize, y - halfSize, size, size);
        }

        this.ctx.restore();
    }

    /**
     * Render a line segment
     * @param {number} x1 - Start X coordinate
     * @param {number} y1 - Start Y coordinate
     * @param {number} x2 - End X coordinate
     * @param {number} y2 - End Y coordinate
     * @param {string} color - CSS color string
     * @param {number} thickness - Line thickness in pixels
     * @param {string} shape - Nozzle shape: 'circular' or 'flat'
     */
    renderLine(x1, y1, x2, y2, color, thickness, shape = 'circular') {
        if (!this._isValidCoordinate(x1, y1) || !this._isValidCoordinate(x2, y2)) {
            return;
        }

        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = thickness;
        this.ctx.lineCap = shape === 'circular' ? 'round' : 'butt';
        this.ctx.lineJoin = shape === 'circular' ? 'round' : 'miter';
        this.ctx.globalCompositeOperation = 'source-over';

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        this.ctx.restore();
    }

    /**
     * Render a polyline (connected line segments)
     * @param {Array<{x: number, y: number}>} points - Array of points
     * @param {string} color - CSS color string
     * @param {number} thickness - Line thickness in pixels
     * @param {string} shape - Nozzle shape: 'circular' or 'flat'
     */
    renderPolyline(points, color, thickness, shape = 'circular') {
        if (!points || points.length < 2) {
            return;
        }

        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = thickness;
        this.ctx.lineCap = shape === 'circular' ? 'round' : 'butt';
        this.ctx.lineJoin = shape === 'circular' ? 'round' : 'miter';
        this.ctx.globalCompositeOperation = 'source-over';

        this.ctx.beginPath();
        const firstPoint = points[0];
        
        if (!this._isValidCoordinate(firstPoint.x, firstPoint.y)) {
            this.ctx.restore();
            return;
        }

        this.ctx.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i < points.length; i++) {
            const point = points[i];
            if (this._isValidCoordinate(point.x, point.y)) {
                this.ctx.lineTo(point.x, point.y);
            }
        }

        this.ctx.stroke();
        this.ctx.restore();
    }

    /**
     * Render a filled path
     * @param {Array<{x: number, y: number}>} points - Array of points defining the path
     * @param {string} color - CSS color string
     */
    renderFilledPath(points, color) {
        if (!points || points.length < 3) {
            return;
        }

        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.globalCompositeOperation = 'source-over';

        this.ctx.beginPath();
        const firstPoint = points[0];
        
        if (!this._isValidCoordinate(firstPoint.x, firstPoint.y)) {
            this.ctx.restore();
            return;
        }

        this.ctx.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i < points.length; i++) {
            const point = points[i];
            if (this._isValidCoordinate(point.x, point.y)) {
                this.ctx.lineTo(point.x, point.y);
            }
        }

        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }

    /**
     * Get the current canvas content as ImageData
     * @returns {ImageData} The canvas image data
     */
    getImageData() {
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Set the canvas content from ImageData
     * @param {ImageData} imageData - The image data to set
     */
    setImageData(imageData) {
        this.ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Get the canvas dimensions
     * @returns {{width: number, height: number}} Canvas dimensions
     */
    getDimensions() {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    /**
     * Resize the canvas
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.clear();
    }

    /**
     * Draw an image onto the canvas
     * @param {HTMLImageElement|HTMLCanvasElement} image - The image to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width to draw
     * @param {number} height - Height to draw
     */
    drawImage(image, x = 0, y = 0, width = null, height = null) {
        if (!image) return;

        this.ctx.save();
        if (width !== null && height !== null) {
            this.ctx.drawImage(image, x, y, width, height);
        } else {
            this.ctx.drawImage(image, x, y);
        }
        this.ctx.restore();
    }

    /**
     * Apply alpha blending to simulate paint transparency
     * @param {number} alpha - Alpha value (0-1)
     */
    setGlobalAlpha(alpha) {
        this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    }

    /**
     * Reset global alpha to fully opaque
     */
    resetGlobalAlpha() {
        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Validate coordinates are within canvas bounds
     * @private
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if coordinates are valid
     */
    _isValidCoordinate(x, y) {
        return !isNaN(x) && !isNaN(y) && 
               isFinite(x) && isFinite(y);
    }

    /**
     * Save the current canvas state
     */
    save() {
        this.ctx.save();
    }

    /**
     * Restore the previous canvas state
     */
    restore() {
        this.ctx.restore();
    }

    /**
     * Export canvas as data URL
     * @param {string} type - Image MIME type (default: 'image/png')
     * @param {number} quality - Image quality for lossy formats (0-1)
     * @returns {string} Data URL of the canvas
     */
    toDataURL(type = 'image/png', quality = 1.0) {
        return this.canvas.toDataURL(type, quality);
    }

    /**
     * Export canvas as Blob
     * @param {string} type - Image MIME type (default: 'image/png')
     * @param {number} quality - Image quality for lossy formats (0-1)
     * @returns {Promise<Blob>} Promise resolving to canvas Blob
     */
    toBlob(type = 'image/png', quality = 1.0) {
        return new Promise((resolve) => {
            this.canvas.toBlob(resolve, type, quality);
        });
    }
}

export default SimulationRenderer;