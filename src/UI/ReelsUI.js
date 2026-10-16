import { state } from '../state/StateSingleton.js';
import Helper from '../helpers/Helper.js';
import { Theme } from './Theme.js';

const SWIPE_THRESHOLD_PX = 50;
const TRANSITION_MS = 350;

export class ReelsUI {
    DOM = {
        overlay: document.getElementById('reelsOverlay'),
        stage: document.getElementById('reelsStage'),
        progress: document.getElementById('reelsProgress'),
        closeBtn: document.getElementById('reelsCloseBtn'),
        prevBtn: document.getElementById('reelsPrevBtn'),
        nextBtn: document.getElementById('reelsNextBtn')
    };

    articles = [];
    currentIndex = 0;
    currentCard = null;
    isAnimating = false;
    touchStartY = null;
    lastFocused = null;

    constructor() {
        this.DOM.closeBtn.addEventListener('click', () => this.close());
        this.DOM.prevBtn.addEventListener('click', () => this.go(-1));
        this.DOM.nextBtn.addEventListener('click', () => this.go(1));

        this.DOM.stage.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.DOM.stage.addEventListener('touchend', (e) => {
            if (this.touchStartY === null) return;

            const deltaY = this.touchStartY - e.changedTouches[0].clientY;
            this.touchStartY = null;

            if (Math.abs(deltaY) < SWIPE_THRESHOLD_PX) return;

            // Swipe up -> next article, swipe down -> previous
            this.go(deltaY > 0 ? 1 : -1);
        });

        this.onKeyDown = this.onKeyDown.bind(this);
    }

    get isOpen() {
        return !this.DOM.overlay.classList.contains('hidden');
    }

    open() {
        // Reuse the articles already in memory, respecting the active filter/search
        this.articles = [...state.filteredArticles].sort((a, b) => b.timestamp - a.timestamp);

        if (this.articles.length === 0) return;

        this.currentIndex = 0;
        this.lastFocused = document.activeElement;

        this.DOM.stage.innerHTML = '';
        this.currentCard = this.createCard(this.articles[0]);
        this.DOM.stage.appendChild(this.currentCard);
        this.updateControls();

        this.DOM.overlay.classList.remove('hidden');
        document.body.classList.add('reels-open');
        document.addEventListener('keydown', this.onKeyDown);
        this.DOM.closeBtn.focus();
    }

    close() {
        if (!this.isOpen) return;

        this.DOM.overlay.classList.add('hidden');
        document.body.classList.remove('reels-open');
        document.removeEventListener('keydown', this.onKeyDown);

        this.DOM.stage.innerHTML = '';
        this.currentCard = null;
        this.isAnimating = false;

        document.activeElement?.blur();
        this.lastFocused?.focus();
    }

    onKeyDown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.go(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.go(-1);
        } else if (e.key === 'Escape') {
            this.close();
        }
    }

    /**
     * Slide to the next (direction = 1) or previous (direction = -1) article
     */
    async go(direction) {
        const nextIndex = this.currentIndex + direction;

        if (this.isAnimating || nextIndex < 0 || nextIndex >= this.articles.length) return;

        this.isAnimating = true;
        this.currentIndex = nextIndex;
        this.updateControls();

        const outgoing = this.currentCard;
        const incoming = this.createCard(this.articles[nextIndex]);
        this.DOM.stage.appendChild(incoming);
        this.currentCard = incoming;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const timing = { duration: reduceMotion ? 0 : TRANSITION_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };

        await Promise.all([
            outgoing.animate(
                [{ transform: 'translateY(0)' }, { transform: `translateY(${-direction * 100}%)` }],
                timing
            ).finished,
            incoming.animate(
                [{ transform: `translateY(${direction * 100}%)` }, { transform: 'translateY(0)' }],
                timing
            ).finished
        ]).catch(() => {}); // Animations are cancelled if the overlay is closed mid-transition

        outgoing.remove();
        this.isAnimating = false;
    }

    updateControls() {
        const article = this.articles[this.currentIndex];
        const company = state.companies.find(c => c.id === article.companyId);
        Theme.apply(company?.color, this.DOM.overlay);

        this.DOM.progress.textContent = `${this.currentIndex + 1} / ${this.articles.length} articles`;
        this.DOM.prevBtn.disabled = this.currentIndex === 0;
        this.DOM.nextBtn.disabled = this.currentIndex === this.articles.length - 1;
    }

    createCard(article) {
        const company = state.companies.find(c => c.id === article.companyId);
        const companyName = Helper.escapeHtml(article.companyName);
        const excerpt = article.cleanDescription
            ? Helper.escapeHtml(article.cleanDescription)
            : 'No description available for this article.';

        const card = document.createElement('article');
        card.className = 'reels-card';
        card.innerHTML = `
            <div class="reels-card-content glass-panel rounded-3xl">
                <div class="flex items-center justify-between gap-4 mb-8">
                    <div class="flex items-center gap-3 min-w-0">
                        <img
                            src="static/${company?.logo}"
                            class="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 p-1.5 object-contain shrink-0"
                            alt=""
                        >
                        <span class="text-sm md:text-base font-semibold text-gray-200 tracking-wide uppercase truncate">${companyName}</span>
                    </div>
                    <span class="text-xs md:text-sm text-gray-400 whitespace-nowrap">
                        <i class="far fa-calendar-alt mr-1"></i>${Helper.formatDate(article.pubDate)}
                    </span>
                </div>

                <h2 class="text-2xl md:text-4xl font-bold text-white leading-tight mb-6">
                    ${Helper.escapeHtml(article.title)}
                </h2>

                <p class="reels-excerpt text-gray-300 text-base md:text-lg leading-relaxed mb-10">
                    ${excerpt}
                </p>

                <a
                    href="${Helper.escapeHtml(article.link)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="reels-cta inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 rounded-full text-white font-semibold"
                >
                    Read full article <i class="fas fa-arrow-up-right-from-square text-sm"></i>
                </a>
            </div>
        `;

        const logo = card.querySelector('img');
        logo.addEventListener('error', () => {
            logo.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(article.companyName)}&background=random&color=fff&size=56&rounded=true`;
        }, { once: true });

        return card;
    }
}
