/**
 * Event Bus Module
 * Implements a simple publish/subscribe event system for application-wide communication
 * @module core/eventBus
 */

/**
 * Event name constants
 * @enum {string}
 */
export const Events = {
  // State change events
  STATE_CHANGED: 'state:changed',
  
  // Canvas events
  CANVAS_SETTINGS_CHANGED: 'canvas:settingsChanged',
  
  // Robot events
  ROBOT_SETTINGS_CHANGED: 'robot:settingsChanged',
  
  // Paint events
  PAINT_SETTINGS_CHANGED: 'paint:settingsChanged',
  COLOR_ADDED: 'paint:colorAdded',
  COLOR_REMOVED: 'paint:colorRemoved',
  
  // Nozzle events
  NOZZLE_SETTINGS_CHANGED: 'nozzle:settingsChanged',
  
  // Image processing events
  IMAGE_UPLOADED: 'image:uploaded',
  IMAGE_PROCESSED: 'image:processed',
  PROCESSING_STARTED: 'processing:started',
  PROCESSING_PROGRESS: 'processing:progress',
  PROCESSING_COMPLETED: 'processing:completed',
  PROCESSING_ERROR: 'processing:error',
  
  // G-code events
  GCODE_GENERATION_STARTED: 'gcode:generationStarted',
  GCODE_GENERATION_PROGRESS: 'gcode:generationProgress',
  GCODE_GENERATED: 'gcode:generated',
  GCODE_GENERATION_ERROR: 'gcode:generationError',
  GCODE_DOWNLOADED: 'gcode:downloaded',
  
  // Simulation events
  SIMULATION_STARTED: 'simulation:started',
  SIMULATION_PAUSED: 'simulation:paused',
  SIMULATION_RESUMED: 'simulation:resumed',
  SIMULATION_STOPPED: 'simulation:stopped',
  SIMULATION_COMPLETED: 'simulation:completed',
  
  // Preset events
  PRESET_LOADED: 'preset:loaded',
  
  // UI events
  TAB_CHANGED: 'ui:tabChanged',
  
  // Error events
  ERROR_OCCURRED: 'error:occurred',
  WARNING_OCCURRED: 'warning:occurred'
};

/**
 * EventBus class for managing application events
 */
class EventBus {
  constructor() {
    /**
     * Map of event names to arrays of listener callbacks
     * @type {Map<string, Function[]>}
     * @private
     */
    this.listeners = new Map();
    
    /**
     * Debug mode flag
     * @type {boolean}
     * @private
     */
    this.debug = true;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to execute when event is emitted
   * @returns {Function} Unsubscribe function
   * @example
   * const unsubscribe = eventBus.on(Events.STATE_CHANGED, (data) => {
   *   console.log('State changed:', data);
   * });
   * // Later: unsubscribe();
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push(callback);

    if (this.debug) {
      console.log(`[EventBus] Listener registered for: ${event}`);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   * @example
   * eventBus.off(Events.STATE_CHANGED, myCallback);
   */
  off(event, callback) {
    if (!this.listeners.has(event)) {
      return;
    }

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);

    if (index !== -1) {
      callbacks.splice(index, 1);
      
      if (this.debug) {
        console.log(`[EventBus] Listener removed for: ${event}`);
      }
    }

    // Clean up empty listener arrays
    if (callbacks.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit an event with optional data
   * @param {string} event - Event name
   * @param {*} [data] - Optional data to pass to listeners
   * @example
   * eventBus.emit(Events.STATE_CHANGED, { key: 'canvasWidth', value: 200 });
   */
  emit(event, data) {
    if (this.debug) {
      console.log(`[EventBus] Event emitted: ${event}`, data);
    }

    if (!this.listeners.has(event)) {
      return;
    }

    const callbacks = this.listeners.get(event);
    
    // Create a copy to avoid issues if listeners modify the array during iteration
    [...callbacks].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in listener for ${event}:`, error);
        // Emit error event (but avoid infinite loop if error handler itself fails)
        if (event !== Events.ERROR_OCCURRED) {
          this.emit(Events.ERROR_OCCURRED, { event, error });
        }
      }
    });
  }

  /**
   * Subscribe to an event for one-time execution only
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to execute once
   * @returns {Function} Unsubscribe function
   * @example
   * eventBus.once(Events.IMAGE_UPLOADED, (data) => {
   *   console.log('Image uploaded (fired once):', data);
   * });
   */
  once(event, callback) {
    const onceWrapper = (data) => {
      callback(data);
      this.off(event, onceWrapper);
    };

    return this.on(event, onceWrapper);
  }

  /**
   * Remove all listeners for a specific event or all events
   * @param {string} [event] - Optional event name. If not provided, clears all listeners
   * @example
   * eventBus.clear(Events.STATE_CHANGED); // Clear specific event
   * eventBus.clear(); // Clear all events
   */
  clear(event) {
    if (event) {
      this.listeners.delete(event);
      if (this.debug) {
        console.log(`[EventBus] All listeners cleared for: ${event}`);
      }
    } else {
      this.listeners.clear();
      if (this.debug) {
        console.log('[EventBus] All listeners cleared');
      }
    }
  }

  /**
   * Get the number of listeners for a specific event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    return this.listeners.has(event) ? this.listeners.get(event).length : 0;
  }

  /**
   * Get all registered event names
   * @returns {string[]} Array of event names
   */
  eventNames() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Enable or disable debug logging
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebug(enabled) {
    this.debug = enabled;
    console.log(`[EventBus] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create and export singleton instance
const eventBus = new EventBus();

export default eventBus;