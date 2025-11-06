/**
 * G-code Exporter Module
 * Handles G-code export to file, clipboard operations, and validation
 */

/**
 * Download G-code as a file
 * @param {string} gcode - The G-code content to download
 * @param {string} filename - The filename to use (without extension)
 * @param {string} format - File format ('gcode', 'nc', or 'txt')
 * @returns {boolean} Success status
 */
export function downloadGCode(gcode, filename = 'mural', format = 'gcode') {
    try {
        if (!gcode || gcode.trim().length === 0) {
            throw new Error('G-code content is empty');
        }

        // Validate the G-code before export
        const validation = validateGCode(gcode);
        if (!validation.isValid) {
            console.warn('G-code validation warnings:', validation.warnings);
        }

        // Determine file extension and MIME type
        const extensions = {
            'gcode': '.gcode',
            'nc': '.nc',
            'txt': '.txt'
        };
        const extension = extensions[format] || '.gcode';
        const fullFilename = filename.endsWith(extension) ? filename : filename + extension;

        // Create blob with appropriate MIME type
        const mimeType = format === 'txt' ? 'text/plain' : 'text/plain';
        const blob = new Blob([gcode], { type: mimeType + ';charset=utf-8' });

        // Create download link and trigger download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fullFilename;
        
        // Append to body, click, and cleanup
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup the URL object after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 100);

        return true;
    } catch (error) {
        console.error('Error downloading G-code:', error);
        throw error;
    }
}

/**
 * Generate a descriptive filename based on configuration
 * @param {Object} config - Configuration object with canvas dimensions and color count
 * @param {number} config.canvasWidth - Canvas width in cm
 * @param {number} config.canvasHeight - Canvas height in cm
 * @param {number} config.numColors - Number of colors
 * @returns {string} Generated filename (without extension)
 */
export function generateFilename(config) {
    try {
        const width = Math.round(config.canvasWidth || 0);
        const height = Math.round(config.canvasHeight || 0);
        const colors = config.numColors || 1;
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        
        return `mural_${width}x${height}_${colors}colors_${dateStr}`;
    } catch (error) {
        console.error('Error generating filename:', error);
        // Fallback to simple filename with timestamp
        return `mural_${Date.now()}`;
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
    try {
        if (!text || text.trim().length === 0) {
            throw new Error('Text content is empty');
        }

        // Try modern Clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }

        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        let success = false;
        try {
            success = document.execCommand('copy');
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }

        document.body.removeChild(textArea);
        
        if (!success) {
            throw new Error('Failed to copy to clipboard');
        }

        return true;
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        throw error;
    }
}

/**
 * Validate G-code content
 * Performs basic validation checks on the G-code
 * @param {string} gcode - G-code content to validate
 * @returns {Object} Validation result with isValid flag and warnings array
 */
export function validateGCode(gcode) {
    const result = {
        isValid: true,
        warnings: [],
        errors: []
    };

    try {
        if (!gcode || typeof gcode !== 'string') {
            result.isValid = false;
            result.errors.push('G-code is not a valid string');
            return result;
        }

        const lines = gcode.trim().split('\n');
        
        if (lines.length === 0) {
            result.isValid = false;
            result.errors.push('G-code is empty');
            return result;
        }

        // Check for common G-code patterns
        const hasGCommands = lines.some(line => /^G\d+/i.test(line.trim()));
        if (!hasGCommands) {
            result.warnings.push('No G-commands found (G0, G1, etc.)');
        }

        // Check for initialization commands
        const hasG28 = lines.some(line => /^G28/i.test(line.trim()));
        if (!hasG28) {
            result.warnings.push('No homing command (G28) found');
        }

        // Check for movement commands
        const hasMovement = lines.some(line => /^G[01]\s+X|^G[01]\s+Y/i.test(line.trim()));
        if (!hasMovement) {
            result.warnings.push('No movement commands (G0/G1 with X/Y) found');
        }

        // Check for end commands
        const hasM2 = lines.some(line => /^M2/i.test(line.trim()));
        const hasM30 = lines.some(line => /^M30/i.test(line.trim()));
        if (!hasM2 && !hasM30) {
            result.warnings.push('No program end command (M2 or M30) found');
        }

        // Check for very short programs
        if (lines.length < 5) {
            result.warnings.push('G-code program seems very short');
        }

        // Check for invalid characters
        const invalidChars = /[^\w\s\.\-\(\);%]/;
        const hasInvalidChars = lines.some((line, index) => {
            const trimmed = line.trim();
            if (trimmed.startsWith(';') || trimmed.startsWith('(')) {
                return false; // Comments are OK
            }
            if (invalidChars.test(trimmed)) {
                result.warnings.push(`Line ${index + 1} contains potentially invalid characters`);
                return true;
            }
            return false;
        });

    } catch (error) {
        result.isValid = false;
        result.errors.push(`Validation error: ${error.message}`);
    }

    return result;
}

/**
 * Get file extension and MIME type for a given format
 * @param {string} format - Format identifier ('gcode', 'nc', 'txt')
 * @returns {Object} Object with extension and mimeType properties
 */
export function getFormatInfo(format) {
    const formats = {
        'gcode': { extension: '.gcode', mimeType: 'text/plain' },
        'nc': { extension: '.nc', mimeType: 'text/plain' },
        'txt': { extension: '.txt', mimeType: 'text/plain' }
    };
    
    return formats[format] || formats['gcode'];
}

/**
 * Show user feedback message
 * Creates a temporary toast notification
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success', 'error', 'warning', 'info')
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showFeedback(message, type = 'info', duration = 3000) {
    // Remove any existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    
    // Add styles inline for immediate visibility
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        font-size: 14px;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
    `;

    document.body.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}