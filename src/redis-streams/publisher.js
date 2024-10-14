const winston = require("../logger");
const config = require("./config");
const RedisCache = require("../redis-cache");

const redisCache = new RedisCache(`${config.REDIS_HOST}:${config.REDIS_PORT}`);

// Redis configuration for retry strategy
const redisConfig = {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    winston.warn(`Reconnecting attempt ${times}...`);
    return delay;
  },
};

// Get the existing Redis connection
const redisConnection = redisCache.getClient();

// Duplicate the connection for the publisher
const publisher = redisConnection.duplicate();

// Apply the retry strategy to the duplicated connection
publisher.options.retryStrategy = redisConfig.retryStrategy;

async function publishMessage(message) {
  try {
    const messageId = await publisher.xadd(
      config.STREAM_KEY,
      "MAXLEN",
      "~",
      config.MAX_STREAM_LENGTH,
      "*",
      "message",
      message
    );
    winston.info(`Published message with ID: ${messageId}`);
    return messageId;
  } catch (error) {
    winston.error(`Error publishing message: ${error.message}`);
    throw error;
  }
}

process.on("SIGINT", async () => {
  winston.info("Shutting down publisher...");
  await publisher.quit();
  process.exit(0);
});

module.exports = { publishMessage };
