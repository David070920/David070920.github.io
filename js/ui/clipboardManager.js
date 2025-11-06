/**
 * Clipboard Manager Module
 * Handles clipboard operations with modern API and fallback support
 */

/**
 * Copy text to clipboard
 * Uses modern Clipboard API with fallback to older methods
 * @param {string} text - Text to copy to clipboard
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function copy(text) {
    try {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw new Error('Invalid text content for clipboard');
        }

        // Try modern Clipboard API first (requires HTTPS or localhost)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }

        // Fallback to execCommand method for older browsers
        return copyFallback(text);
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        
        // If modern API failed, try fallback
        try {
            return copyFallback(text);
        } catch (fallbackError) {
            console.error('Fallback copy also failed:', fallbackError);
            throw new Error('Failed to copy to clipboard. Please copy manually.');
        }
    }
}

/**
 * Fallback method to copy text using older execCommand API
 * @param {string} text - Text to copy
 * @returns {boolean} Success status
 * @private
 */
function copyFallback(text) {
    const textArea = document.createElement('textarea');
    
    // Style the textarea to be invisible but functional
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    
    // For iOS compatibility
    if (navigator.userAgent.match(/ipad|iphone/i)) {
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        textArea.setSelectionRange(0, 999999);
    } else {
        textArea.select();
        textArea.focus();
    }

    let success = false;
    try {
        success = document.execCommand('copy');
    } catch (err) {
        console.error('execCommand copy failed:', err);
        success = false;
    }

    document.body.removeChild(textArea);
    
    if (!success) {
        throw new Error('execCommand copy failed');
    }
    
    return success;
}

/**
 * Paste text from clipboard
 * Uses modern Clipboard API with fallback
 * @returns {Promise<string>} The pasted text
 */
export async function paste() {
    try {
        // Try modern Clipboard API first
        if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            return text;
        }

        // Fallback: prompt user to paste manually
        throw new Error('Clipboard read not supported. Please paste manually.');
    } catch (error) {
        console.error('Error reading from clipboard:', error);
        throw new Error('Failed to read from clipboard. Please paste manually.');
    }
}

/**
 * Check if clipboard API is supported
 * @returns {Object} Object with read and write support status
 */
export function isSupported() {
    const support = {
        write: false,
        read: false,
        modern: false,
        fallback: false
    };

    // Check modern Clipboard API
    if (navigator.clipboard) {
        support.modern = true;
        support.write = typeof navigator.clipboard.writeText === 'function';
        support.read = typeof navigator.clipboard.readText === 'function';
    }

    // Check fallback support (execCommand)
    support.fallback = document.queryCommandSupported && 
                       document.queryCommandSupported('copy');

    return support;
}

/**
 * Request clipboard permissions (mainly for read operations)
 * @returns {Promise<boolean>} True if permission granted
 */
export async function requestPermission() {
    try {
        // Only modern browsers support Permissions API for clipboard
        if (!navigator.permissions || !navigator.permissions.query) {
            // Assume permission is granted if API not available
            return true;
        }

        const readPermission = await navigator.permissions.query({ 
            name: 'clipboard-read' 
        });
        
        const writePermission = await navigator.permissions.query({ 
            name: 'clipboard-write' 
        });

        return readPermission.state === 'granted' || 
               readPermission.state === 'prompt' ||
               writePermission.state === 'granted' || 
               writePermission.state === 'prompt';
    } catch (error) {
        // If permission query fails, assume we can try the operation
        console.warn('Could not query clipboard permissions:', error);
        return true;
    }
}

/**
 * Copy text with user feedback
 * Wrapper around copy() that shows feedback messages
 * @param {string} text - Text to copy
 * @param {Function} feedbackCallback - Optional callback for showing feedback (message, type)
 * @returns {Promise<boolean>} Success status
 */
export async function copyWithFeedback(text, feedbackCallback = null) {
    try {
        await copy(text);
        
        if (feedbackCallback) {
            feedbackCallback('Copied to clipboard!', 'success');
        }
        
        return true;
    } catch (error) {
        if (feedbackCallback) {
            feedbackCallback('Failed to copy to clipboard', 'error');
        }
        throw error;
    }
}

/**
 * Get clipboard capabilities information
 * @returns {Object} Object describing clipboard capabilities
 */
export function getCapabilities() {
    const support = isSupported();
    
    return {
        canWrite: support.write || support.fallback,
        canRead: support.read,
        apiType: support.modern ? 'modern' : support.fallback ? 'legacy' : 'none',
        requiresHTTPS: support.modern && location.protocol !== 'https:' && 
                       location.hostname !== 'localhost' && 
                       location.hostname !== '127.0.0.1',
        details: support
    };
}