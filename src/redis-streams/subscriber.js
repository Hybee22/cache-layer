const winston = require("../logger");
const config = require("./config");
const redisPool = require("../redis-pool");
const logger = require("../logger");

let subscriber;
const CONSUMER_NAME = `consumer-${process.pid}`;

async function getSubscriber() {
  if (!subscriber) {
    subscriber = await redisPool.getDuplicatedConnection();
  }
  return subscriber;
}

async function setupConsumerGroup() {
  const sub = await getSubscriber();
  try {
    await sub.xgroup(
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
  const sub = await getSubscriber();
  try {
    const messages = await sub.xread(
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

// New function for message replay
async function replayMessages(fromTimestamp) {
  const sub = await getSubscriber();
  try {
    const messages = await sub.xrange(
      config.STREAM_KEY,
      fromTimestamp,
      "+",
      "COUNT",
      1000
    );

    for (const [messageId, [, message]] of messages) {
      winston.info(`Replayed message: ${message}, ID: ${messageId}`);
      // Process the replayed message here
    }

    winston.info(`Replayed ${messages.length} messages from ${fromTimestamp}`);
  } catch (error) {
    winston.error(`Error replaying messages: ${error.message}`);
  }
}

async function startSubscriber() {
  await setupConsumerGroup();
  await readHistoricalMessages();

  const sub = await getSubscriber();
  let isRunning = true;
  while (isRunning) {
    try {
      const result = await sub.xreadgroup(
        "GROUP",
        config.CONSUMER_GROUP,
        CONSUMER_NAME,
        "BLOCK",
        5000,
        "STREAMS",
        config.STREAM_KEY,
        ">"
      );

      if (result && result.length > 0) {
          const [streamName, messages] = result[0];
          logger.info(`Received messages from stream: ${streamName}`);
        if (messages && messages.length > 0) {
          for (const [messageId, fields] of messages) {
            const message = fields[1];  // Assuming message is the second item in fields
            winston.info(`Received message: ${message}, ID: ${messageId}`);
            // Process the message here
          }
        }
      }
    } catch (error) {
      winston.error(`Error reading messages: ${error.message}`);
      if (error.message.includes('CRITICAL_ERROR')) {
        isRunning = false;
      }
    }
  }
}

module.exports = { startSubscriber, replayMessages };
