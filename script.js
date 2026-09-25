// Data Sources Configuration
const FEEDS = [
    {
        id: 'meta',
        name: 'Meta',
        domain: 'meta.com',
        url: 'https://engineering.fb.com/feed/',
        logo: '/meta.png',
    },
    {
        id: 'apple',
        name: 'Apple',
        domain: 'apple.com',
        urls: [
            'https://webkit.org/blog/feed/',             // Web
            'https://www.swift.org/atom.xml',            // Linguagem
            'https://machinelearning.apple.com/rss.xml'  // IA
        ],
        logo: '/apple.png'
    },
    {
        id: 'netflix',
        name: 'Netflix',
        domain: 'netflix.com',
        url: 'https://netflixtechblog.com/feed',
        logo: '/netflix.png',
    },
    {
        id: 'google',
        name: 'Google',
        domain: 'google.com',
        url: 'https://developers.googleblog.com/feeds/posts/default?alt=rss', // Blog de Developers da Google
        logo: '/google.png'
    },
    {
        id: 'amazon',
        name: 'Amazon',
        domain: 'amazon.com',
        url: 'https://aws.amazon.com/blogs/architecture/feed/',
        logo: '/amazon.png',
    },
    {
        id: 'microsoft',
        name: 'Microsoft',
        domain: 'microsoft.com',
        url: 'https://devblogs.microsoft.com/engineering-at-microsoft/feed/',
        logo: '/microsoft.png'
    },
    {
        id: 'ibm',
        name: 'IBM',
        domain: 'ibm.com',
        url: 'https://www.ibm.com/blog/feed/',
        logo: '/ibm.png'
    },
    {
        id: 'dropbox',
        name: 'Dropbox',
        domain: 'dropbox.com',
        url: 'https://dropbox.tech/feed',
        logo: '/dropbox.png'
    },
    {
        id: 'cloudflare',
        name: 'Cloudflare',
        domain: 'cloudflare.com',
        url: 'https://blog.cloudflare.com/rss/',
        logo: '/cloudflare.png',
    },
    {
        id: 'spotify',
        name: 'Spotify',
        domain: 'spotify.com',
        url: 'https://engineering.atspotify.com/feed/',
        logo: '/spotify.png',
    },
    {
        id: 'uber',
        name: 'Uber',
        domain: 'uber.com',
        url: 'https://rsshub.app/uber/blog',
        logo: '/uber.png',
    },
    {
        id: 'slack',
        name: 'Slack',
        domain: 'slack.com',
        url: 'https://slack.engineering/feed/',
        logo: '/slack.png'
    },
    {
        id: 'airbnb',
        name: 'Airbnb',
        domain: 'airbnb.com',
        url: 'https://medium.com/feed/airbnb-engineering',
        logo: '/airbnb.png'
    },
];

// Application State
let state = {
    allArticles: [],
    activeFilter: null, // Holds company id
    searchQuery: '',
    isLoading: true,
    error: null
};

// DOM Elements
const DOM = {
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    filterContainer: document.getElementById('filterContainer'),
    articlesGrid: document.getElementById('articlesGrid'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    emptyState: document.getElementById('emptyState'),
    errorMessage: document.getElementById('errorMessage')
};

/**
 * Helper to strip HTML tags from RSS descriptions to show a clean excerpt
 */
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body.textContent || "";
    return text.replace(/\s+/g, ' ').trim(); // Remove extra whitespaces
}

/**
 * Format date beautifully
 */
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const date = new Date(dateString);
    return isNaN(date) ? 'Data desconhecida' : date.toLocaleDateString('pt-PT', options);
}

/**
 * Fetch one or multiple RSS feeds for a company via rss2json public API
 */
async function fetchFeed(feedDef) {
    // 1. Suporta tanto o formato novo (array 'urls') como o antigo (string 'url')
    const urlsToFetch = feedDef.urls ? feedDef.urls : [feedDef.url];

    try {
        // 2. Cria as requisições para todos os blogs da empresa
        const fetchPromises = urlsToFetch.map(async (url) => {
            const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;


            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            if (data.status !== 'ok') throw new Error(`API returned non-ok status for ${url}`);

            return data.items;
        });

        // 3. Executa todas as requisições em paralelo
        const results = await Promise.allSettled(fetchPromises);
        let aggregatedItems = [];

        // 4. Junta os artigos dos feeds que funcionaram
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                aggregatedItems = aggregatedItems.concat(result.value);
            } else {
                console.error(`Error fetching one of the feeds for ${feedDef.name}:`, result.reason);
            }
        });

        // 5. Normaliza os artigos recolhidos e anexa a informação da empresa
        return aggregatedItems.map(item => ({
            ...item,
            companyId: feedDef.id,
            companyName: feedDef.name,
            companyDomain: feedDef.domain,
            cleanDescription: stripHtml(item.description || item.content),
            timestamp: new Date(item.pubDate).getTime()
        }));

    } catch (error) {
        console.error(`Critical error processing feeds for ${feedDef.name}:`, error);
        return []; // Retorna um array vazio para não quebrar o Promise.allSettled principal
    }
}

/**
 * Fetch all feeds concurrently
 */
async function fetchAllData() {
    state.isLoading = true;
    state.error = null;
    updateUI();

    try {
        // Fetch all feeds in parallel
        const results = await Promise.all(FEEDS.map(feed => fetchFeed(feed)));

        // Flatten array of arrays
        let combinedArticles = results.flat();

        // Sort by newest first
        combinedArticles.sort((a, b) => b.timestamp - a.timestamp);

        state.allArticles = combinedArticles;

        if(state.allArticles.length === 0) {
            state.error = "Não foi possível extrair dados de nenhum dos feeds fornecidos.";
        }

    } catch (error) {
        state.error = "Ocorreu um erro fatal ao conectar com a API de feeds.";
    } finally {
        state.isLoading = false;
        updateUI();
    }
}

