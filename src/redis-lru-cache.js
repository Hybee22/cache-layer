const Redis = require('ioredis');
const Cache = require('./cache');
const logger = require('./logger');

class RedisLRUCache extends Cache {
  constructor(redisUrl, capacity) {
    super();
    this.client = new Redis(redisUrl);
    this.capacity = capacity;

    // Configure Redis to use LRU eviction policy
    this.client.config('SET', 'maxmemory-policy', 'allkeys-lru');
    this.client.config('SET', 'maxmemory', `${capacity * 100}mb`); // Adjust as needed

    this.client.on('error', (err) => {
      logger.error('Redis LRU Cache Error:', err);
    });
  }

  async get(key) {
    const value = await this.client.get(key);
    if (value) {
      // Update the key's access time without changing its value
      await this.client.expire(key, 3600); // Reset TTL to 1 hour, adjust as needed
      return JSON.parse(value);
    }
    return null;
  }

  async set(key, value, ttl = 3600) {
    await this.client.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async del(key) {
    await this.client.del(key);
  }

  async clear() {
    await this.client.flushdb();
  }

  async close() {
    await this.client.quit();
  }
}

module.exports = RedisLRUCache;
