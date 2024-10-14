const winston = require("../logger"); // Assuming the logger setup is as described earlier
const RedisCache = require("../redis-cache");

const redisCache = new RedisCache('localhost:6379')

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

publisher.on("connect", () => {
  winston.info("Publisher connected to Redis");
});

publisher.on("error", (err) => {
  winston.error(`Redis error: ${err.message}`);
});

// Periodically publish messages
setInterval(() => {
  const message = `News update at ${new Date().toISOString()}`;
  winston.info(`Publishing: ${message}`);
  publisher.publish("news", message).catch((err) => {
    winston.error(`Failed to publish message: ${err.message}`);
  });
}, 5000);

// Graceful shutdown
process.on("SIGINT", () => {
  winston.info("Shutting down publisher...");
  
  // Disable the retry strategy
  publisher.options.retryStrategy = null;
  
  // Set a reasonable timeout for the quit operation
  const quitTimeout = setTimeout(() => {
    winston.error("Quit operation timed out. Forcing exit.");
    process.exit(1);
  }, 5000); // 5 seconds timeout

  publisher
    .quit()
    .then(() => {
      clearTimeout(quitTimeout);
      winston.info("Publisher closed connection");
      process.exit(0);
    })
    .catch((err) => {
      clearTimeout(quitTimeout);
      winston.error(`Error during shutdown: ${err.message}`);
      process.exit(1);
    });
});
