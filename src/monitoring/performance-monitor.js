const os = require('os');
const logger = require('../logger');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cache: {
        hits: 0,
        misses: 0,
        totalRequests: 0,
      },
      api: {
        totalRequests: 0,
        totalResponseTime: 0,
      },
      redisPool: {
        totalConnections: 0,
        activeConnections: 0,
      },
      system: {
        lastCpuUsage: process.cpuUsage(),
        lastCpuCheck: Date.now(),
      },
    };
  }

  recordCacheHit() {
    this.metrics.cache.hits++;
    this.metrics.cache.totalRequests++;
  }

  recordCacheMiss() {
    this.metrics.cache.misses++;
    this.metrics.cache.totalRequests++;
  }

  recordApiRequest(responseTime) {
    this.metrics.api.totalRequests++;
    this.metrics.api.totalResponseTime += responseTime;
  }

  updateRedisPoolStats(totalConnections, activeConnections) {
    this.metrics.redisPool.totalConnections = totalConnections;
    this.metrics.redisPool.activeConnections = activeConnections;
  }

  getMetrics() {
    const cpuUsage = process.cpuUsage(this.metrics.system.lastCpuUsage);
    const cpuElapsed = Date.now() - this.metrics.system.lastCpuCheck;
    const cpuPercentage = (100 * (cpuUsage.user + cpuUsage.system) / 1000 / cpuElapsed).toFixed(1);

    this.metrics.system.lastCpuUsage = process.cpuUsage();
    this.metrics.system.lastCpuCheck = Date.now();

    return {
      cache: {
        ...this.metrics.cache,
        hitRate: `${((this.metrics.cache.hits / this.metrics.cache.totalRequests) * 100).toFixed(2)}%`,
      },
      api: {
        ...this.metrics.api,
        averageResponseTime: this.metrics.api.totalRequests > 0
          ? (this.metrics.api.totalResponseTime / this.metrics.api.totalRequests).toFixed(2)
          : 0,
      },
      redisPool: this.metrics.redisPool,
      system: {
        cpuUsage: `${cpuPercentage}%`,
        freeMemory: `${(os.freemem() / 1024 / 1024).toFixed(2)} MB`,
        totalMemory: `${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`,
      },
    };
  }

  logMetrics() {
    const metrics = this.getMetrics();
    logger.info('Performance Metrics:', JSON.stringify(metrics, null, 2));
  }
}

module.exports = new PerformanceMonitor();
