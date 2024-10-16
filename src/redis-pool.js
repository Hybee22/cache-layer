const Redis = require("ioredis");
const logger = require("./logger");
const performanceMonitor = require("./monitoring/performance-monitor");

class RedisPool {
  constructor(redisUrl, poolOptions = {}) {
    this.redisUrl = redisUrl;
    this.poolOptions = {
      min: 2,
      max: 10,
      ...poolOptions
    };
    this.pool = [];
    logger.info('Redis pool initialized', { redisUrl, poolOptions });
  }

  async getConnection() {
    if (this.pool.length < this.poolOptions.max) {
      const client = new Redis(this.redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          logger.warn(`Reconnecting attempt ${times}...`);
          return delay;
        },
      });

      client.on("error", (err) => {
        logger.error("Redis client error:", err);
      });

      await new Promise((resolve) => {
        client.once("ready", resolve);
      });

      this.pool.push(client);
      logger.debug('Redis connection acquired', { poolSize: this.pool.length });
      performanceMonitor.updateRedisPoolStats(this.pool.length, this.pool.filter(client => client.status === 'ready').length);
      return client;
    }

    // Simple round-robin selection
    return this.pool[Math.floor(Math.random() * this.pool.length)];
  }

  async getDuplicatedConnection() {
    const baseConnection = await this.getConnection();
    return baseConnection.duplicate();
  }

  async quit() {
    await Promise.all(this.pool.map(client => client.quit()));
    this.pool = [];
  }
}

module.exports = new RedisPool(process.env.REDIS_URL || "redis://localhost:6379");
