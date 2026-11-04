import { Company } from '../src/core/Company.js';
import { Feed } from '../src/core/Feed.js';

export const companiesList = [
    new Company({
        id: 'meta',
        name: 'Meta',
        color: '#0866ff',
        domain: 'meta.com',
        logo: 'meta.webp',
        feeds: [
            new Feed({ url: 'https://engineering.fb.com/feed/' })
        ],
    }),
    new Company({
        id: 'apple',
        name: 'Apple',
        color: '#a2aaad',
        // PNG, not WebP: iOS Safari wouldn't decode this logo as WebP
        logo: 'apple.png',
        whiteLogo: true,
        feeds: [
            new Feed({ url: 'https://webkit.org/blog/feed/' }),
            new Feed({ url: 'https://www.swift.org/atom.xml' }),
            new Feed({ url: 'https://machinelearning.apple.com/rss.xml' })
        ],
    }),
    new Company({
        id: 'netflix',
        name: 'Netflix',
        color: '#e50914',
        logo: 'netflix.webp',
        feeds: [
            new Feed({ url: 'https://netflixtechblog.com/feed' })
        ],
    }),
    new Company({
        id: 'google',
        name: 'Google',
        color: '#4285f4',
        logo: 'google.webp',
        feeds: [
            new Feed({ url: 'https://developers.googleblog.com/feeds/posts/default?alt=rss' }),
            // Both feeds carry 100 items going back years
            new Feed({ url: 'https://deepmind.google/blog/rss.xml', limit: 15 }),
            new Feed({ url: 'https://research.google/blog/rss/', limit: 15 })
        ],
    }),
    new Company({
        id: 'amazon',
        name: 'Amazon',
        color: '#ff9900',
        logo: 'amazon.webp',
        feeds: [
            new Feed({ url: 'https://aws.amazon.com/blogs/architecture/feed/' })
        ],
    }),
    new Company({
        id: 'microsoft',
        name: 'Microsoft',
        color: '#00a4ef',
        logo: 'microsoft.webp',
        feeds: [
            new Feed({ url: 'https://devblogs.microsoft.com/engineering-at-microsoft/feed/' })
        ],
    }),
    new Company({
        id: 'ibm',
        name: 'IBM',
        color: '#0f62fe',
        logo: 'ibm.webp',
        feeds: [
            new Feed({ url: 'https://research.ibm.com/rss' })
        ],
    }),
    new Company({
        id: 'dropbox',
        name: 'Dropbox',
        color: '#0061ff',
        logo: 'dropbox.webp',
        feeds: [
            new Feed({ url: 'https://dropbox.tech/feed' })
        ],
    }),
    new Company({
        id: 'cloudflare',
        name: 'Cloudflare',
        color: '#f38020',
        logo: 'cloudflare.webp',
        whiteLogo: true,
        feeds: [
            new Feed({ url: 'https://blog.cloudflare.com/rss/' })
        ],
    }),
    new Company({
        id: 'spotify',
        name: 'Spotify',
        color: '#1db954',
        logo: 'spotify.webp',
        feeds: [
            new Feed({ url: 'https://engineering.atspotify.com/feed/' })
        ],
    }),
    new Company({
        id: 'uber',
        name: 'Uber',
        color: '#d1d5db',
        logo: 'uber.webp',
        whiteLogo: true,
        feeds: [
            new Feed({ url: 'https://hub.slarker.me/uber/blog' })
        ],
    }),
    new Company({
        id: 'slack',
        name: 'Slack',
        color: '#e01e5a',
        logo: 'slack.webp',
        feeds: [
            new Feed({ url: 'https://slack.engineering/feed/' })
        ],
    }),
    new Company({
        id: 'airbnb',
        name: 'Airbnb',
        color: '#ff5a5f',
        logo: 'airbnb.webp',
        feeds: [
            new Feed({ url: 'https://medium.com/feed/airbnb-engineering' })
        ],
    }),
    new Company({
        id: 'openai',
        name: 'OpenAI',
        color: '#10a37f',
        logo: 'openai.webp',
        whiteLogo: true,
        feeds: [
            // The main feed mixes product, company and policy news since 2015 (~1300 items)
            new Feed({ url: 'https://openai.com/news/rss.xml', categories: ['Engineering', 'Research', 'Security'], limit: 30 }),
            new Feed({ url: 'https://alignment.openai.com/rss.xml' })
        ],
    }),
    new Company({
        id: 'nvidia',
        name: 'NVIDIA',
        color: '#76b900',
        logo: 'nvidia.webp',
        feeds: [
            new Feed({ url: 'https://developer.nvidia.com/blog/feed/', limit: 20 })
        ],
    }),
    new Company({
        id: 'huggingface',
        name: 'Hugging Face',
        color: '#ffd21e',
        logo: 'huggingface.webp',
        feeds: [
            // The whole blog history (~900 items), community posts included
            new Feed({ url: 'https://huggingface.co/blog/feed.xml', limit: 20 })
        ],
    }),
    new Company({
        id: 'github',
        name: 'GitHub',
        color: '#e6edf3',
        logo: 'github.webp',
        whiteLogo: true,
        feeds: [
            new Feed({ url: 'https://github.blog/engineering/feed/' })
        ],
    }),
    new Company({
        id: 'shopify',
        name: 'Shopify',
        color: '#7ab55c',
        logo: 'shopify.webp',
        feeds: [
            // The whole blog history (~400 items)
            new Feed({ url: 'https://shopify.engineering/blog.atom', limit: 20 })
        ],
    }),
    new Company({
        id: 'pinterest',
        name: 'Pinterest',
        color: '#bd081c',
        logo: 'pinterest.webp',
        feeds: [
            new Feed({ url: 'https://medium.com/feed/pinterest-engineering' })
        ],
    }),
    new Company({
        id: 'salesforce',
        name: 'Salesforce',
        color: '#00a1e0',
        logo: 'salesforce.webp',
        feeds: [
            new Feed({ url: 'https://engineering.salesforce.com/feed/' })
        ],
    }),
    new Company({
        id: 'datadog',
        name: 'Datadog',
        color: '#8a5cd0',
        logo: 'datadog.webp',
        feeds: [
            new Feed({ url: 'https://www.datadoghq.com/blog/engineering/index.xml', limit: 20 })
        ],
    }),
    new Company({
        id: 'amd',
        name: 'AMD',
        color: '#ed1c24',
        logo: 'amd.webp',
        feeds: [
            // GPUOpen: AMD's developer blog (graphics, ML, performance). Its images only load on gpuopen.com
            new Feed({ url: 'https://gpuopen.com/feed/', images: false })
        ],
    }),
    new Company({
        id: 'walmart',
        name: 'Walmart',
        color: '#0071ce',
        logo: 'walmart.webp',
        feeds: [
            new Feed({ url: 'https://medium.com/feed/walmartglobaltech' })
        ],
    }),
    new Company({
        id: 'lyft',
        name: 'Lyft',
        color: '#ff00bf',
        logo: 'lyft.webp',
        feeds: [
            new Feed({ url: 'https://eng.lyft.com/feed' })
        ],
    }),
    new Company({
        id: 'booking',
        name: 'Booking.com',
        color: '#2b5ba8',
        logo: 'booking.webp',
        feeds: [
            new Feed({ url: 'https://medium.com/feed/booking-com-development' })
        ],
    }),
    new Company({
        id: 'etsy',
        name: 'Etsy',
        color: '#f16521',
        logo: 'etsy.webp',
        feeds: [
            new Feed({ url: 'https://www.etsy.com/codeascraft/rss' })
        ],
    }),
    new Company({
        id: 'mozilla',
        name: 'Mozilla',
        color: '#e5e7eb',
        logo: 'mozilla.webp',
        whiteLogo: true,
        feeds: [
            new Feed({ url: 'https://hacks.mozilla.org/feed/' })
        ],
    }),
    new Company({
        id: 'yelp',
        name: 'Yelp',
        color: '#ff1a1a',
        logo: 'yelp.webp',
        feeds: [
            new Feed({ url: 'https://engineeringblog.yelp.com/feed.xml' })
        ],
    }),
    new Company({
        id: 'canva',
        name: 'Canva',
        color: '#00c4cc',
        logo: 'canva.webp',
        feeds: [
            new Feed({ url: 'https://www.canva.dev/blog/engineering/feed.xml' })
        ],
    }),
    new Company({
        id: 'grab',
        name: 'Grab',
        color: '#00b14f',
        logo: 'grab.webp',
        feeds: [
            new Feed({ url: 'https://engineering.grab.com/feed.xml' })
        ],
    }),
    new Company({
        id: 'zalando',
        name: 'Zalando',
        color: '#ff6900',
        logo: 'zalando.webp',
        feeds: [
            new Feed({ url: 'https://engineering.zalando.com/atom.xml', limit: 20 })
        ],
    }),
    new Company({
        id: 'nubank',
        name: 'Nubank',
        color: '#a14ce0',
        logo: 'nubank.webp',
        feeds: [
            // The blog also has careers and culture posts
            new Feed({
                url: 'https://building.nubank.com/feed/',
                categories: ['Engineering', 'Software Engineering', 'Data & Analytics', 'Data science & Machine Learning', 'AI Research']
            })
        ],
    }),
    new Company({
        id: 'mercadolivre',
        name: 'Mercado Livre',
        color: '#ffe600',
        logo: 'mercadolivre.webp',
        feeds: [
            new Feed({ url: 'https://medium.com/feed/mercadolibre-tech' })
        ],
    })
];

export default companiesList;