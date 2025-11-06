/**
 * State Management Module
 * Centralized state management with event-driven updates
 * @module core/state
 */

import eventBus, { Events } from './eventBus.js';
import { DEFAULT_CONFIG, deepClone, validateValue, VALIDATION_RULES } from './config.js';

/**
 * Application state manager
 */
class StateManager {
  constructor() {
    /**
     * Internal state object
     * @type {Object}
     * @private
     */
    this._state = deepClone(DEFAULT_CONFIG);
    
    /**
     * State history for undo functionality (future enhancement)
     * @type {Array<Object>}
     * @private
     */
    this._history = [];
    
    /**
     * Maximum history size
     * @type {number}
     * @private
     */
    this._maxHistorySize = 50;
    
    /**
     * Debug mode flag
     * @type {boolean}
     * @private
     */
    this._debug = true;

    // Make initial state snapshot
    this._saveToHistory();
    
    if (this._debug) {
      console.log('[StateManager] Initialized with default configuration');
    }
  }

  /**
   * Gets the entire state object (read-only)
   * @returns {Object} Deep clone of current state
   */
  getState() {
    return deepClone(this._state);
  }

  /**
   * Gets a specific value from state using dot notation path
   * @param {string} path - Path to value (e.g., 'canvas.width' or 'paint.pointillism.dotDensity')
   * @returns {*} Value at path, or undefined if not found
   * @example
   * const width = state.get('canvas.width');
   * const dotDensity = state.get('paint.pointillism.dotDensity');
   */
  get(path) {
    const keys = path.split('.');
    let value = this._state;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    // Return a deep clone for objects/arrays to prevent external modification
    if (typeof value === 'object' && value !== null) {
      return deepClone(value);
    }

    return value;
  }

  /**
   * Sets a specific value in state using dot notation path
   * @param {string} path - Path to value (e.g., 'canvas.width')
   * @param {*} value - New value
   * @param {boolean} [validate=true] - Whether to validate the value
   * @returns {boolean} Success status
   * @example
   * state.set('canvas.width', 250);
   * state.set('paint.selectedColors', ['#FF0000', '#00FF00']);
   */
  set(path, value, validate = true) {
    // Validate if requested
    if (validate) {
      const validationResult = this._validatePath(path, value);
      if (!validationResult.valid) {
        console.error(`[StateManager] Validation failed for ${path}:`, validationResult.error);
        eventBus.emit(Events.ERROR_OCCURRED, {
          type: 'validation',
          path,
          error: validationResult.error
        });
        return false;
      }
    }

    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this._state;

    // Navigate to parent object
    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }

    // Store old value for comparison
    const oldValue = target[lastKey];

    // Set new value (deep clone if object)
    target[lastKey] = typeof value === 'object' && value !== null ? deepClone(value) : value;

    if (this._debug) {
      console.log(`[StateManager] Set ${path}:`, value);
    }

    // Save to history
    this._saveToHistory();

    // Emit events
    this._emitChangeEvents(path, value, oldValue);

