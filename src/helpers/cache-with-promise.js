const CacheManager = require("../cache-manager");

class CacheManagerWithPromiseCaching extends CacheManager {
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

  /**
   * Updates the cache for the given key.
   * Calls the promise function to get the new value, sets the new value in the cache, and returns the new value.
   * @param {string} key
   * @param {function(): Promise<any>} promiseFn
   * @param {number} ttl
   * @returns {Promise<any>}
   */
  async invalidateOnUpdate(key, promiseFn, ttl) {
    console.log("Invalidating cache for update on key:", key);

    const newValue = await promiseFn(); // Fetch updated value
    await this.set(key, newValue, ttl); // Update cache with new value
    return newValue; // Return updated value
  }

  /**
   * Deletes the cache for the given key.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async invalidateOnDelete(key) {
    console.log("Invalidating cache for delete on key:", key);
    await this.del(key); // Invalidate the cache by deleting the key
  }
}

module.exports = CacheManagerWithPromiseCaching;
