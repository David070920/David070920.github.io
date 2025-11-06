/**
 * G-code Command Builder Module
 * Builds individual G-code commands with proper formatting
 * @module gcode/gcodeBuilder
 */

/**
 * Format a number for G-code output
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number
 * @private
 */
function formatNumber(value, decimals = 2) {
    return Number(value).toFixed(decimals);
}

/**
 * Build a G0 (rapid move) command
 * Moves the robot quickly to a position without painting
 * 
 * @param {number} X - Distance from top-left anchor (mm)
 * @param {number} Y - Distance from top-right anchor (mm)
 * @param {number} Z - Distance from bottom-center anchor (mm)
 * @param {number} [feedRate] - Optional feed rate (mm/min)
 * @returns {string} G-code command
 * 
 * @example
 * G0(1000, 1500, 800);
 * // Returns: "G0 X1000.00 Y1500.00 Z800.00"
 * 
 * G0(1000, 1500, 800, 3000);
 * // Returns: "G0 X1000.00 Y1500.00 Z800.00 F3000"
 */
export function G0(X, Y, Z, feedRate = null) {
    let command = `G0 X${formatNumber(X)} Y${formatNumber(Y)} Z${formatNumber(Z)}`;
    
    if (feedRate !== null) {
        command += ` F${Math.round(feedRate)}`;
    }
    
    return command;
}

/**
 * Build a G1 (linear move) command
 * Moves the robot in a straight line, typically while painting
 * 
 * @param {number} X - Distance from top-left anchor (mm)
 * @param {number} Y - Distance from top-right anchor (mm)
 * @param {number} Z - Distance from bottom-center anchor (mm)
 * @param {number} [feedRate] - Optional feed rate (mm/min)
 * @returns {string} G-code command
 * 
 * @example
 * G1(1000, 1500, 800, 1500);
 * // Returns: "G1 X1000.00 Y1500.00 Z800.00 F1500"
 */
export function G1(X, Y, Z, feedRate = null) {
    let command = `G1 X${formatNumber(X)} Y${formatNumber(Y)} Z${formatNumber(Z)}`;
    
    if (feedRate !== null) {
        command += ` F${Math.round(feedRate)}`;
    }
    
    return command;
}

/**
 * Build a M3 (spray on) command
 * Activates the spray nozzle/solenoid
 * 
 * @returns {string} G-code command
 * 
 * @example
 * M3();
 * // Returns: "M3 S255"
 */
export function M3() {
    return 'M3 S255';
}

/**
 * Build a M5 (spray off) command
 * Deactivates the spray nozzle/solenoid
 * 
 * @returns {string} G-code command
 * 
 * @example
 * M5();
 * // Returns: "M5"
 */
export function M5() {
    return 'M5';
}

/**
 * Build a M6 (tool/can change) command
 * Signals a tool change (paint can swap)
 * 
 * @param {number} [toolNumber] - Optional tool number
 * @returns {string} G-code command
 * 
 * @example
 * M6();
 * // Returns: "M6"
 * 
 * M6(2);
 * // Returns: "M6 T2"
 */
export function M6(toolNumber = null) {
    let command = 'M6';
    
    if (toolNumber !== null) {
        command += ` T${Math.round(toolNumber)}`;
    }
    
    return command;
}

/**
 * Build a G4 (dwell/pause) command
 * Pauses execution for a specified time
 * 
 * @param {number} seconds - Time to pause in seconds
 * @returns {string} G-code command
 * 
 * @example
 * G4(2.5);
 * // Returns: "G4 P2.5"
 */
export function G4(seconds) {
    return `G4 P${formatNumber(seconds, 1)}`;
}

/**
 * Build a comment line
 * Comments are prefixed with semicolon in G-code
 * 
 * @param {string} text - Comment text
 * @returns {string} G-code comment
 * 
 * @example
 * comment('Start of layer 1');
 * // Returns: "; Start of layer 1"
 */
export function comment(text) {
    return `; ${text}`;
}

/**
 * Build a G28 (home) command
 * Returns all axes to home position
 * 
 * @returns {string} G-code command
 * 
 * @example
 * G28();
 * // Returns: "G28"
 */
export function G28() {
    return 'G28';
}

/**
 * Build a G21 (millimeter units) command
 * Sets the units to millimeters
 * 
 * @returns {string} G-code command
 */
export function G21() {
    return 'G21';
}

/**
 * Build a G90 (absolute positioning) command
 * Sets positioning mode to absolute
 * 
 * @returns {string} G-code command
 */
export function G90() {
    return 'G90';
}

/**
 * Build a G91 (relative positioning) command
 * Sets positioning mode to relative
 * 
 * @returns {string} G-code command
 */
