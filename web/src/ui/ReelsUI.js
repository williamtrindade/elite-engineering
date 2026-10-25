import { state } from './state.js';
import { escapeHtml, formatDate } from './format.js';
import { Theme } from './Theme.js';
import { createArticleMedia, preloadImage } from './ArticleMedia.js';
import { buildReelUrl } from './ShareLink.js';

const SWIPE_THRESHOLD_PX = 50;
const TRANSITION_MS = 350;
const TOAST_MS = 2000;

export class ReelsUI {
    DOM = {
        overlay: document.getElementById('reelsOverlay'),
        stage: document.getElementById('reelsStage'),
        progress: document.getElementById('reelsProgress'),
        closeBtn: document.getElementById('reelsCloseBtn'),
        prevBtn: document.getElementById('reelsPrevBtn'),
        nextBtn: document.getElementById('reelsNextBtn'),
        toast: document.getElementById('reelsToast')
    };

    articles = [];
    currentIndex = 0;
    currentCard = null;
    isAnimating = false;
    touchStartY = null;
    lastFocused = null;
    toastTimer = null;

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

    /**
     * @param startArticle Article to start on (shared links). Without it, starts on the newest.
     */
    open(startArticle = null) {
        // Reuse the articles already in memory, respecting the active filter/search,
        // unless a shared article was filtered out: then browse everything so it's still there
        const source = !startArticle || state.filteredArticles.includes(startArticle)
            ? state.filteredArticles
            : state.allArticles;
        this.articles = [...source].sort((a, b) => b.timestamp - a.timestamp);

        if (this.articles.length === 0) return;

        this.currentIndex = Math.max(0, this.articles.indexOf(startArticle));
        this.lastFocused = document.activeElement;

        this.DOM.stage.innerHTML = '';
        this.currentCard = this.createCard(this.articles[this.currentIndex]);
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
        this.hideToast();

        // Drop ?reel= so a reload lands on the home page
        const url = new URL(window.location.href);
        url.searchParams.delete('reel');
        history.replaceState(null, '', url);

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

        // Keep the address bar pointing at the current article, so it can be copied from there too
        history.replaceState(null, '', buildReelUrl(article.link));

        // So the next swipe shows the image right away instead of the placeholder
        preloadImage(this.articles[this.currentIndex + 1]?.image);
    }

    async share(article) {
        const url = buildReelUrl(article.link).href;

        if (navigator.share) {
            try {
                await navigator.share({ title: article.title, url });
                return;
            } catch (error) {
                if (error.name === 'AbortError') return; // The user closed the share sheet
            }
        }

        // Desktop browsers without a share sheet (or if it failed)
        await this.copyLink(article);
    }

    async copyLink(article) {
        try {
            await navigator.clipboard.writeText(buildReelUrl(article.link).href);
            this.showToast('Link copied');
        } catch {
            this.showToast('Could not copy the link');
        }
    }

    showToast(message) {
        clearTimeout(this.toastTimer);
        this.DOM.toast.textContent = message;
        this.DOM.toast.classList.add('is-visible');
        this.toastTimer = setTimeout(() => this.hideToast(), TOAST_MS);
    }

    hideToast() {
        clearTimeout(this.toastTimer);
        this.DOM.toast.classList.remove('is-visible');
    }

    createCard(article) {
        const company = state.companies.find(c => c.id === article.companyId);
        const companyName = escapeHtml(article.companyName);
        const link = escapeHtml(article.link);
        const excerpt = article.excerpt
            ? `<p class="reels-excerpt">${escapeHtml(article.excerpt)}</p>`
            : '';

        const card = document.createElement('article');
        card.className = 'reels-card';
        card.innerHTML = `
            <div class="reels-shade"></div>

            <div class="reels-info">
                <div class="flex items-center gap-2.5 mb-3 min-w-0">
                    <img
                        src="static/${company?.logo}"
                        class="reels-logo w-9 h-9 rounded-full bg-white/10 p-1 object-contain shrink-0"
                        alt=""
                    >
                    <span class="text-sm font-semibold text-white truncate">${companyName}</span>
                    <span class="text-xs text-gray-300 whitespace-nowrap">· ${formatDate(article.pubDate)}</span>
                </div>

                <h2 class="text-xl md:text-3xl font-bold text-white leading-snug mb-2">
                    ${escapeHtml(article.title)}
                </h2>

                ${excerpt}

                <a href="${link}" target="_blank" rel="noopener noreferrer" class="reels-read-link">
                    Read full article <i class="fas fa-arrow-up-right-from-square text-xs"></i>
                </a>
            </div>

            <div class="reels-actions">
                <button type="button" class="reels-action" data-action="share" aria-label="Share article">
                    <span class="reels-action-icon"><i class="fas fa-share"></i></span>
                    <span class="reels-action-label">Share</span>
                </button>
                <button type="button" class="reels-action" data-action="copy" aria-label="Copy link">
                    <span class="reels-action-icon"><i class="fas fa-link"></i></span>
                    <span class="reels-action-label">Copy</span>
                </button>
                <a href="${link}" target="_blank" rel="noopener noreferrer" class="reels-action" aria-label="Open original article">
                    <span class="reels-action-icon"><i class="fas fa-arrow-up-right-from-square"></i></span>
                    <span class="reels-action-label">Open</span>
                </a>
            </div>
        `;

        // Grab the header logo before the media (which has its own <img>) is added
        const logo = card.querySelector('.reels-logo');
        card.prepend(createArticleMedia(article, company, { className: 'reels-media', eager: true }));

        logo.addEventListener('error', () => {
            logo.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(article.companyName)}&background=random&color=fff&size=56&rounded=true`;
        }, { once: true });

        card.querySelector('[data-action="share"]').addEventListener('click', () => this.share(article));
        card.querySelector('[data-action="copy"]').addEventListener('click', () => this.copyLink(article));

        return card;
    }
}
