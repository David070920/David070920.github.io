/**
 * File Manager Module
 * Manages file operations for configurations and project files
 */

/**
 * Save configuration as JSON file
 * @param {Object} config - Configuration object to save
 * @param {string} filename - Filename (without extension)
 * @returns {boolean} Success status
 */
export function saveConfiguration(config, filename = 'muralbot-config') {
    try {
        if (!config || typeof config !== 'object') {
            throw new Error('Invalid configuration object');
        }

        // Add metadata to configuration
        const configWithMeta = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            type: 'muralbot-configuration',
            ...config
        };

        // Convert to JSON with pretty formatting
        const jsonString = JSON.stringify(configWithMeta, null, 2);

        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);

        return true;
    } catch (error) {
        console.error('Error saving configuration:', error);
        throw error;
    }
}

/**
 * Load configuration from JSON file
 * @param {File} file - File object to load
 * @returns {Promise<Object>} Parsed configuration object
 */
export async function loadConfiguration(file) {
    try {
        if (!file) {
            throw new Error('No file provided');
        }

        // Check file extension
        if (!file.name.endsWith('.json')) {
            throw new Error('Invalid file type. Expected .json file');
        }

        // Read file content
        const text = await readFileAsText(file);
        
        // Parse JSON
        const config = JSON.parse(text);

        // Validate configuration structure
        const validation = validateConfiguration(config);
        if (!validation.isValid) {
            throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }

        return config;
    } catch (error) {
        console.error('Error loading configuration:', error);
        throw error;
    }
}

/**
 * Export complete project (configuration + G-code + metadata)
 * @param {Object} state - Application state
 * @param {string} gcode - Generated G-code
 * @param {string} filename - Filename (without extension)
 * @returns {boolean} Success status
 */
export function exportProject(state, gcode, filename = 'muralbot-project') {
    try {
        if (!state || !gcode) {
            throw new Error('Invalid state or G-code');
        }

        // Create project package
        const project = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            type: 'muralbot-project',
            configuration: state.config || {},
            gcode: gcode,
            metadata: {
                estimatedTime: state.estimatedTime || null,
                paintConsumed: state.paintConsumed || null,
                travelDistance: state.travelDistance || null,
                refillsNeeded: state.refillsNeeded || null
            }
        };

        // Convert to JSON
        const jsonString = JSON.stringify(project, null, 2);

        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);

        return true;
    } catch (error) {
        console.error('Error exporting project:', error);
        throw error;
    }
}

/**
 * Import complete project
 * @param {File} file - Project file to import
 * @returns {Promise<Object>} Project data with configuration and G-code
 */
export async function importProject(file) {
    try {
        if (!file) {
            throw new Error('No file provided');
        }

        // Check file extension
        if (!file.name.endsWith('.json')) {
            throw new Error('Invalid file type. Expected .json file');
        }

        // Read file content
        const text = await readFileAsText(file);
        
        // Parse JSON
        const project = JSON.parse(text);

        // Validate project structure
        if (project.type !== 'muralbot-project') {
            throw new Error('Invalid project file type');
        }

        if (!project.configuration || !project.gcode) {
            throw new Error('Project file is missing required data');
        }

        return project;
    } catch (error) {
        console.error('Error importing project:', error);
        throw error;
    }
}

/**
 * Read file as text using FileReader API
 * @param {File} file - File to read
 * @returns {Promise<string>} File content as text
 * @private
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            resolve(event.target.result);
        };
        
        reader.onerror = (error) => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
}

/**
 * Validate configuration structure
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result with isValid flag and errors array
 * @private
 */
function validateConfiguration(config) {
    const result = {
        isValid: true,
        errors: [],
        warnings: []
    };

    if (!config || typeof config !== 'object') {
        result.isValid = false;
        result.errors.push('Configuration is not an object');
        return result;
    }

    // Check for expected fields (optional, but warn if missing)
    const expectedFields = ['canvasWidth', 'canvasHeight', 'numColors'];
    expectedFields.forEach(field => {
        if (!(field in config)) {
            result.warnings.push(`Missing field: ${field}`);
        }
    });

    // Validate numeric fields if present
    if ('canvasWidth' in config && (typeof config.canvasWidth !== 'number' || config.canvasWidth <= 0)) {
        result.errors.push('canvasWidth must be a positive number');
        result.isValid = false;
    }

    if ('canvasHeight' in config && (typeof config.canvasHeight !== 'number' || config.canvasHeight <= 0)) {
        result.errors.push('canvasHeight must be a positive number');
        result.isValid = false;
    }

    if ('numColors' in config && (typeof config.numColors !== 'number' || config.numColors < 1)) {
        result.errors.push('numColors must be a positive number');
        result.isValid = false;
    }

    return result;
}

/**
 * Create a file input element and trigger file selection
 * @param {string} accept - File types to accept (e.g., '.json')
 * @param {Function} callback - Callback function to handle selected file
 */
export function promptFileSelection(accept = '.json', callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    
    input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && callback) {
            callback(file);
        }
        document.body.removeChild(input);
    });
    
    document.body.appendChild(input);
    input.click();
}

/**
 * Export multiple files as a ZIP archive (requires JSZip library)
 * Note: This is a placeholder for future implementation
 * @param {Object} files - Object with filename: content pairs
 * @param {string} zipFilename - Name of the ZIP file
 * @returns {Promise<boolean>} Success status
 */
export async function exportAsZip(files, zipFilename = 'muralbot-export.zip') {
    // This would require including JSZip library
    // For now, throw an error indicating it's not implemented
    throw new Error('ZIP export not yet implemented. Consider including JSZip library.');
}

/**
 * Get file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if File API is supported
 * @returns {boolean} True if File API is supported
 */
export function isFileAPISupported() {
    return !!(window.File && window.FileReader && window.FileList && window.Blob);
}