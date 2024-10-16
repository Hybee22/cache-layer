const uuid = require('uuid');
const logger = require('../logger');

function loggingMiddleware(req, res, next) {
  req.id = uuid.v4();
  req.logger = logger.addRequestContext(req);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    req.logger.info('Request completed', {
      statusCode: res.statusCode,
      duration
    });
  });

  next();
}

module.exports = loggingMiddleware;
