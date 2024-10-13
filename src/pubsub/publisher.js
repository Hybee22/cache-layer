const Redis = require("ioredis");
const winston = require("../logger"); // Assuming the logger setup is as described earlier

// Redis configuration for ioredis
const redisConfig = {
  host: "127.0.0.1",
  port: 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000); // Exponential backoff with a max delay
    winston.warn(`Reconnecting attempt ${times}...`);
    return delay;
  },
};

// Create Redis publisher client using ioredis
const publisher = new Redis(redisConfig);

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
  publisher
    .quit()
    .then(() => {
      winston.info("Publisher closed connection");
      process.exit(0);
    })
    .catch((err) => {
      winston.error(`Error during shutdown: ${err.message}`);
      process.exit(1);
    });
});
