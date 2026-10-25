export function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body.textContent || "";
    return text.replace(/\s+/g, ' ').trim(); // Remove extra whitespaces
}

// Cut at a word boundary so excerpts don't end mid-word
export function truncate(text, maxLength) {
    if (text.length <= maxLength) return text;

    const cut = text.slice(0, maxLength);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
