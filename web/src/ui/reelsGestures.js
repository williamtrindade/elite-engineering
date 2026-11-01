// Gesture decisions for Reels, kept apart from the DOM so they can be tested.
// Offsets are in px: negative = dragged up (towards the next card).

const RESISTANCE = 0.3;
const COMMIT_RATIO = 0.25; // Drag a quarter of the screen to change card...
const FLICK_VELOCITY = 0.5; // ...or flick faster than this (px/ms)
const FLICK_MIN_PX = 40;

// Where the card sits while dragging: it follows the finger, or resists past the first/last card
export function dragOffset(delta, { hasNeighbor }) {
    return hasNeighbor ? delta : delta * RESISTANCE;
}

// On release: change card (true) or snap back (false)
export function shouldCommitSwipe({ offset, velocity, height }) {
    const distance = Math.abs(offset);
    return distance > height * COMMIT_RATIO || (distance > FLICK_MIN_PX && velocity > FLICK_VELOCITY);
}

/**
 * Turns wheel events into card steps. A trackpad swipe fires dozens of events (plus inertia),
 * so it steps once per gesture; a gesture ends after IDLE_MS without events.
 */
export class WheelStepper {
    static THRESHOLD = 50;
    static IDLE_MS = 200;

    accumulated = 0;
    lastEventAt = -Infinity;
    stepped = false;

    /**
     * @param {number} deltaY wheel delta in px (positive = scroll down)
     * @param {number} now timestamp in ms
     * @returns {-1 | 0 | 1} the step to take: 1 = next card, -1 = previous, 0 = none
     */
    push(deltaY, now) {
        if (now - this.lastEventAt > WheelStepper.IDLE_MS) {
            this.accumulated = 0;
            this.stepped = false;
        }
        this.lastEventAt = now;

        if (this.stepped) return 0;

        this.accumulated += deltaY;
        if (Math.abs(this.accumulated) < WheelStepper.THRESHOLD) return 0;

        this.stepped = true;
        return Math.sign(this.accumulated);
    }
}
