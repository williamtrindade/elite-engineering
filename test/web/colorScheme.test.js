import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initColorScheme, resolveTheme } from '../../web/src/ui/ColorScheme.js';

test('resolveTheme uses the saved choice, otherwise the system preference', () => {
    assert.equal(resolveTheme('light', false), 'light');
    assert.equal(resolveTheme('dark', true), 'dark');
    assert.equal(resolveTheme(null, true), 'light');
    assert.equal(resolveTheme(null, false), 'dark');
    assert.equal(resolveTheme('garbage', true), 'light');
});

// Fakes for the button, localStorage and matchMedia
const setup = ({ saved = null, systemLight = false } = {}) => {
    const data = saved ? { theme: saved } : {};
    const listeners = {};
    const button = {
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(type, fn) { listeners.click = fn; }
    };
    const media = { matches: systemLight, addEventListener(type, fn) { listeners.system = fn; } };
    const storage = { getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = value; } };
    const root = { dataset: {} };

    initColorScheme(button, { storage, media, root });
    return { button, root, data, click: () => listeners.click(), systemChanges: matches => listeners.system({ matches }) };
};

test('initColorScheme starts from the system theme and labels the button with the other one', () => {
    const { root, button } = setup({ systemLight: true });

    assert.equal(root.dataset.theme, 'light');
    assert.equal(button.attributes['aria-label'], 'Switch to dark theme');
});

test('initColorScheme toggles and remembers the choice', () => {
    const { root, data, click } = setup();

    click();

    assert.equal(root.dataset.theme, 'light');
    assert.equal(data.theme, 'light');
});

test('initColorScheme follows system changes only until the reader picks a theme', () => {
    const page = setup();
    page.systemChanges(true);
    assert.equal(page.root.dataset.theme, 'light');

    const picked = setup({ saved: 'dark' });
    picked.systemChanges(true);
    assert.equal(picked.root.dataset.theme, 'dark');
});
