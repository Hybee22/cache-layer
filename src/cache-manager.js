const InMemoryCache = require("./in-memory-cache");
const RedisCache = require("./redis-cache");
const CompressedCache = require("./compression-cache");
const PartitionCache = require("./partition-cache");
const MemcachedCache = require("./memcached-cache");
const LRUCache = require('./lru-cache');
const RedisLRUCache = require('./redis-lru-cache');

class CacheManager {
  /**
   * Creates a new instance of CacheManager, which will use the chosen backend with optional compression and partitioning.
   *
   * @param {Object} [options={}] - Options object with the following properties:
   *   @param {string} [options.backend="memory"] - The cache backend to use. Available options are "memory", "redis", and "lru".
   *   @param {boolean} [options.compression=false] - If true, the cache will use compression.
   *   @param {boolean} [options.partitioning=false] - If true, the cache will use partitioning.
   *   @param {Object} [options.redisOptions={}] - Options object for the chosen backend, with the following properties:
   *     @param {string} [options.redisOptions.client="localhost:6379"] - The Redis client connection string.
   *     @param {string[]} [options.redisOptions.nodes=[]] - List of Redis nodes for partitioning.
   *   @param {Object} [options.lruOptions={}] - Options object for the LRU cache, with the following property:
   *     @param {number} [options.lruOptions.capacity=100] - The capacity of the LRU cache.
   *     @param {boolean} [options.lruOptions.persistent=false] - If true, the LRU cache will use Redis.
   */
  constructor({
    backend = "memory",
    compression = false,
    partitioning = false,
    redisOptions = { client: "localhost:6379", nodes: [] },
    memcachedOptions = { client: "localhost:11211" },
    lruOptions = { capacity: 100, persistent: false }, // Updated options for LRU cache
  }) {
    let cache;

    switch (backend) {
      case "redis":
        cache = new RedisCache(redisOptions.client);
        break;
      case "memcached":
        cache = new MemcachedCache(memcachedOptions.client);
        break;
      case "lru":
        if (lruOptions.persistent) {
          cache = new RedisLRUCache(redisOptions.client, lruOptions.capacity);
        } else {
          cache = new LRUCache(lruOptions.capacity);
        }
        break;
      case "memory":
      default:
        cache = new InMemoryCache();
    }

    if (compression) {
      cache = new CompressedCache(cache);
    }

    if (partitioning && backend === "redis") {
      cache = new PartitionCache(options.redisNodes);
    }

    this.cache = cache;
    if (backend === "memcached") this.cache.checkConnection();
  }

  async get(key) {
    return await this.cache.get(key);
  }

  async set(key, value, ttl) {
    return await this.cache.set(key, value, ttl);
  }

  async del(key) {
    return await this.cache.del(key);
  }

  async clear() {
    return await this.cache.clear();
  }
}

module.exports = CacheManager;
