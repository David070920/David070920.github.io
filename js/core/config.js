/**
 * Configuration Module
 * Defines default configuration values, validation rules, and preset configurations
 * @module core/config
 */

/**
 * Default configuration values for the application
 * @const {Object}
 */
export const DEFAULT_CONFIG = {
  canvas: {
    width: 200,           // cm
    height: 150,          // cm
    anchorTopLeft: { x: 0, y: 0 },
    anchorTopRight: { x: 200, y: 0 },
    anchorBottomLeft: { x: 0, y: 150 },
    anchorBottomRight: { x: 200, y: 150 }
  },
  
  robot: {
    refillPosition: { x: -10, y: 75 },  // cm, outside canvas
    paintCapacity: 50,                   // ml
    moveSpeed: 3000,                     // mm/min
    paintSpeed: 1500,                    // mm/min
    homePosition: { x: 0, y: 0 }        // cm
  },
  
  paint: {
    numColors: 3,
    selectedColors: ['#FF0000', '#00FF00', '#0000FF'],
    paintingMode: 'pointillism',  // 'pointillism' | 'strokes' | 'spray'
    pointillism: {
      dotDensity: 50,              // percentage
      minDotSize: 1,               // mm
      maxDotSize: 5,               // mm
      randomness: 30               // percentage
    },
    strokes: {
      strokeLength: 10,            // mm
      strokeWidth: 2,              // mm
      strokeDensity: 50,           // percentage
      followContours: true
    },
    spray: {
      sprayDensity: 40,            // percentage
      sprayRadius: 8,              // mm
      sprayPattern: 'circular'     // 'circular' | 'square'
    }
  },
  
  nozzle: {
    shape: 'circular',             // 'circular' | 'flat'
    size: 0.5                      // mm diameter for circular, mm width for flat
  },
  
  processing: {
    imageData: null,
    processedLayers: [],
    gcodeData: null,
    resolution: 'medium'           // 'low' | 'medium' | 'high'
  }
};

/**
 * Configuration validation rules
 * @const {Object}
 */
export const VALIDATION_RULES = {
  canvas: {
    width: { min: 50, max: 1000, type: 'number', unit: 'cm' },
    height: { min: 50, max: 1000, type: 'number', unit: 'cm' }
  },
  
  robot: {
    paintCapacity: { min: 10, max: 500, type: 'number', unit: 'ml' },
    moveSpeed: { min: 500, max: 10000, type: 'number', unit: 'mm/min' },
    paintSpeed: { min: 100, max: 5000, type: 'number', unit: 'mm/min' }
  },
  
  paint: {
    numColors: { min: 1, max: 10, type: 'integer' },
    pointillism: {
      dotDensity: { min: 1, max: 100, type: 'number', unit: '%' },
      minDotSize: { min: 0.5, max: 10, type: 'number', unit: 'mm' },
      maxDotSize: { min: 0.5, max: 20, type: 'number', unit: 'mm' },
      randomness: { min: 0, max: 100, type: 'number', unit: '%' }
    },
    strokes: {
      strokeLength: { min: 1, max: 50, type: 'number', unit: 'mm' },
      strokeWidth: { min: 0.5, max: 10, type: 'number', unit: 'mm' },
      strokeDensity: { min: 1, max: 100, type: 'number', unit: '%' }
    },
    spray: {
      sprayDensity: { min: 1, max: 100, type: 'number', unit: '%' },
      sprayRadius: { min: 1, max: 20, type: 'number', unit: 'mm' }
    }
  },
  
  nozzle: {
    size: { min: 0.1, max: 5, type: 'number', unit: 'mm' }
  }
};

/**
 * Preset configurations for common scenarios
 * @const {Object}
 */
export const PRESETS = {
  smallWall: {
    name: 'Small Wall (1m x 0.75m)',
    description: 'Suitable for indoor walls or small murals',
    config: {
      canvas: {
        width: 100,
        height: 75,
        anchorTopLeft: { x: 0, y: 0 },
        anchorTopRight: { x: 100, y: 0 },
        anchorBottomLeft: { x: 0, y: 75 },
        anchorBottomRight: { x: 100, y: 75 }
      },
      robot: {
        refillPosition: { x: -10, y: 37.5 },
        paintCapacity: 30,
        moveSpeed: 3000,
        paintSpeed: 1500,
        homePosition: { x: 0, y: 0 }
      },
      paint: {
        pointillism: {
          dotDensity: 60,
          minDotSize: 1,
          maxDotSize: 4,
          randomness: 25
        }
      }
    }
  },
  
  mediumWall: {
    name: 'Medium Wall (2m x 1.5m)',
    description: 'Standard wall mural size',
    config: {
      canvas: {
        width: 200,
        height: 150,
        anchorTopLeft: { x: 0, y: 0 },
        anchorTopRight: { x: 200, y: 0 },
        anchorBottomLeft: { x: 0, y: 150 },
        anchorBottomRight: { x: 200, y: 150 }
      },
      robot: {
        refillPosition: { x: -10, y: 75 },
        paintCapacity: 50,
        moveSpeed: 3000,
        paintSpeed: 1500,
        homePosition: { x: 0, y: 0 }
      },
      paint: {
        pointillism: {
          dotDensity: 50,
          minDotSize: 1,
          maxDotSize: 5,
          randomness: 30
        }
      }
    }
  },
  
  largeWall: {
    name: 'Large Wall (3m x 2m)',
    description: 'Large outdoor mural or building facade',
    config: {
      canvas: {
        width: 300,
        height: 200,
        anchorTopLeft: { x: 0, y: 0 },
        anchorTopRight: { x: 300, y: 0 },
        anchorBottomLeft: { x: 0, y: 200 },
        anchorBottomRight: { x: 300, y: 200 }
      },
      robot: {
        refillPosition: { x: -15, y: 100 },
        paintCapacity: 100,
        moveSpeed: 4000,
        paintSpeed: 2000,
        homePosition: { x: 0, y: 0 }
      },
      paint: {
        pointillism: {
          dotDensity: 40,
          minDotSize: 2,
          maxDotSize: 8,
          randomness: 35
        }
      }
    }
  }
};