/**
 * Render Filter Buttons
 */
function renderFilters() {
    const container = document.getElementById('filterContainer');
    container.innerHTML = ''; // Limpa os botões antigos antes de redesenhar

    FEEDS.forEach(feed => {
        const btn = document.createElement('button');
        const isActive = state.activeFilter === feed.id;

        // As classes aplicam 100% de opacidade apenas se isActive for true
        btn.className = `company-filter w-10 h-10 cursor-pointer transition-all flex justify-center items-center hover:opacity-100 hover:scale-110 ${isActive ? 'opacity-100 scale-110' : 'opacity-50'}`;

        if (isActive) {
            btn.classList.add('active');
        }

        btn.innerHTML = `<img src="img/${feed.logo}" alt="${feed.name}" title="${feed.name}" class="w-full h-full object-contain">`;

        btn.addEventListener('click', () => {
            // Atualiza qual é o filtro ativo no estado
            state.activeFilter = state.activeFilter === feed.id ? null : feed.id;

            // Redesenha os botões. Isto fará com que o 'if (isActive)' cole a classe 'active' no botão certo
            renderFilters();

            // Atualiza as notícias em baixo
            renderArticles();
        });

        container.appendChild(btn);
    });
}

/**
 * Render Article Cards based on current state (filters and search)
 */
function renderArticles() {
    DOM.articlesGrid.innerHTML = '';

    // Apply filters
    let filtered = state.allArticles;

    if (state.activeFilter) {
        filtered = filtered.filter(a => a.companyId === state.activeFilter);
    }

    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(a =>
            a.title.toLowerCase().includes(query) ||
            a.companyName.toLowerCase().includes(query)
        );
    }

    // Handle empty results after filtering
    if (filtered.length === 0) {
        DOM.articlesGrid.classList.add('hidden');
        DOM.emptyState.classList.remove('hidden');
        return;
    }

    DOM.emptyState.classList.add('hidden');
    DOM.articlesGrid.classList.remove('hidden');

    filtered.forEach(article => {
        const card = document.createElement('article');
        card.className = 'glass-panel glass-hover rounded-2xl p-6 flex flex-col h-full cursor-pointer';
        card.onclick = () => window.open(article.link, '_blank');

        const termoBusca = article.companyName

        // Retorna o objeto da empresa correspondente (ou undefined se não encontrar)
        const empresa = FEEDS.find(feed =>
            feed.name.toLowerCase() === termoBusca.toLowerCase()
        );

        card.innerHTML = `
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <img src="img${empresa.logo}"
                                 onerror="this.src='https://ui-avatars.com/api/?name=${article.companyName}&background=random&color=fff&size=20&rounded=true'"
                                 class="w-5 h-5 rounded-full">
                            <span class="text-xs font-semibold text-gray-300 tracking-wide uppercase">${article.companyName}</span>
                        </div>
                        <span class="text-xs text-gray-400"><i class="far fa-calendar-alt mr-1"></i>${formatDate(article.pubDate)}</span>
                    </div>

                    <h2 class="text-xl font-bold mb-3 text-white leading-tight group-hover:text-indigo-400 transition-colors">
                        ${article.title}
                    </h2>

                    <p class="text-gray-400 text-sm mb-4 line-clamp-3 flex-grow">
                        ${article.cleanDescription || 'Nenhuma descrição disponível para este artigo. Clique para ler no site oficial.'}
                    </p>

                    <div class="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                        <div class="flex gap-2 truncate pr-4">
                            ${(article.categories || []).slice(0, 2).map(cat =>
            `<span class="text-[10px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-300 truncate">${cat}</span>`
        ).join('')}
                        </div>
                        <span class="text-indigo-400 text-sm font-medium whitespace-nowrap group-hover:translate-x-1 transition-transform">
                            Read more <i class="fas fa-arrow-right text-xs ml-1"></i>
                        </span>
                    </div>
                `;
        DOM.articlesGrid.appendChild(card);
    });
}

/**
 * Update the entire UI based on current state
 */
function updateUI() {
    if (state.isLoading) {
        DOM.loadingState.classList.remove('hidden');
        DOM.articlesGrid.classList.add('hidden');
        DOM.errorState.classList.add('hidden');
        DOM.emptyState.classList.add('hidden');
        return;
    }

    DOM.loadingState.classList.add('hidden');

    if (state.error) {
        DOM.errorState.classList.remove('hidden');
        DOM.errorMessage.textContent = state.error;
        return;
    }

    renderFilters();
    renderArticles();
}

/**
 * Toggle company filter
 */
function toggleFilter(companyId) {
    if (state.activeFilter === companyId) {
        state.activeFilter = null; // Toggle off if clicking the active one
    } else {
        state.activeFilter = companyId;
    }
    updateUI();
}

/**
 * Handle Search Input
 */
DOM.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();

    if(state.searchQuery.length > 0) {
        DOM.clearSearchBtn.classList.remove('hidden');
    } else {
        DOM.clearSearchBtn.classList.add('hidden');
    }

    // Render directly without full updateUI to avoid re-rendering filters unnecessarily
    renderArticles();
});

/**
 * Clear Search
 */
DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    DOM.clearSearchBtn.classList.add('hidden');
    renderArticles();
});

// Initialize Application
async function initApp() {
    renderFilters(); // Render them initially without active states
    await fetchAllData();
}

// Start
document.addEventListener('DOMContentLoaded', initApp);