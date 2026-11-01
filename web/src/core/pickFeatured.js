/**
 * The articles for the Featured section: the newest ones with a cover image,
 * at most one per company so a single busy blog doesn't take every slot.
 */
export function pickFeatured(articles, { count = 3 } = {}) {
    const newestFirst = articles
        .filter(a => a.image)
        .sort((a, b) => b.timestamp - a.timestamp);

    const featured = [];
    const companies = new Set();

    for (const article of newestFirst) {
        if (featured.length === count) break;
        if (companies.has(article.companyId)) continue;

        companies.add(article.companyId);
        featured.push(article);
    }

    return featured;
}
