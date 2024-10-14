const winston = require("../logger");
const config = require("./config");
const redisPool = require("../redis-pool");

let publisher;

async function getPublisher() {
  if (!publisher) {
    publisher = await redisPool.getDuplicatedConnection();
  }
  return publisher;
}

async function publishMessage(message) {
  const pub = await getPublisher();
  try {
    const messageId = await pub.xadd(
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
