const CacheManager = require("../cache-manager");

class CacheManagerWithPromiseCaching extends CacheManager {
  async cachePromise(key, promiseFn, ttl) {
    const cachedValue = await this.get(key);
    if (cachedValue !== null) {
      console.log("Cache hit for key:", key);
      return cachedValue;
    }

    console.log("Cache miss for key:", key);
    const value = await promiseFn();
    await this.set(key, value, ttl);
    return value;
  }
}

module.exports = CacheManagerWithPromiseCaching;
