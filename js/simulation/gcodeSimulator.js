/**
 * GCodeSimulator - Parses and simulates G-code execution
 * Renders robot painting actions on the simulation canvas
 */

import eventBus from '../core/eventBus.js';
import { trilaterationToCartesian, scaleToPixels } from '../gcode/coordinateTransformer.js';

/**
 * G-code command types
 */
const CommandType = {
    MOVE: 'MOVE',           // G0/G1 - Movement
    SPRAY_ON: 'SPRAY_ON',   // M106 - Turn spray on
    SPRAY_OFF: 'SPRAY_OFF', // M107 - Turn spray off
    SET_COLOR: 'SET_COLOR', // M117 - Set color
    DWELL: 'DWELL',         // G4 - Pause/dwell
    HOME: 'HOME',           // G28 - Home position
    COMMENT: 'COMMENT'      // ; - Comment
};

/**
 * Simulation events
 */
export const SimulationEvents = {
    STARTED: 'SIMULATION_STARTED',
    PROGRESS: 'SIMULATION_PROGRESS',
    COMPLETE: 'SIMULATION_COMPLETE',
    PAUSED: 'SIMULATION_PAUSED',
    RESUMED: 'SIMULATION_RESUMED',
    STOPPED: 'SIMULATION_STOPPED',
    ERROR: 'SIMULATION_ERROR'
};

/**
 * GCodeSimulator class
 * Parses G-code and simulates robot execution
 */
export class GCodeSimulator {
    /**
     * Create a new GCodeSimulator
     * @param {SimulationRenderer} renderer - The renderer instance
     * @param {Object} config - Configuration object
     * @param {Object} config.anchors - Anchor positions for coordinate transformation
     * @param {Object} config.canvas - Canvas dimensions
     * @param {Object} config.image - Original image dimensions
     * @param {number} config.nozzleSize - Nozzle size in mm
     * @param {string} config.nozzleShape - Nozzle shape ('circular' or 'flat')
     */
    constructor(renderer, config) {
        if (!renderer) {
            throw new Error('GCodeSimulator requires a renderer instance');
        }

        this.renderer = renderer;
        this.config = config || {};
        
        // Robot state
        this.state = {
            x: 0,
            y: 0,
            z: 0,
            sprayOn: false,
            currentColor: '#000000',
            position: { x: 0, y: 0 } // Cartesian position
        };

        // Simulation control
        this.isPaused = false;
        this.isStopped = false;
        this.commands = [];
        this.currentCommandIndex = 0;
        this.totalCommands = 0;
        
        // Animation timing
        this.speedMultipliers = {
            instant: 0,
            fast: 10,
            normal: 1,
            slow: 0.1
        };
        this.currentSpeed = 'instant';
        
        // Event bus for notifications
        this.eventBus = eventBus;
    }

    /**
     * Simulate G-code execution
     * @param {string} gcode - G-code string to simulate
     * @param {string} speed - Simulation speed: 'instant', 'fast', 'normal', 'slow'
     * @returns {Promise<void>} Promise that resolves when simulation completes
     */
    async simulate(gcode, speed = 'instant') {
        if (!gcode || typeof gcode !== 'string') {
            throw new Error('Invalid G-code provided');
        }

        // Reset state
        this.reset();
        this.currentSpeed = speed;

        // Parse G-code into commands
        this.commands = this.parseGCode(gcode);
        this.totalCommands = this.commands.length;

        if (this.totalCommands === 0) {
            this.eventBus.emit(SimulationEvents.ERROR, { 
                message: 'No valid commands found in G-code' 
            });
            return;
        }

        // Clear canvas
        this.renderer.clear();

        // Emit started event
        this.eventBus.emit(SimulationEvents.STARTED, {
            totalCommands: this.totalCommands,
            speed: speed
        });

        // Execute simulation
        if (speed === 'instant') {
            await this.executeInstant();
        } else {
            await this.executeAnimated();
        }

        // Emit complete event
        if (!this.isStopped) {
            this.eventBus.emit(SimulationEvents.COMPLETE, {
                totalCommands: this.totalCommands
            });
        }
    }

    /**
     * Execute all commands instantly (no animation)
     * @private
     */
    async executeInstant() {
        for (let i = 0; i < this.commands.length; i++) {
            if (this.isStopped) break;
            
            this.currentCommandIndex = i;
            await this.executeCommand(this.commands[i]);
        }
    }

