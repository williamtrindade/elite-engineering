export default class Helper {
    static stripHtml(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const text = doc.body.textContent || "";
        return text.replace(/\s+/g, ' ').trim(); // Remove extra whitespaces
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