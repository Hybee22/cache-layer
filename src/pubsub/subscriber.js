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

// Create Redis subscriber client using ioredis
const subscriber = new Redis(redisConfig);

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
  subscriber
    .quit()
    .then(() => {
      winston.info("Subscriber closed connection");
      process.exit(0);
    })
    .catch((err) => {
      winston.error(`Error during shutdown: ${err.message}`);
      process.exit(1);
    });
});
