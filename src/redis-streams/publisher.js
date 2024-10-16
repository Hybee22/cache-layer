const logger = require("../logger");
const config = require("./config");
const redisPool = require("../redis-pool");

let publisher;

async function getPublisher() {
  if (!publisher) {
    const baseConnection = await redisPool.getConnection();
    publisher = baseConnection.duplicate();
    logger.info('Duplicated Redis connection created for publisher');
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
    logger.info('Message published', { 
      messageId, 
      streamKey: config.STREAM_KEY,
      messageLength: message.length // Log message length instead of full message for privacy
    });
    return messageId;
  } catch (error) {
    logger.error('Error publishing message', { 
      error: error.message, 
      streamKey: config.STREAM_KEY,
      messageLength: message.length
    });
    throw error;
  }
}

// Graceful shutdown function
async function closePublisher() {
  if (publisher) {
    await publisher.quit();
    logger.info('Publisher connection closed');
  }
}

module.exports = { publishMessage, closePublisher };
