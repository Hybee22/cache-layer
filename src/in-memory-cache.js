const Cache = require("./cache");

class InMemoryCache extends Cache {
  constructor() {
    super();
    this.store = new Map();
  }

  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    const [value, expiration] = entry;
    if (expiration && expiration < Date.now()) {
      this.store.delete(key); // Expire the entry
      return null;
    }

    return value;
  }

  async set(key, value, ttl = 0) {
    const expiration = ttl > 0 ? Date.now() + ttl : null;
    this.store.set(key, [value, expiration]);
  }

  async delete(key) {
    this.store.delete(key);
  }

  async clear() {
    this.store.clear();
  }
}

module.exports = InMemoryCache;
