const Cache = require('./cache');

class LRUCache extends Cache {
  constructor(capacity) {
    super();
    this.capacity = capacity;
    this.cache = new Map();
  }

  async get(key) {
    if (!this.cache.has(key)) return null;
    
    // Move accessed item to the end to mark it as most recently used
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  async set(key, value) {
    if (this.cache.has(key)) {
      // If key exists, delete it first
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // If at capacity, remove the least recently used item (first item in Map)
      const leastUsedKey = this.cache.keys().next().value;
      this.cache.delete(leastUsedKey);
    }
    
    // Add new item
    this.cache.set(key, value);
  }

  async del(key) {
    this.cache.delete(key);
  }

  async clear() {
    this.cache.clear();
  }
}

module.exports = LRUCache;
