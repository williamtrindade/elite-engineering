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
        logo: 'apple.webp',
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
    })
];

export default companiesList;