const Cache = require("./cache");
const Redis = require("ioredis");
const logger = require("./logger");

const client = (redisURL) => {
  let redis = new Redis(`redis://${redisURL}`);

  redis.on("connect", () => {
    logger.info("Connected to redis host");
    redis.flushdb((err, succeeded) => {
      if (err) {
        logger.error("Error flushing database:", err);
      } else {
        logger.info("Database flushed:", succeeded);
      }
    });
  });

  return redis;
};

class RedisCache extends Cache {
  constructor(redisClient) {
    super();
    this.client = client(redisClient);
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, data) => {
        if (err) return reject(err);
        resolve(data ? JSON.parse(data) : null);
      });
    });
  }

  async set(key, value, ttl = 0) {
    const stringValue = JSON.stringify(value);
    if (ttl > 0) {
      this.client.setex(key, ttl, stringValue);
    } else {
      this.client.set(key, stringValue);
    }
  }

  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, response) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
  }

  async clear() {
    this.client.flushdb();
  }
}

module.exports = RedisCache;
