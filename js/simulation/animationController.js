/**
 * AnimationController - Controls simulation playback and animation
 * Manages animation frames and playback controls
 */

import { EventBus } from '../core/eventBus.js';

/**
 * Animation events
 */
export const AnimationEvents = {
    FRAME: 'ANIMATION_FRAME',
    SPEED_CHANGED: 'ANIMATION_SPEED_CHANGED',
    SEEKED: 'ANIMATION_SEEKED'
};

/**
 * Playback states
 */
const PlaybackState = {
    STOPPED: 'stopped',
    PLAYING: 'playing',
    PAUSED: 'paused'
};

/**
 * AnimationController class
 * Controls simulation playback with smooth animation
 */
export class AnimationController {
    /**
     * Create a new AnimationController
     * @param {GCodeSimulator} simulator - The G-code simulator instance
     */
    constructor(simulator) {
        if (!simulator) {
            throw new Error('AnimationController requires a simulator instance');
        }

        this.simulator = simulator;
        this.eventBus = EventBus.getInstance();
        
        // Animation state
        this.state = PlaybackState.STOPPED;
        this.currentSpeed = 'normal';
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        this.targetFrameRate = 60; // Target 60 FPS
        this.frameInterval = 1000 / this.targetFrameRate;
        
        // Progress tracking
        this.progress = 0; // 0 to 1
        this.duration = 0; // Total animation duration in ms
        this.elapsedTime = 0;
        
        // Speed multipliers
        this.speedMultipliers = {
            slow: 0.5,
            normal: 1,
            fast: 2,
            veryFast: 4
        };

        // Bind methods
        this._animate = this._animate.bind(this);
    }