    return true;
  }

  /**
   * Sets multiple values at once
   * @param {Object} updates - Object with paths as keys and new values as values
   * @param {boolean} [validate=true] - Whether to validate values
   * @returns {boolean} Success status (true if all updates succeeded)
   * @example
   * state.setMultiple({
   *   'canvas.width': 250,
   *   'canvas.height': 180,
   *   'robot.moveSpeed': 3500
   * });
   */
  setMultiple(updates, validate = true) {
    let allSucceeded = true;

    for (const [path, value] of Object.entries(updates)) {
      const success = this.set(path, value, validate);
      if (!success) {
        allSucceeded = false;
      }
    }

    return allSucceeded;
  }

  /**
   * Updates nested state by merging with existing values
   * @param {string} path - Path to object to update
   * @param {Object} updates - Object with updates to merge
   * @returns {boolean} Success status
   * @example
   * state.update('paint.pointillism', { dotDensity: 60, randomness: 25 });
   */
  update(path, updates) {
    const current = this.get(path);
    
    if (typeof current !== 'object' || current === null) {
      console.error(`[StateManager] Cannot update non-object at path: ${path}`);
      return false;
    }

    const merged = { ...current, ...updates };
    return this.set(path, merged);
  }

  /**
   * Resets state to default configuration
   * @param {string} [section] - Optional section to reset (e.g., 'canvas', 'robot')
   */
  reset(section) {
    if (section) {
      if (!(section in DEFAULT_CONFIG)) {
        console.error(`[StateManager] Unknown section: ${section}`);
        return;
      }
      this._state[section] = deepClone(DEFAULT_CONFIG[section]);
      this._emitChangeEvents(section, this._state[section], null);
    } else {
      this._state = deepClone(DEFAULT_CONFIG);
      eventBus.emit(Events.STATE_CHANGED, { type: 'reset', state: this.getState() });
    }

    this._saveToHistory();

    if (this._debug) {
      console.log(`[StateManager] Reset ${section || 'all'} to defaults`);
    }
  }

  /**
   * Loads a complete state object
   * @param {Object} newState - New state object
   * @param {boolean} [validate=false] - Whether to validate the entire state
   * @returns {boolean} Success status
   */
  loadState(newState, validate = false) {
    if (validate) {
      // TODO: Implement full state validation
      console.warn('[StateManager] Full state validation not yet implemented');
    }

    const oldState = this._state;
    this._state = deepClone(newState);
    this._saveToHistory();

    eventBus.emit(Events.STATE_CHANGED, {
      type: 'loaded',
      state: this.getState(),
      oldState: deepClone(oldState)
    });

    if (this._debug) {
      console.log('[StateManager] State loaded:', this._state);
    }

    return true;
  }

  /**
   * Subscribes to state changes at a specific path
   * @param {string} path - Path to watch
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   * @example
   * const unsubscribe = state.subscribe('canvas.width', (value) => {
   *   console.log('Width changed to:', value);
   * });
   */
  subscribe(path, callback) {
    const handler = (data) => {
      if (data.path === path || data.path.startsWith(path + '.')) {
        callback(data.value, data.oldValue);
      }
    };

    return eventBus.on(Events.STATE_CHANGED, handler);
  }

  /**
   * Validates a value against its validation rule
   * @param {string} path - Path to validate
   * @param {*} value - Value to validate
   * @returns {Object} Validation result
   * @private
   */
  _validatePath(path, value) {
    const keys = path.split('.');
    let rules = VALIDATION_RULES;

    // Navigate to the validation rule
    for (const key of keys) {
      if (!rules || !(key in rules)) {
        // No validation rule found, allow the value
        return { valid: true };
      }
      rules = rules[key];
    }

    // If we found a rule, validate
    if (rules && (rules.type || rules.min !== undefined || rules.max !== undefined)) {
      return validateValue(value, rules);
    }

    return { valid: true };
  }

  /**
   * Emits appropriate change events based on the path
   * @param {string} path - Changed path
   * @param {*} value - New value
   * @param {*} oldValue - Previous value
   * @private
   */
  _emitChangeEvents(path, value, oldValue) {
    // Emit general state change event
    eventBus.emit(Events.STATE_CHANGED, {
      path,
      value: deepClone(value),
      oldValue: deepClone(oldValue)
    });

    // Emit specific events based on path
    const topLevel = path.split('.')[0];
    
    switch (topLevel) {
      case 'canvas':
        eventBus.emit(Events.CANVAS_SETTINGS_CHANGED, {
          path,
          value: deepClone(value),
          canvas: this.get('canvas')
        });
        break;
        
      case 'robot':
        eventBus.emit(Events.ROBOT_SETTINGS_CHANGED, {
          path,
          value: deepClone(value),
          robot: this.get('robot')
        });
        break;
        
      case 'paint':
        eventBus.emit(Events.PAINT_SETTINGS_CHANGED, {
          path,
          value: deepClone(value),
          paint: this.get('paint')
        });
        break;
        
      case 'nozzle':
        eventBus.emit(Events.NOZZLE_SETTINGS_CHANGED, {
          path,
          value: deepClone(value),
          nozzle: this.get('nozzle')
        });
        break;
    }
  }

  /**
   * Saves current state to history
   * @private
   */
  _saveToHistory() {
    this._history.push(deepClone(this._state));
    
    // Limit history size
    if (this._history.length > this._maxHistorySize) {
      this._history.shift();
    }
  }

  /**
   * Gets the state history
   * @returns {Array<Object>} State history
   */
  getHistory() {
    return this._history.map(state => deepClone(state));
  }

  /**
   * Clears the state history
   */
  clearHistory() {
    this._history = [deepClone(this._state)];
    if (this._debug) {
      console.log('[StateManager] History cleared');
    }
  }

  /**
   * Enables or disables debug logging
   * @param {boolean} enabled - Debug mode flag
   */
  setDebug(enabled) {
    this._debug = enabled;
    console.log(`[StateManager] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Exports state as JSON string
   * @param {boolean} [pretty=false] - Whether to format JSON
   * @returns {string} JSON string
   */
  exportJSON(pretty = false) {
    return JSON.stringify(this._state, null, pretty ? 2 : 0);
  }

  /**
   * Imports state from JSON string
   * @param {string} json - JSON string
   * @returns {boolean} Success status
   */
  importJSON(json) {
    try {
      const parsed = JSON.parse(json);
      return this.loadState(parsed);
    } catch (error) {
      console.error('[StateManager] Failed to import JSON:', error);
      eventBus.emit(Events.ERROR_OCCURRED, {
        type: 'import',
        error: error.message
      });
      return false;
    }
  }
}

// Create and export singleton instance
const state = new StateManager();

export default state;