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

// Duplicate the connection for the subscriber
const subscriber = redisConnection.duplicate();

// Apply the retry strategy to the duplicated connection
subscriber.options.retryStrategy = redisConfig.retryStrategy;

const CONSUMER_NAME = `consumer-${process.pid}`;

async function setupConsumerGroup() {
  try {
    await subscriber.xgroup(
      "CREATE",
      config.STREAM_KEY,
      config.CONSUMER_GROUP,
      "$",
      "MKSTREAM"
    );
  } catch (error) {
    if (!error.message.includes("BUSYGROUP")) {
      winston.error(`Error creating consumer group: ${error.message}`);
      throw error;
    }
  }
}

async function readHistoricalMessages() {
  try {
    const messages = await subscriber.xread(
      "STREAMS",
      config.STREAM_KEY,
      "0-0"
    );
    if (messages) {
      const [[, streamMessages]] = messages;
      for (const [messageId, [, message]] of streamMessages) {
        winston.info(`Historical message: ${message}, ID: ${messageId}`);
      }
    }
  } catch (error) {
    winston.error(`Error reading historical messages: ${error.message}`);
  }
}

async function consumeMessages(messageHandler) {
  while (true) {
    try {
      const results = await subscriber.xreadgroup(
        "GROUP",
        config.CONSUMER_GROUP,
        CONSUMER_NAME,
        "BLOCK",
        2000,
        "STREAMS",
        config.STREAM_KEY,
        ">"
      );

      if (results) {
        const [[, messages]] = results;
        for (const [messageId, [, message]] of messages) {
          winston.info(`Received message: ${message}, ID: ${messageId}`);
          await messageHandler(message);
          await subscriber.xack(
            config.STREAM_KEY,
            config.CONSUMER_GROUP,
            messageId
          );
        }
      }
    } catch (error) {
      winston.error(`Error consuming messages: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function startSubscriber(messageHandler) {
  await setupConsumerGroup();
  await readHistoricalMessages();
  await consumeMessages(messageHandler);
}

process.on("SIGINT", async () => {
  winston.info("Shutting down subscriber...");
  await subscriber.quit();
  process.exit(0);
});

module.exports = { startSubscriber };
