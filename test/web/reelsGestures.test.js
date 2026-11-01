import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dragOffset, shouldCommitSwipe, WheelStepper } from '../../web/src/ui/reelsGestures.js';

const HEIGHT = 800;

test('a drag follows the finger when there is a card on that side', () => {
    assert.equal(dragOffset(-120, { hasNeighbor: true }), -120);
    assert.equal(dragOffset(90, { hasNeighbor: true }), 90);
});

test('a drag past the first or last card resists, like hitting the end', () => {
    const offset = dragOffset(-200, { hasNeighbor: false });

    assert.ok(offset < 0 && offset > -200 * 0.5, `${offset}`);
});

test('a long drag commits, a short slow one snaps back', () => {
    assert.equal(shouldCommitSwipe({ offset: -HEIGHT * 0.3, velocity: 0.1, height: HEIGHT }), true);
    assert.equal(shouldCommitSwipe({ offset: -60, velocity: 0.1, height: HEIGHT }), false);
});

test('a quick flick commits even when short, but not a tiny twitch', () => {
    assert.equal(shouldCommitSwipe({ offset: 70, velocity: 0.8, height: HEIGHT }), true);
    assert.equal(shouldCommitSwipe({ offset: 10, velocity: 2, height: HEIGHT }), false);
});

test('wheel: one step per gesture, in the scroll direction', () => {
    const wheel = new WheelStepper();

    assert.equal(wheel.push(30, 0), 0); // below the threshold
    assert.equal(wheel.push(40, 16), 1); // 70 accumulated: step down (next)
    // Trackpad inertia keeps firing while the gesture lasts: ignored
    assert.equal(wheel.push(80, 32), 0);
    assert.equal(wheel.push(80, 150), 0);
});

test('wheel: a new gesture after a pause steps again, also upwards', () => {
    const wheel = new WheelStepper();

    assert.equal(wheel.push(100, 0), 1);
    assert.equal(wheel.push(-100, 0 + WheelStepper.IDLE_MS + 1), -1);
});

test('wheel: separate mouse-wheel notches step one card each', () => {
    const wheel = new WheelStepper();
    const notch = 100;

    assert.equal(wheel.push(notch, 0), 1);
    assert.equal(wheel.push(notch, 400), 1);
});
