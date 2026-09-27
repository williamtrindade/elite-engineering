import { Company } from '../src/models/Company.js';
import { Feed } from '../src/models/Feed.js';

export const companiesList = [
    new Company({
        id: 'meta',
        name: 'Meta',
        domain: 'meta.com',
        logo: 'meta.png',
        feeds: [
            new Feed({ url: 'https://engineering.fb.com/feed/' })
        ],
    }),
    new Company({
        id: 'apple',
        name: 'Apple',
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
        logo: 'netflix.png',
        feeds: [
            new Feed({ url: 'https://netflixtechblog.com/feed' })
        ],
    }),
    new Company({
        id: 'google',
        name: 'Google',
        logo: 'google.png',
        feeds: [
            new Feed({ url: 'https://developers.googleblog.com/feeds/posts/default?alt=rss' })
        ],
    }),
    new Company({
        id: 'amazon',
        name: 'Amazon',
        logo: 'amazon.png',
        feeds: [
            new Feed({ url: 'https://aws.amazon.com/blogs/architecture/feed/' })
        ],
    }),
    new Company({
        id: 'microsoft',
        name: 'Microsoft',
        logo: 'microsoft.png',
        feeds: [
            new Feed({ url: 'https://devblogs.microsoft.com/engineering-at-microsoft/feed/' })
        ],
    }),
    new Company({
        id: 'ibm',
        name: 'IBM',
        logo: 'ibm.png',
        feeds: [
            new Feed({ url: 'https://www.ibm.com/blog/feed/' })
        ],
    }),
    new Company({
        id: 'dropbox',
        name: 'Dropbox',
        logo: 'dropbox.png',
        feeds: [
            new Feed({ url: 'https://dropbox.tech/feed' })
        ],
    }),
    new Company({
        id: 'cloudflare',
        name: 'Cloudflare',
        logo: 'cloudflare.png',
        feeds: [
            new Feed({ url: 'https://blog.cloudflare.com/rss/' })
        ],
    }),
    new Company({
        id: 'spotify',
        name: 'Spotify',
        logo: 'spotify.png',
        feeds: [
            new Feed({ url: 'https://engineering.atspotify.com/feed/' })
        ],
    }),
    new Company({
        id: 'uber',
        name: 'Uber',
        logo: 'uber.png',
        feeds: [
            new Feed({ url: 'https://rsshub.app/uber/blog' })
        ],
    }),
    new Company({
        id: 'slack',
        name: 'Slack',
        logo: 'slack.png',
        feeds: [
            new Feed({ url: 'https://slack.engineering/feed/' })
        ],
    }),
    new Company({
        id: 'airbnb',
        name: 'Airbnb',
        logo: 'airbnb.png',
        feeds: [
            new Feed({ url: 'https://medium.com/feed/airbnb-engineering' })
        ],
    })
];

export default companiesList;