    /**
     * Execute commands with animation
     * @private
     */
    async executeAnimated() {
        const speedMultiplier = this.speedMultipliers[this.currentSpeed] || 1;
        
        for (let i = 0; i < this.commands.length; i++) {
            if (this.isStopped) break;

            // Handle pause
            while (this.isPaused && !this.isStopped) {
                await this.sleep(100);
            }

            this.currentCommandIndex = i;
            await this.executeCommand(this.commands[i]);

            // Emit progress
            const progress = (i + 1) / this.totalCommands;
            this.eventBus.emit(SimulationEvents.PROGRESS, {
                progress: progress,
                commandIndex: i + 1,
                totalCommands: this.totalCommands
            });

            // Add delay based on speed (except for instant moves)
            if (this.commands[i].type === CommandType.MOVE && speedMultiplier > 0) {
                const distance = this.calculateDistance(
                    this.state.position,
                    this.commands[i].cartesian
                );
                const delay = Math.min(50, distance * speedMultiplier);
                await this.sleep(delay);
            }
        }
    }

    /**
     * Parse G-code string into command objects
     * @param {string} gcode - G-code string
     * @returns {Array<Object>} Array of parsed commands
     */
    parseGCode(gcode) {
        const lines = gcode.split('\n');
        const commands = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(';')) {
                continue; // Skip empty lines and comments
            }

