import { state } from '../state/StateSingleton.js';
import Helper from "../helpers/Helper.js";
import { Theme } from './Theme.js';
import { createArticleMedia } from './ArticleMedia.js';

export class UI {
     DOM = {
        searchInput: document.getElementById('searchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        filterContainer: document.getElementById('filterContainer'),
        articlesGrid: document.getElementById('articlesGrid'),
        loadingState: document.getElementById('loadingState'),
        errorState: document.getElementById('errorState'),
        emptyState: document.getElementById('emptyState'),
        errorMessage: document.getElementById('errorMessage'),
        reelsBtn: document.getElementById('reelsBtn')
    };

    refresh() {
        if (state.isLoading || state.error) {
            this.DOM.reelsBtn.disabled = true;
        }

        if (state.isLoading) {
            this.DOM.loadingState.classList.remove('hidden');
            this.DOM.articlesGrid.classList.add('hidden');
            this.DOM.errorState.classList.add('hidden');
            this.DOM.emptyState.classList.add('hidden');
            return;
        }

        this.DOM.loadingState.classList.add('hidden');

        if (state.error) {
            this.DOM.errorState.classList.remove('hidden');
            this.DOM.errorMessage.textContent = state.error;
            return;
        }

        this.renderFilters();
        this.renderArticles();
    }

    renderFilters() {
        const container = document.getElementById('filterContainer');
        // Re-rendering empties the row, which would snap the mobile scroll back to the start
        const scrollLeft = container.scrollLeft;
        container.innerHTML = '';

        const activeCompany = state.companies.find(c => c.id === state.activeFilter);
        Theme.apply(activeCompany?.color);

        state.companies.forEach(company => {
            const btn = document.createElement('button');
            const isActive = state.activeFilter === company.id;

            btn.className = `company-filter w-10 h-10 cursor-pointer transition-all flex justify-center items-center ${isActive ? 'opacity-100 scale-110' : 'opacity-50'}`;

            if (isActive) {
                btn.classList.add('active');
            }

            btn.innerHTML = `<img src="static/${company.logo}" alt="${company.name}" title="${company.name}" class="w-full h-full object-contain">`;

            btn.addEventListener('click', () => {
                state.activeFilter = state.activeFilter === company.id ? null : company.id;
                this.renderFilters();
                this.renderArticles();
            });

            container.appendChild(btn);
        });

        container.scrollLeft = scrollLeft;
    }

    renderArticles() {
        this.DOM.articlesGrid.innerHTML = '';

        const filteredArticles = state.filteredArticles;
        this.DOM.reelsBtn.disabled = filteredArticles.length === 0;

        // Handle empty results after filtering
        if (filteredArticles.length === 0) {
            this.DOM.articlesGrid.classList.add('hidden');
            this.DOM.emptyState.classList.remove('hidden');
            return;
        }

        this.DOM.emptyState.classList.add('hidden');
        this.DOM.articlesGrid.classList.remove('hidden');

        filteredArticles.forEach(article => {
            const card = document.createElement('article');
            card.className = 'article-card glass-panel glass-hover rounded-2xl overflow-hidden flex flex-col h-full cursor-pointer';
            card.onclick = () => window.open(article.link, '_blank');

            const foundCompany = state.companies.find(
                company => company.id === article.companyId
            );

            const newBadge = article.isNew
                ? `<span class="inline-block bg-blue-600 text-white text-xs font-bold px-2 pt-[4px] pb-[2px] rounded ml-2 uppercase tracking-wide leading-none">NEW</span>`
                : '';
            const body = document.createElement('div');
            body.className = 'p-6 flex flex-col flex-grow';
            body.innerHTML = `
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <img 
                                src="static/${foundCompany.logo}"
                                onerror="this.src='https://ui-avatars.com/api/?name=${article.companyName}&background=random&color=fff&size=20&rounded=true'"
                                class="w-5 h-5 rounded-full" 
                                alt=""
                            >
                            <span class="text-xs font-semibold text-gray-300 tracking-wide uppercase">${article.companyName}</span>
                            ${newBadge}
                        </div>
                        <span class="text-xs text-gray-400"><i class="far fa-calendar-alt mr-1"></i>${Helper.formatDate(article.pubDate)}</span>
                    </div>

                    <h2 class="text-xl font-bold mb-3 text-white leading-tight group-hover:text-indigo-400 transition-colors">
                        ${Helper.escapeHtml(article.title)}
                    </h2>

                    <p class="text-gray-400 text-sm mb-4 line-clamp-3 flex-grow">
                        ${Helper.escapeHtml(article.excerpt) || 'No description available for this article. Click to read it on the official site.'}
                    </p>

                    <div class="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                        <div class="flex gap-2 truncate pr-4">
                            ${(article.categories || []).slice(0, 2).map(cat =>
                                `<span class="text-[10px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 truncate">${Helper.escapeHtml(cat)}</span>`
                            ).join('')}
                        </div>
                        <span class="accent-text text-sm font-medium whitespace-nowrap group-hover:translate-x-1 transition-transform">
                            Read more <i class="fas fa-arrow-right text-xs ml-1"></i>
                        </span>
                    </div>
                `;
            card.append(createArticleMedia(article, foundCompany, { className: 'aspect-video' }), body);
            this.DOM.articlesGrid.appendChild(card);
        });
    }
}