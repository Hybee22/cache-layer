const CacheManager = require("../cache-manager");

class CacheManagerWithPromiseCaching extends CacheManager {
  async cachePromise(key, promiseFn, ttl) {
    const cachedValue = await this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const value = await promiseFn();
    await this.set(key, value, ttl);
    return value;
  }
}

module.exports = CacheManagerWithPromiseCaching;