    /**
     * Start or resume animation playback
     * @param {string} speed - Playback speed: 'slow', 'normal', 'fast', 'veryFast'
     */
    play(speed = null) {
        if (speed) {
            this.setSpeed(speed);
        }

        if (this.state === PlaybackState.PLAYING) {
            return; // Already playing
        }

        // Resume simulator if paused
        if (this.state === PlaybackState.PAUSED) {
            this.simulator.resume();
        }

        this.state = PlaybackState.PLAYING;
        this.lastFrameTime = performance.now();
        
        // Start animation loop
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(this._animate);
        }
    }

    /**
     * Pause animation playback
     */
    pause() {
        if (this.state !== PlaybackState.PLAYING) {
            return; // Not playing
        }

        this.state = PlaybackState.PAUSED;
        this.simulator.pause();
        
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Stop animation and reset to beginning
     */
    stop() {
        this.state = PlaybackState.STOPPED;
        this.simulator.stop();
        
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Reset progress
        this.progress = 0;
        this.elapsedTime = 0;
    }

    /**
     * Seek to a specific progress point (0-1)
     * @param {number} progress - Progress value (0 to 1)
     */
    async seek(progress) {
        progress = Math.max(0, Math.min(1, progress));
        
        const wasPlaying = this.state === PlaybackState.PLAYING;
        
        // Pause if playing
        if (wasPlaying) {
            this.pause();
        }

        // Update progress
        this.progress = progress;
        this.elapsedTime = this.duration * progress;

        // Emit seek event
        this.eventBus.emit(AnimationEvents.SEEKED, {
            progress: progress
        });

        // Resume if was playing
        if (wasPlaying) {
            this.play();
        }
    }

    /**
     * Set playback speed
     * @param {string} speed - Speed: 'slow', 'normal', 'fast', 'veryFast'
     */
    setSpeed(speed) {
        if (!this.speedMultipliers.hasOwnProperty(speed)) {
            console.warn(`Invalid speed: ${speed}, using 'normal'`);
            speed = 'normal';
        }

        this.currentSpeed = speed;
        
        this.eventBus.emit(AnimationEvents.SPEED_CHANGED, {
            speed: speed,
            multiplier: this.speedMultipliers[speed]
        });
    }

    /**
     * Get current playback speed
     * @returns {string} Current speed
     */
    getSpeed() {
        return this.currentSpeed;
    }

    /**
     * Get speed multiplier for current speed
     * @returns {number} Speed multiplier
     */
    getSpeedMultiplier() {
        return this.speedMultipliers[this.currentSpeed] || 1;
    }

    /**
     * Get current progress (0-1)
     * @returns {number} Progress value
     */
    getProgress() {
        return this.simulator.getProgress();
    }

    /**
     * Check if animation is playing
     * @returns {boolean} True if playing
     */
    isPlaying() {
        return this.state === PlaybackState.PLAYING;
    }

    /**
     * Check if animation is paused
     * @returns {boolean} True if paused
     */
    isPaused() {
        return this.state === PlaybackState.PAUSED;
    }

    /**
     * Check if animation is stopped
     * @returns {boolean} True if stopped
     */
    isStopped() {
        return this.state === PlaybackState.STOPPED;
    }

    /**
     * Animation loop
     * @private
     * @param {number} timestamp - Current timestamp
     */
    _animate(timestamp) {
        if (this.state !== PlaybackState.PLAYING) {
            return;
        }

        // Calculate delta time
        const deltaTime = timestamp - this.lastFrameTime;

        // Throttle to target frame rate
        if (deltaTime >= this.frameInterval) {
            this.lastFrameTime = timestamp - (deltaTime % this.frameInterval);

            // Update progress
            const progress = this.getProgress();
            
            // Emit frame event with progress
            this.eventBus.emit(AnimationEvents.FRAME, {
                progress: progress,
                timestamp: timestamp,
                deltaTime: deltaTime
            });

            // Check if simulation is complete
            if (!this.simulator.isRunning() && progress >= 1) {
                this.stop();
                return;
            }
        }

        // Continue animation loop
        this.animationFrameId = requestAnimationFrame(this._animate);
    }

    /**
     * Set animation duration estimate
     * @param {number} duration - Duration in milliseconds
     */
    setDuration(duration) {
        this.duration = duration;
    }

    /**
     * Get animation duration estimate
     * @returns {number} Duration in milliseconds
     */
    getDuration() {
        return this.duration;
    }

    /**
     * Get elapsed time
     * @returns {number} Elapsed time in milliseconds
     */
    getElapsedTime() {
        return this.elapsedTime;
    }

    /**
     * Get remaining time
     * @returns {number} Remaining time in milliseconds
     */
    getRemainingTime() {
        return Math.max(0, this.duration - this.elapsedTime);
    }

    /**
     * Reset controller state
     */
    reset() {
        this.stop();
        this.progress = 0;
        this.elapsedTime = 0;
        this.duration = 0;
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stop();
        this.simulator = null;
        this.eventBus = null;
    }

    /**
     * Get playback state
     * @returns {string} Current playback state
     */
    getState() {
        return this.state;
    }

    /**
     * Skip forward by a percentage
     * @param {number} percentage - Percentage to skip (0-100)
     */
    skipForward(percentage = 10) {
        const newProgress = Math.min(1, this.getProgress() + (percentage / 100));
        this.seek(newProgress);
    }

    /**
     * Skip backward by a percentage
     * @param {number} percentage - Percentage to skip (0-100)
     */
    skipBackward(percentage = 10) {
        const newProgress = Math.max(0, this.getProgress() - (percentage / 100));
        this.seek(newProgress);
    }

    /**
     * Jump to start
     */
    jumpToStart() {
        this.seek(0);
    }

    /**
     * Jump to end
     */
    jumpToEnd() {
        this.seek(1);
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (this.isPlaying()) {
            this.pause();
        } else if (this.isPaused() || this.isStopped()) {
            this.play();
        }
    }

    /**
     * Get formatted time string
     * @param {number} ms - Time in milliseconds
     * @returns {string} Formatted time string (MM:SS)
     */
    static formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Get formatted current time
     * @returns {string} Formatted elapsed time
     */
    getFormattedElapsedTime() {
        return AnimationController.formatTime(this.elapsedTime);
    }

    /**
     * Get formatted remaining time
     * @returns {string} Formatted remaining time
     */
    getFormattedRemainingTime() {
        return AnimationController.formatTime(this.getRemainingTime());
    }

    /**
     * Get formatted duration
     * @returns {string} Formatted total duration
     */
    getFormattedDuration() {
        return AnimationController.formatTime(this.duration);
    }
}

export default AnimationController;