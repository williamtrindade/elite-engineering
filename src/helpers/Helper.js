export default class Helper {
    static stripHtml(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const text = doc.body.textContent || "";
        return text.replace(/\s+/g, ' ').trim(); // Remove extra whitespaces
    }

    // Cut at a word boundary so excerpts don't end mid-word
    static truncate(text, maxLength) {
        if (text.length <= maxLength) return text;

        const cut = text.slice(0, maxLength);
        const lastSpace = cut.lastIndexOf(' ');
        return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text ?? '';
        return div.innerHTML;
    }

    static formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        const date = new Date(dateString);
        return isNaN(date) ? 'Unknown date' : date.toLocaleDateString('en-US', options);
    }
}