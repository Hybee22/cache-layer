const InMemoryCache = require("./in-memory-cache");
const RedisCache = require("./redis-cache");
const CompressedCache = require("./compression-cache");
const PartitionCache = require("./partition-cache");

class CacheManager {
  /**
   * Creates a new instance of CacheManager, which will use the chosen backend with optional compression and partitioning.
   *
   * @param {Object} [options={}] - Options object with the following properties:
   *   @param {string} [options.backend="memory"] - The cache backend to use. Available options are "memory" and "redis".
   *   @param {boolean} [options.compression=false] - If true, the cache will use compression.
   *   @param {boolean} [options.partitioning=false] - If true, the cache will use partitioning.
   *   @param {Object} [options.redisOptions={}] - Options object for the chosen backend, with the following properties:
   *     @param {string} [options.redisOptions.client="localhost:6379"] - The Redis client connection string.
   *     @param {string[]} [options.redisOptions.nodes=[]] - List of Redis nodes for partitioning.
   */
  constructor({
    backend = "memory",
    compression = false,
    partitioning = false,
    redisOptions = { client: "localhost:6379", nodes: [] },
  }) {
    let cache;

    switch (backend) {
      case "redis":
        cache = new RedisCache(redisOptions.client);
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
  }

  async get(key) {
    return await this.cache.get(key);
  }

  async set(key, value, ttl) {
    return await this.cache.set(key, value, ttl);
  }

  async delete(key) {
    return await this.cache.delete(key);
  }

  async clear() {
    return await this.cache.clear();
  }
}

module.exports = CacheManager;