/**
 * Application constants
 * @const {Object}
 */
export const CONSTANTS = {
  // File handling
  MAX_IMAGE_SIZE: 10 * 1024 * 1024,  // 10MB
  SUPPORTED_IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  
  // Processing
  RESOLUTION_SETTINGS: {
    low: { maxDimension: 800, quality: 0.7 },
    medium: { maxDimension: 1600, quality: 0.85 },
    high: { maxDimension: 3200, quality: 1.0 }
  },
  
  // G-code
  GCODE_HEADER_TEMPLATE: `; MuralBot G-Code
; Generated: {{timestamp}}
; Canvas: {{width}}cm x {{height}}cm
; Colors: {{numColors}}
; Mode: {{paintingMode}}
G21 ; Set units to millimeters
G90 ; Absolute positioning
G28 ; Home all axes
M3 S0 ; Nozzle off
`,
  
  GCODE_FOOTER_TEMPLATE: `
M5 ; Nozzle off
G28 ; Return to home
M84 ; Disable motors
; End of G-Code
`,
  
  // UI
  TAB_IDS: {
    SETTINGS: 'settings-tab',
    IMAGE: 'image-tab',
    PREVIEW: 'preview-tab',
    SIMULATION: 'simulation-tab',
    GCODE: 'gcode-tab'
  },
  
  // Colors
  DEFAULT_COLOR_PALETTE: [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#008000', '#000000'
  ]
};

/**
 * Validates a configuration value against its rule
 * @param {*} value - Value to validate
 * @param {Object} rule - Validation rule object
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
export function validateValue(value, rule) {
  if (value === null || value === undefined) {
    return { valid: false, error: 'Value is required' };
  }

  // Type validation
  if (rule.type === 'number' || rule.type === 'integer') {
    const num = Number(value);
    if (isNaN(num)) {
      return { valid: false, error: 'Value must be a number' };
    }
    
    if (rule.type === 'integer' && !Number.isInteger(num)) {
      return { valid: false, error: 'Value must be an integer' };
    }
    
    // Range validation
    if (rule.min !== undefined && num < rule.min) {
      return { valid: false, error: `Value must be at least ${rule.min}${rule.unit || ''}` };
    }
    
    if (rule.max !== undefined && num > rule.max) {
      return { valid: false, error: `Value must be at most ${rule.max}${rule.unit || ''}` };
    }
  }

  return { valid: true };
}

/**
 * Validates a nested configuration object
 * @param {Object} config - Configuration object to validate
 * @param {Object} rules - Validation rules object
 * @param {string} [path=''] - Current path for error messages
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateConfig(config, rules, path = '') {
  const errors = [];

  for (const key in rules) {
    const rule = rules[key];
    const value = config[key];
    const currentPath = path ? `${path}.${key}` : key;

    // If rule has nested rules, recurse
    if (typeof rule === 'object' && !rule.type && !rule.min && !rule.max) {
      if (typeof value === 'object' && value !== null) {
        const nestedResult = validateConfig(value, rule, currentPath);
        errors.push(...nestedResult.errors);
      }
    } else {
      // Validate leaf value
      const result = validateValue(value, rule);
      if (!result.valid) {
        errors.push(`${currentPath}: ${result.error}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Deep clones an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * Merges two configuration objects (target is modified)
 * @param {Object} target - Target configuration object
 * @param {Object} source - Source configuration object
 * @returns {Object} Merged configuration
 */
export function mergeConfig(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] instanceof Object && !Array.isArray(source[key]) && 
          target[key] instanceof Object && !Array.isArray(target[key])) {
        mergeConfig(target[key], source[key]);
      } else {
        target[key] = deepClone(source[key]);
      }
    }
  }
  return target;
}

/**
 * Gets a preset configuration by key
 * @param {string} presetKey - Preset key (e.g., 'smallWall')
 * @returns {Object|null} Preset configuration or null if not found
 */
export function getPreset(presetKey) {
  if (!PRESETS[presetKey]) {
    console.warn(`[Config] Preset not found: ${presetKey}`);
    return null;
  }

  // Return a deep clone to prevent modification of the original preset
  return deepClone(PRESETS[presetKey]);
}

/**
 * Gets all available preset keys and names
 * @returns {Array<{key: string, name: string, description: string}>}
 */
export function getPresetList() {
  return Object.keys(PRESETS).map(key => ({
    key,
    name: PRESETS[key].name,
    description: PRESETS[key].description
  }));
}

/**
 * Applies a preset to a base configuration
 * @param {Object} baseConfig - Base configuration to merge into
 * @param {string} presetKey - Preset key
 * @returns {Object|null} Merged configuration or null if preset not found
 */
export function applyPreset(baseConfig, presetKey) {
  const preset = getPreset(presetKey);
  if (!preset) {
    return null;
  }

  const merged = deepClone(baseConfig);
  mergeConfig(merged, preset.config);
  return merged;
}

export default {
  DEFAULT_CONFIG,
  VALIDATION_RULES,
  PRESETS,
  CONSTANTS,
  validateValue,
  validateConfig,
  deepClone,
  mergeConfig,
  getPreset,
  getPresetList,
  applyPreset
};