/**
 * Articles of one company (or all, when companyId is null) whose title or excerpt
 * contains the query, case-insensitively.
 */
export function filterArticles(articles, { companyId = null, query = '' } = {}) {
    let result = articles;

    if (companyId) {
        result = result.filter(a => a.companyId === companyId);
    }

    if (query) {
        const lowered = query.toLowerCase();
        result = result.filter(a =>
            a.title.toLowerCase().includes(lowered) ||
            (a.excerpt || '').toLowerCase().includes(lowered)
        );
    }

    return result;
}