export function G91() {
    return 'G91';
}

/**
 * Build a M84 (disable motors) command
 * Disables stepper motors
 * 
 * @returns {string} G-code command
 */
export function M84() {
    return 'M84';
}

/**
 * Build a multi-line comment block
 * Creates a formatted comment block with separator lines
 * 
 * @param {string} title - Block title
 * @param {string[]} [lines] - Optional array of comment lines
 * @returns {string} Multi-line G-code comment
 * 
 * @example
 * commentBlock('Layer 1', ['Color: Red', 'Points: 1523']);
 * // Returns:
 * // "; ================================"
 * // "; Layer 1"
 * // "; Color: Red"
 * // "; Points: 1523"
 * // "; ================================"
 */
export function commentBlock(title, lines = []) {
    const separator = '; ================================';
    let block = [separator, `; ${title}`];
    
    if (lines.length > 0) {
        block.push(...lines.map(line => `; ${line}`));
    }
    
    block.push(separator);
    
    return block.join('\n');
}

/**
 * Build a section separator
 * Creates a visual separator in the G-code
 * 
 * @param {string} [label] - Optional label for the section
 * @returns {string} G-code comment separator
 * 
 * @example
 * separator('INITIALIZATION');
 * // Returns: "; === INITIALIZATION ==="
 */
export function separator(label = null) {
    if (label) {
        return `; === ${label} ===`;
    }
    return '; ========================================';
}

/**
 * Build a move command (G0 or G1) based on spray state
 * Convenience function that chooses command type based on whether painting
 * 
 * @param {number} X - Distance from top-left anchor (mm)
 * @param {number} Y - Distance from top-right anchor (mm)
 * @param {number} Z - Distance from bottom-center anchor (mm)
 * @param {boolean} painting - Whether spray is on
 * @param {number} feedRate - Feed rate (mm/min)
 * @returns {string} G-code command
 */
export function move(X, Y, Z, painting, feedRate) {
    return painting ? G1(X, Y, Z, feedRate) : G0(X, Y, Z, feedRate);
}

/**
 * Build a sequence of commands for a dot painting operation
 * Moves to position, sprays briefly, then stops
 * 
 * @param {number} X - Distance from top-left anchor (mm)
 * @param {number} Y - Distance from top-right anchor (mm)
 * @param {number} Z - Distance from bottom-center anchor (mm)
 * @param {number} dwellTime - Time to spray (seconds)
 * @param {number} moveSpeed - Movement speed (mm/min)
 * @returns {string[]} Array of G-code commands
 * 
 * @example
 * paintDot(1000, 1500, 800, 0.1, 3000);
 * // Returns: [
 * //   "G0 X1000.00 Y1500.00 Z800.00 F3000",
 * //   "M3 S255",
 * //   "G4 P0.1",
 * //   "M5"
 * // ]
 */
export function paintDot(X, Y, Z, dwellTime, moveSpeed) {
    return [
        G0(X, Y, Z, moveSpeed),
        M3(),
        G4(dwellTime),
        M5()
    ];
}

/**
 * Build a sequence of commands for a line painting operation
 * Moves to start, activates spray, moves to end, deactivates spray
 * 
 * @param {Object} start - Start position {X, Y, Z}
 * @param {Object} end - End position {X, Y, Z}
 * @param {number} moveSpeed - Movement speed (mm/min)
 * @param {number} paintSpeed - Painting speed (mm/min)
 * @returns {string[]} Array of G-code commands
 */
export function paintLine(start, end, moveSpeed, paintSpeed) {
    return [
        G0(start.X, start.Y, start.Z, moveSpeed),
        M3(),
        G1(end.X, end.Y, end.Z, paintSpeed),
        M5()
    ];
}

/**
 * Validate coordinate values
 * Ensures coordinates are valid numbers
 * 
 * @param {number} X - X coordinate
 * @param {number} Y - Y coordinate
 * @param {number} Z - Z coordinate
 * @throws {Error} If any coordinate is invalid
 */
export function validateCoordinates(X, Y, Z) {
    if (typeof X !== 'number' || isNaN(X)) {
        throw new Error(`Invalid X coordinate: ${X}`);
    }
    if (typeof Y !== 'number' || isNaN(Y)) {
        throw new Error(`Invalid Y coordinate: ${Y}`);
    }
    if (typeof Z !== 'number' || isNaN(Z)) {
        throw new Error(`Invalid Z coordinate: ${Z}`);
    }
}

export default {
    G0,
    G1,
    M3,
    M5,
    M6,
    G4,
    G28,
    G21,
    G90,
    G91,
    M84,
    comment,
    commentBlock,
    separator,
    move,
    paintDot,
    paintLine,
    validateCoordinates,
    formatNumber
};