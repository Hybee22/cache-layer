const Memcached = require("memcached");
const Cache = require("./cache");

// Memcached implementation
class MemcachedCache extends Cache {
  constructor(client) {
    super();
    this.memcached = new Memcached(client); // Connect to Memcached server
  }

  // Check connection to Memcached server
  async checkConnection() {
    return new Promise((resolve, reject) => {
      this.memcached.stats((err, stats) => {
        if (err) {
          console.error("Error connecting to Memcached:", err);
          reject(err);
        } else {
          console.log("Successfully connected to Memcached");
          resolve(true);
        }
      });
    });
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.memcached.get(key, (err, data) => {
        if (err) reject(err);
        resolve(data ? JSON.parse(data) : null);
      });
    });
  }

  async set(key, value, ttl) {
    const valueStr = JSON.stringify(value);
    this.memcached.set(key, valueStr, ttl || 0, (err) => {
      if (err) throw new Error(`Error setting value in Memcached: ${err}`);
    });
  }

  async del(key) {
    this.memcached.del(key, (err) => {
      if (err) throw new Error(`Error deleting key from Memcached: ${err}`);
    });
  }
}

module.exports = MemcachedCache;
