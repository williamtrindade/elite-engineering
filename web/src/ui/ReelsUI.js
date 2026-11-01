import { state, AD_EVERY } from './state.js';
import { escapeHtml, formatDate } from './format.js';
import { Theme } from './Theme.js';
import { createArticleMedia, preloadImage } from './ArticleMedia.js';
import { buildReelUrl } from './ShareLink.js';
import { dragOffset, shouldCommitSwipe, WheelStepper } from './reelsGestures.js';
import { placeSponsors } from '../core/sponsorSlots.js';
import { createSponsorReelsCard } from './SponsorCard.js';

const TRANSITION_MS = 350;
const MIN_TRANSITION_MS = 150;
const DRAG_DEAD_ZONE_PX = 8;
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
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

    // Articles plus sponsor slots ({ isSponsored, sponsor }), in the order they are shown
    articles = [];
    articleCount = 0;
    currentIndex = 0;
    currentCard = null;
    isAnimating = false;
    // Touch drag in progress: { startY, startTime, offset, direction, neighbor }
    drag = null;
    wheel = new WheelStepper();
    lastFocused = null;
    toastTimer = null;

    constructor() {
        this.DOM.closeBtn.addEventListener('click', () => this.close());
        this.DOM.prevBtn.addEventListener('click', () => this.go(-1));
        this.DOM.nextBtn.addEventListener('click', () => this.go(1));

        // The card follows the finger; on release it moves on or snaps back (reelsGestures.js)
        this.DOM.stage.addEventListener('touchstart', (e) => this.onDragStart(e), { passive: true });
        this.DOM.stage.addEventListener('touchmove', (e) => this.onDragMove(e), { passive: true });
        this.DOM.stage.addEventListener('touchend', () => this.onDragEnd());
        this.DOM.stage.addEventListener('touchcancel', () => this.onDragEnd(true));

        // Mouse wheel / trackpad: one card per gesture. Not passive, so the page behind doesn't scroll
        this.DOM.overlay.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

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
        const articles = [...source].sort((a, b) => b.timestamp - a.timestamp);
        if (articles.length === 0) return;

        this.articles = placeSponsors(articles, state.sponsors, { placement: 'reels', every: AD_EVERY });
        this.articleCount = articles.length;

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
        this.drag = null;
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

    onWheel(e) {
        e.preventDefault();

        // Firefox may report lines instead of pixels
        const deltaY = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 16 : e.deltaY;
        // Always fed, even mid-animation: otherwise trackpad inertia would look like a new gesture
        const step = this.wheel.push(deltaY, e.timeStamp);
        if (step && !this.isAnimating && !this.drag) this.go(step);
    }

    onDragStart(e) {
        if (this.isAnimating || e.touches.length > 1) return;

        this.drag = { startY: e.touches[0].clientY, startTime: e.timeStamp, offset: 0, direction: 0, neighbor: null };
    }

    onDragMove(e) {
        const drag = this.drag;
        if (!drag) return;

        const delta = e.touches[0].clientY - drag.startY;
        // A few px of jitter is still a tap (e.g. on Share), not a drag
        if (!drag.direction && Math.abs(delta) < DRAG_DEAD_ZONE_PX) return;

        // Dragging up brings the next card, dragging down the previous one
        const direction = delta < 0 ? 1 : -1;

        if (direction !== drag.direction) {
            drag.neighbor?.remove();
            const article = this.articles[this.currentIndex + direction];
            drag.neighbor = article ? this.createCard(article) : null;
            if (drag.neighbor) this.DOM.stage.appendChild(drag.neighbor);
            drag.direction = direction;
        }

        drag.offset = dragOffset(delta, { hasNeighbor: Boolean(drag.neighbor) });
        drag.time = e.timeStamp;

        this.currentCard.style.transform = `translateY(${drag.offset}px)`;
        if (drag.neighbor) {
            drag.neighbor.style.transform = `translateY(calc(${direction * 100}% + ${drag.offset}px))`;
        }
    }

    onDragEnd(cancelled = false) {
        const drag = this.drag;
        if (!drag) return;
        this.drag = null;

        if (!drag.direction) return; // A tap, not a drag

        const velocity = Math.abs(drag.offset) / Math.max(1, (drag.time ?? drag.startTime) - drag.startTime);
        const commit = !cancelled && drag.neighbor
            && shouldCommitSwipe({ offset: drag.offset, velocity, height: this.DOM.stage.clientHeight });

        if (commit) {
            this.go(drag.direction, { incoming: drag.neighbor, offset: drag.offset });
        } else {
            this.snapBack(drag);
        }
    }

    // Not far enough: the cards spring back to where they were
    async snapBack({ offset, direction, neighbor }) {
        this.isAnimating = true;
        const current = this.currentCard;
        const timing = this.timing(Math.abs(offset));

        current.style.transform = '';
        if (neighbor) neighbor.style.transform = `translateY(${direction * 100}%)`;

        await Promise.all([
            current.animate([{ transform: `translateY(${offset}px)` }, { transform: 'translateY(0)' }], timing).finished,
            neighbor?.animate(
                [{ transform: `translateY(calc(${direction * 100}% + ${offset}px))` }, { transform: `translateY(${direction * 100}%)` }],
                timing
            ).finished
        ]).catch(() => {});

        neighbor?.remove();
        this.isAnimating = false;
    }

    /**
     * Slide to the next (direction = 1) or previous (direction = -1) article.
     * After a drag, it continues from where the finger left the cards (`offset`, px)
     * with the card that was already peeking in (`incoming`).
     */
    async go(direction, { incoming = null, offset = 0 } = {}) {
        const nextIndex = this.currentIndex + direction;

        if (this.isAnimating || this.drag || nextIndex < 0 || nextIndex >= this.articles.length) return;

        this.isAnimating = true;
        this.currentIndex = nextIndex;
        this.updateControls();

        const outgoing = this.currentCard;
        if (!incoming) {
            incoming = this.createCard(this.articles[nextIndex]);
            this.DOM.stage.appendChild(incoming);
        }
        this.currentCard = incoming;

        // Inline transforms from the drag: the end state is "out" for one, "in place" for the other
        const remaining = this.DOM.stage.clientHeight - Math.abs(offset);
        const timing = this.timing(remaining);
        outgoing.style.transform = `translateY(${-direction * 100}%)`;
        incoming.style.transform = '';

        await Promise.all([
            outgoing.animate(
                [{ transform: `translateY(${offset}px)` }, { transform: `translateY(${-direction * 100}%)` }],
                timing
            ).finished,
            incoming.animate(
                [{ transform: `translateY(calc(${direction * 100}% + ${offset}px))` }, { transform: 'translateY(0)' }],
                timing
            ).finished
        ]).catch(() => {}); // Animations are cancelled if the overlay is closed mid-transition

        outgoing.remove();
        this.isAnimating = false;
    }

    // Shorter distance left to travel = shorter animation, so a drag release doesn't feel sluggish
    timing(distancePx) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const fraction = Math.min(1, distancePx / Math.max(1, this.DOM.stage.clientHeight));
        const duration = reduceMotion ? 0 : Math.max(MIN_TRANSITION_MS, TRANSITION_MS * fraction);
        return { duration, easing: EASING };
    }

    updateControls() {
        const item = this.articles[this.currentIndex];
        this.DOM.prevBtn.disabled = this.currentIndex === 0;
        this.DOM.nextBtn.disabled = this.currentIndex === this.articles.length - 1;

        if (item.isSponsored) {
            Theme.apply(item.sponsor.color, this.DOM.overlay);
            this.DOM.progress.textContent = 'Sponsored';
            // Sponsor slots can't be shared: drop the article from the address bar
            const url = new URL(window.location.href);
            url.searchParams.delete('reel');
            history.replaceState(null, '', url);
        } else {
            const company = state.companies.find(c => c.id === item.companyId);
            Theme.apply(company?.color, this.DOM.overlay);

            // The counter counts articles only, not sponsor slots
            const position = this.articles.slice(0, this.currentIndex + 1).filter(i => !i.isSponsored).length;
            this.DOM.progress.textContent = `${position} / ${this.articleCount} articles`;

            // Keep the address bar pointing at the current article, so it can be copied from there too
            history.replaceState(null, '', buildReelUrl(item.link));
        }

        // So the next swipe shows the image right away instead of the placeholder
        const next = this.articles[this.currentIndex + 1];
        preloadImage(next?.isSponsored ? next.sponsor.image : next?.image);
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

    createCard(item) {
        return item.isSponsored ? createSponsorReelsCard(item.sponsor) : this.createArticleCard(item);
    }

    createArticleCard(article) {
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
