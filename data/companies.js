import { Company } from '../src/models/Company.js';
import { Feed } from '../src/models/Feed.js';

export const companiesList = [
    new Company({
        id: 'meta',
        name: 'Meta',
        color: '#0866ff',
        domain: 'meta.com',
        logo: 'meta.png',
        feeds: [
            new Feed({ url: 'https://engineering.fb.com/feed/' })
        ],
    }),
    new Company({
        id: 'apple',
        name: 'Apple',
        color: '#a2aaad',
        logo: 'apple.png',
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
        logo: 'netflix.png',
        feeds: [
            new Feed({ url: 'https://netflixtechblog.com/feed' })
        ],
    }),
    new Company({
        id: 'google',
        name: 'Google',
        color: '#4285f4',
        logo: 'google.png',
        feeds: [
            new Feed({ url: 'https://developers.googleblog.com/feeds/posts/default?alt=rss' })
        ],
    }),
    new Company({
        id: 'amazon',
        name: 'Amazon',
        color: '#ff9900',
        logo: 'amazon.png',
        feeds: [
            new Feed({ url: 'https://aws.amazon.com/blogs/architecture/feed/' })
        ],
    }),
    new Company({
        id: 'microsoft',
        name: 'Microsoft',
        color: '#00a4ef',
        logo: 'microsoft.png',
        feeds: [
            new Feed({ url: 'https://devblogs.microsoft.com/engineering-at-microsoft/feed/' })
        ],
    }),
    new Company({
        id: 'ibm',
        name: 'IBM',
        color: '#0f62fe',
        logo: 'ibm.png',
        feeds: [
            new Feed({ url: 'https://www.ibm.com/blog/feed/' })
        ],
    }),
    new Company({
        id: 'dropbox',
        name: 'Dropbox',
        color: '#0061ff',
        logo: 'dropbox.png',
        feeds: [
            new Feed({ url: 'https://dropbox.tech/feed' })
        ],
    }),
    new Company({
        id: 'cloudflare',
        name: 'Cloudflare',
        color: '#f38020',
        logo: 'cloudflare.png',
        feeds: [
            new Feed({ url: 'https://blog.cloudflare.com/rss/' })
        ],
    }),
    new Company({
        id: 'spotify',
        name: 'Spotify',
        color: '#1db954',
        logo: 'spotify.png',
        feeds: [
            new Feed({ url: 'https://engineering.atspotify.com/feed/' })
        ],
    }),
    new Company({
        id: 'uber',
        name: 'Uber',
        color: '#d1d5db',
        logo: 'uber.png',
        feeds: [
            new Feed({ url: 'https://rsshub.app/uber/blog' })
        ],
    }),
    new Company({
        id: 'slack',
        name: 'Slack',
        color: '#e01e5a',
        logo: 'slack.png',
        feeds: [
            new Feed({ url: 'https://slack.engineering/feed/' })
        ],
    }),
    new Company({
        id: 'airbnb',
        name: 'Airbnb',
        color: '#ff5a5f',
        logo: 'airbnb.png',
        feeds: [
            new Feed({ url: 'https://medium.com/feed/airbnb-engineering' })
        ],
    })
];

export default companiesList;