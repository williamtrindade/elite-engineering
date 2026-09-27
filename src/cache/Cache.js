export default class Cache {
    static set(key, data, ttlMinutes = 720) {
        const now = new Date();
        const item = {
            data: data,
            expiry: now.getTime() + (ttlMinutes * 60 * 1000)
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    static get(key) {
        const itemStr = localStorage.getItem(key);

        if (!itemStr) return null;

        try {
            const item = JSON.parse(itemStr);
            const now = new Date();

            // Se já passou da data de validade, apaga e devolve null
            if (now.getTime() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }

            return item.data;
        } catch (error) {
            // Se houver lixo no localStorage, limpa e devolve null
            localStorage.removeItem(key);
            return null;
        }
    }
}