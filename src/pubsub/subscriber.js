const Redis = require("ioredis");
const winston = require("../logger");
const RedisCache = require("../redis-cache"); // Assuming this is the correct path

const redisCache = new RedisCache("localhost:6379");

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

// Duplicate the connection for the subscriber
const subscriber = redisConnection.duplicate();

// Apply the retry strategy to the duplicated connection
subscriber.options.retryStrategy = redisConfig.retryStrategy;

subscriber.on("connect", () => {
  winston.info("Subscriber connected to Redis");
});

subscriber.on("error", (err) => {
  winston.error(`Redis error: ${err.message}`);
});

// Subscribe to the 'news' channel
subscriber.subscribe("news", (err, count) => {
  if (err) {
    winston.error(`Failed to subscribe: ${err.message}`);
  } else {
    winston.info(`Subscribed to ${count} channel(s)`);
  }
});

// Listen for messages on the 'news' channel
subscriber.on("message", (channel, message) => {
  winston.info(`Received message from ${channel}: ${message}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  winston.info("Shutting down subscriber...");

  // Disable the retry strategy
  subscriber.options.retryStrategy = null;

  // Set a reasonable timeout for the quit operation
  const quitTimeout = setTimeout(() => {
    winston.error("Quit operation timed out. Forcing exit.");
    process.exit(1);
  }, 5000); // 5 seconds timeout

  subscriber
    .quit()
    .then(() => {
      clearTimeout(quitTimeout);
      winston.info("Subscriber closed connection");
      process.exit(0);
    })
    .catch((err) => {
      clearTimeout(quitTimeout);
      winston.error(`Error during shutdown: ${err.message}`);
      process.exit(1);
    });
});
