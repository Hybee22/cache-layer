const logger = require("./logger");

class CacheMonitor {
  constructor() {
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
    };
  }

  recordHit() {
    this.stats.hits++;
    this.stats.totalRequests++;
  }

  recordMiss() {
    this.stats.misses++;
    this.stats.totalRequests++;
  }

  getStats() {
    const hitRate =
      this.stats.totalRequests > 0
        ? (this.stats.hits / this.stats.totalRequests) * 100
        : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate.toFixed(2)}%`,
    };
  }

  logStats() {
    const stats = this.getStats();
    logger.info(`Cache Performance Stats: ${JSON.stringify(stats)}`);
  }
}

module.exports = CacheMonitor;
