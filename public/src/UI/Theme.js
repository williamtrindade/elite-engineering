export class Theme {
    /**
     * Tint the UI with a company color via the --accent CSS variable.
     * Passing no color restores the default palette defined in style.css.
     */
    static apply(color, target = document.documentElement) {
        if (color) {
            target.style.setProperty('--accent', color);
        } else {
            target.style.removeProperty('--accent');
        }
    }
}
