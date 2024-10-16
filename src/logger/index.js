const winston = require("winston");
const { format } = winston;

// Custom format to handle Error objects
const errorFormat = format((info) => {
  if (info instanceof Error) {
    return {
      ...info,
      message: info.message,
      stack: info.stack,
    };
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(
    errorFormat(),
    format.timestamp(),
    format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
    format.json()
  ),
  defaultMeta: { service: "cache-layer" },
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, metadata }) => {
          let meta = JSON.stringify(metadata);
          return `${timestamp} [${level}]: ${message} ${
            meta !== "{}" ? meta : ""
          }`;
        })
      ),
    }),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Add request context to logs
logger.addRequestContext = (req) => {
  return logger.child({
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
  });
};

module.exports = logger;
