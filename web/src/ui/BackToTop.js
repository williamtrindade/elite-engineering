// Floating button that shows once the first screen is scrolled past and scrolls back to the top
export function initBackToTop(button) {
    const update = () => {
        const visible = window.scrollY > window.innerHeight;
        button.classList.toggle('is-visible', visible);
        // Hidden, it stays out of the tab order too
        button.tabIndex = visible ? 0 : -1;
    };

    window.addEventListener('scroll', update, { passive: true });
    update();

    button.addEventListener('click', () => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        // Keyboard users land back at the search box instead of on a now-hidden button
        document.getElementById('searchInput')?.focus({ preventScroll: true });
    });
}
