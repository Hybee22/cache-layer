const Cache = require("./cache");
const redisPool = require("./redis-pool");
const logger = require("./logger");

class RedisCache extends Cache {
  constructor() {
    super();
  }

  async getClient() {
    return await redisPool.getConnection();
  }

  async get(key) {
    const client = await this.getClient();
    try {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error(`Error getting key ${key} from Redis:`, err);
      throw err;
    }
  }

  async set(key, value, ttl = 0) {
    const client = await this.getClient();
    try {
      const stringValue = JSON.stringify(value);
      if (ttl > 0) {
        await client.setex(key, ttl, stringValue);
      } else {
        await client.set(key, stringValue);
      }
    } catch (err) {
      logger.error(`Error setting key ${key} in Redis:`, err);
      throw err;
    }
  }

  async del(key) {
    const client = await this.getClient();
    try {
      await client.del(key);
    } catch (err) {
      logger.error(`Error deleting key ${key} from Redis:`, err);
      throw err;
    }
  }

  async clear() {
    const client = await this.getClient();
    try {
      await client.flushdb();
    } catch (err) {
      logger.error("Error clearing Redis cache:", err);
      throw err;
    }
  }
}

module.exports = RedisCache;
