/**
 * KeyValueStore over the browser's localStorage. Entries expire after `ttlMinutes`
 * (12 hours by default) and are dropped when read after that.
 *
 * @implements {import('../ports.js').KeyValueStore}
 */
export class LocalStorageStore {
    // Injectable for tests; read lazily because touching localStorage can throw when it's blocked
    constructor(storage = null) {
        this.injectedStorage = storage;
    }

    get storage() {
        return this.injectedStorage || globalThis.localStorage;
    }

    set(key, data, ttlMinutes = 720) {
        const now = new Date();
        const item = {
            data: data,
            expiry: now.getTime() + (ttlMinutes * 60 * 1000)
        };
        try {
            this.storage.setItem(key, JSON.stringify(item));
        } catch (error) {
            // Storage full or blocked: caching is optional, the data is still usable
            console.warn(`Could not cache ${key}`, error);
        }
    }

    removeWhere(predicate) {
        try {
            Object.keys(this.storage)
                .filter(predicate)
                .forEach(key => this.storage.removeItem(key));
        } catch (error) {
            // localStorage unavailable (e.g. private mode): nothing to clean
        }
    }

    get(key) {
        const itemStr = this.storage.getItem(key);

        if (!itemStr) return null;

        try {
            const item = JSON.parse(itemStr);
            const now = new Date();

            // Se já passou da data de validade, apaga e devolve null
            if (now.getTime() > item.expiry) {
                this.storage.removeItem(key);
                return null;
            }

            return item.data;
        } catch (error) {
            // Se houver lixo no localStorage, limpa e devolve null
            this.storage.removeItem(key);
            return null;
        }
    }
}