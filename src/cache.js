class Cache {
  constructor() {
    if (new.target === Cache) {
      throw new TypeError("Cannot construct abstract instances directly");
    }
  }

  async get(key) {
    throw new Error("Method 'get' must be implemented");
  }

  async set(key, value, ttl) {
    throw new Error("Method 'set' must be implemented");
  }

  async del(key) {
    throw new Error("Method 'del' must be implemented");
  }

  async clear() {
    throw new Error("Method 'clear' must be implemented");
  }
}

module.exports = Cache;