            const command = this.parseLine(trimmed);
            if (command) {
                commands.push(command);
            }
        }

        return commands;
    }

    /**
     * Parse a single G-code line
     * @private
     * @param {string} line - G-code line
     * @returns {Object|null} Parsed command or null
     */
    parseLine(line) {
        // Remove inline comments
        const codeOnly = line.split(';')[0].trim();
        if (!codeOnly) return null;

        // Extract command code and parameters
        const parts = codeOnly.split(/\s+/);
        const code = parts[0].toUpperCase();
        const params = this.parseParameters(parts.slice(1));

        // Parse based on command code
        if (code === 'G0' || code === 'G1') {
            // Movement command
            return {
                type: CommandType.MOVE,
                code: code,
                x: params.X,
                y: params.Y,
                z: params.Z,
                f: params.F, // Feed rate
                trilateration: { X: params.X, Y: params.Y, Z: params.Z },
                cartesian: this.trilaterationToPixels(params.X, params.Y, params.Z)
            };
        } else if (code === 'M106') {
            // Spray on
            return {
                type: CommandType.SPRAY_ON,
                code: code,
                params: params
            };
        } else if (code === 'M107') {
            // Spray off
            return {
                type: CommandType.SPRAY_OFF,
                code: code
            };
        } else if (code === 'M117') {
            // Set color (custom command)
            const colorMatch = line.match(/COLOR:\s*#?([0-9A-Fa-f]{6})/);
            return {
                type: CommandType.SET_COLOR,
                code: code,
                color: colorMatch ? `#${colorMatch[1]}` : '#000000'
            };
        } else if (code === 'G4') {
            // Dwell/pause
            return {
                type: CommandType.DWELL,
                code: code,
                duration: params.P || params.S || 0
            };
        } else if (code === 'G28') {
            // Home
            return {
                type: CommandType.HOME,
                code: code
            };
        }

        return null;
    }

    /**
     * Parse command parameters
     * @private
     * @param {Array<string>} parts - Parameter strings
     * @returns {Object} Parameter object
     */
    parseParameters(parts) {
        const params = {};
        for (const part of parts) {
            const letter = part[0].toUpperCase();
            const value = parseFloat(part.substring(1));
            if (!isNaN(value)) {
                params[letter] = value;
            }
        }
        return params;
    }

    /**
     * Execute a single command
     * @param {Object} command - Command object
     * @returns {Promise<void>}
     */
    async executeCommand(command) {
        if (!command) return;

        switch (command.type) {
            case CommandType.MOVE:
                await this.executeMove(command);
                break;
            case CommandType.SPRAY_ON:
                this.state.sprayOn = true;
                break;
            case CommandType.SPRAY_OFF:
                this.state.sprayOn = false;
                break;
            case CommandType.SET_COLOR:
                this.state.currentColor = command.color;
                break;
            case CommandType.DWELL:
                if (this.currentSpeed !== 'instant') {
                    await this.sleep(command.duration);
                }
                break;
            case CommandType.HOME:
                this.state.x = 0;
                this.state.y = 0;
                this.state.z = 0;
                this.state.position = { x: 0, y: 0 };
                break;
        }
    }

    /**
     * Execute a move command
     * @private
     * @param {Object} command - Move command
     */
    async executeMove(command) {
        const newX = command.x !== undefined ? command.x : this.state.x;
        const newY = command.y !== undefined ? command.y : this.state.y;
        const newZ = command.z !== undefined ? command.z : this.state.z;

        const newPos = command.cartesian;

        // If spray is on, draw line from current position to new position
        if (this.state.sprayOn && newPos && this.state.position) {
            const nozzleSize = this.getNozzleSizeInPixels();
            const nozzleShape = this.config.nozzleShape || 'circular';

            this.renderer.renderLine(
                this.state.position.x,
                this.state.position.y,
                newPos.x,
                newPos.y,
                this.state.currentColor,
                nozzleSize,
                nozzleShape
            );
        }

        // Update state
        this.state.x = newX;
        this.state.y = newY;
        this.state.z = newZ;
        this.state.position = newPos || this.state.position;
    }

    /**
     * Convert trilateration coordinates to pixel coordinates
     * @private
     * @param {number} X - X distance
     * @param {number} Y - Y distance
     * @param {number} Z - Z distance
     * @returns {Object|null} Pixel coordinates {x, y} or null
     */
    trilaterationToPixels(X, Y, Z) {
        if (X === undefined || Y === undefined || Z === undefined) {
            return null;
        }

        try {
            // Convert trilateration to Cartesian (mm)
            const cartesian = trilaterationToCartesian(X, Y, Z, this.config.anchors);
            if (!cartesian) return null;

            // Convert physical mm to pixel coordinates
            const pixels = scaleToPixels(
                cartesian.x,
                cartesian.y,
                this.config.image.width,
                this.config.image.height,
                this.config.canvas.width * 10, // Convert cm to mm
                this.config.canvas.height * 10
            );

            return pixels;
        } catch (error) {
            console.warn('Coordinate transformation error:', error);
            return null;
        }
    }

    /**
     * Get nozzle size in pixels
     * @private
     * @returns {number} Nozzle size in pixels
     */
    getNozzleSizeInPixels() {
        const nozzleMM = this.config.nozzleSize || 5;
        const canvasMM = this.config.canvas.width * 10;
        const canvasPixels = this.config.image.width;
        const pixelsPerMM = canvasPixels / canvasMM;
        return nozzleMM * pixelsPerMM;
    }

    /**
     * Calculate distance between two points
     * @private
     * @param {Object} p1 - First point {x, y}
     * @param {Object} p2 - Second point {x, y}
     * @returns {number} Distance
     */
    calculateDistance(p1, p2) {
        if (!p1 || !p2) return 0;
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
        );
    }

    /**
     * Pause simulation
     */
    pause() {
        if (!this.isPaused && !this.isStopped) {
            this.isPaused = true;
            this.eventBus.emit(SimulationEvents.PAUSED, {
                commandIndex: this.currentCommandIndex,
                totalCommands: this.totalCommands
            });
        }
    }

    /**
     * Resume simulation
     */
    resume() {
        if (this.isPaused && !this.isStopped) {
            this.isPaused = false;
            this.eventBus.emit(SimulationEvents.RESUMED, {
                commandIndex: this.currentCommandIndex,
                totalCommands: this.totalCommands
            });
        }
    }

    /**
     * Stop simulation
     */
    stop() {
        this.isStopped = true;
        this.isPaused = false;
        this.eventBus.emit(SimulationEvents.STOPPED, {
            commandIndex: this.currentCommandIndex,
            totalCommands: this.totalCommands
        });
    }

    /**
     * Reset simulation state
     */
    reset() {
        this.state = {
            x: 0,
            y: 0,
            z: 0,
            sprayOn: false,
            currentColor: '#000000',
            position: { x: 0, y: 0 }
        };
        this.isPaused = false;
        this.isStopped = false;
        this.currentCommandIndex = 0;
        this.commands = [];
        this.totalCommands = 0;
    }

    /**
     * Get current simulation progress
     * @returns {number} Progress (0-1)
     */
    getProgress() {
        if (this.totalCommands === 0) return 0;
        return this.currentCommandIndex / this.totalCommands;
    }

    /**
     * Check if simulation is running
     * @returns {boolean} True if running
     */
    isRunning() {
        return !this.isPaused && !this.isStopped && this.currentCommandIndex < this.totalCommands;
    }

    /**
     * Sleep helper for animation delays
     * @private
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default GCodeSimulator;