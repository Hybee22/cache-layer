const CacheManager = require("../cache-manager");
const logger = require("../logger");
const performanceMonitor = require("../monitoring/performance-monitor");

class CacheManagerWithPromiseCaching extends CacheManager {
  constructor(options) {
    super(options);
    this.writeQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Caches a promise function with the given key and ttl.
   * If the key is already cached, it returns the cached value.
   * Otherwise, it calls the promise function, caches the result, and returns the result.
   * @param {string} key
   * @param {function(): Promise<any>} promiseFn
   * @param {number} ttl
   * @returns {Promise<any>}
   */
  async cachePromise(key, promiseFn, ttl) {
    try {
      const cachedValue = await this.cache.get(key);
      if (cachedValue !== null) {
        performanceMonitor.recordCacheHit();
        return cachedValue;
      }

      performanceMonitor.recordCacheMiss();
      const value = await promiseFn();
      await this.cache.set(key, value, ttl);
      return value;
    } catch (error) {
      logger.error(`Error in cachePromise for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Updates the cache for the given key.
   * Calls the promise function to get the new value, sets the new value in the cache, and returns the new value.
   * @param {string} key
   * @param {function(): Promise<any>} promiseFn
   * @param {number} ttl
   * @returns {Promise<any>}
   */
  async invalidateOnUpdate(key, promiseFn, ttl) {
    logger.info("Invalidating cache for update on key:", key);

    const newValue = await promiseFn(); // Fetch updated value
    await this.cache.set(key, newValue, ttl); // Update cache with new value
    return newValue; // Return updated value
  }

  /**
   * Deletes the cache for the given key.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async invalidateOnDelete(key) {
    logger.info("Invalidating cache for delete on key:", key);
    await this.cache.del(key); // Invalidate the cache by deleting the key
  }

  async writeThroughCache(key, value, dbWriteFunction, ttl = 0) {
    try {
      // Write to cache
      await this.cache.set(key, value, ttl);
      
      // Write to database
      await dbWriteFunction(value);
      
      logger.info(`Write-through cache successful for key: ${key}`);
    } catch (error) {
      logger.error(`Error in write-through cache for key ${key}:`, error);
      // Invalidate cache if database write fails
      await this.cache.del(key);
      throw error;
    }
  }

  async writeBehindCache(key, value, dbWriteFunction, ttl = 0) {
    try {
      // Write to cache immediately
      await this.cache.set(key, value, ttl);
      
      // Add to write queue
      this.writeQueue.push({ key, value, dbWriteFunction });
      
      // Process queue if not already processing
      if (!this.isProcessingQueue) {
        this.processWriteQueue();
      }
      
      logger.info(`Write-behind cache queued for key: ${key}`);
    } catch (error) {
      logger.error(`Error in write-behind cache for key ${key}:`, error);
      throw error;
    }
  }

  async processWriteQueue() {
    this.isProcessingQueue = true;
    while (this.writeQueue.length > 0) {
      const { key, value, dbWriteFunction } = this.writeQueue.shift();
      try {
        await dbWriteFunction(value);
        logger.info(`Write-behind cache processed for key: ${key}`);
      } catch (error) {
        logger.error(`Error processing write-behind cache for key ${key}:`, error);
        // Optionally, you could add failed writes back to the queue or to a separate error queue
      }
    }
    this.isProcessingQueue = false;
  }

  async invalidate(key) {
    try {
      await this.cache.del(key);
    } catch (error) {
      logger.error(`Error invalidating cache for key ${key}:`, error);
      throw error;
    }
  }
}

module.exports = CacheManagerWithPromiseCaching;
