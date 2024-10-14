module.exports = {
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  STREAM_KEY: 'newsStream',
  CONSUMER_GROUP: 'newsConsumers',
  MAX_STREAM_LENGTH: 1000,
};
