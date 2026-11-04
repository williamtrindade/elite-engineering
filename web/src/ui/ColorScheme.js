// Light or dark theme, as data-theme on <html> (style.css styles both).
// The inline script in index.html's <head> applies it before the first paint, so the page
// never flashes the wrong one; this module keeps the toggle button and the system in sync.

// Same key as the inline script
const STORAGE_KEY = 'theme';

/**
 * The theme to show: the reader's choice if they made one, otherwise the system's.
 * @returns {'light' | 'dark'}
 */
export function resolveTheme(saved, systemPrefersLight) {
    if (saved === 'light' || saved === 'dark') return saved;
    return systemPrefersLight ? 'light' : 'dark';
}

export function initColorScheme(button, {
    storage = window.localStorage,
    media = window.matchMedia('(prefers-color-scheme: light)'),
    root = document.documentElement
} = {}) {
    // Storage can throw (private mode, blocked site data): the theme then just isn't remembered
    const saved = () => {
        try { return storage.getItem(STORAGE_KEY); } catch { return null; }
    };

    const show = theme => {
        root.dataset.theme = theme;
        const other = theme === 'light' ? 'dark' : 'light';
        button.innerHTML = `<i class="fas fa-${theme === 'light' ? 'moon' : 'sun'}" aria-hidden="true"></i>`;
        button.setAttribute('aria-label', `Switch to ${other} theme`);
        button.setAttribute('title', `Switch to ${other} theme`);
    };

    show(resolveTheme(saved(), media.matches));

    button.addEventListener('click', () => {
        const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
        try { storage.setItem(STORAGE_KEY, theme); } catch { /* not remembered */ }
        show(theme);
    });

    // Until the reader picks one, follow the system as it changes (e.g. automatic dark mode at night)
    media.addEventListener('change', event => {
        if (!saved()) show(resolveTheme(null, event.matches));
    });
}
