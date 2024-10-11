// Import the crypto module
const crypto = require("crypto");
const Cache = require("./cache");

const hash = (data) => crypto.createHash("sha256").update(data).digest("hex");

class PartitionCache extends Cache {
  constructor(caches) {
    super();
    this.caches = caches; // An array of Redis or other cache instances
  }

  getShard(key) {
    const hashValue = hash(key);
    return this.caches[hashValue % this.caches.length];
  }

  async get(key) {
    const shard = this.getShard(key);
    return await shard.get(key);
  }

  async set(key, value, ttl) {
    const shard = this.getShard(key);
    await shard.set(key, value, ttl);
  }

  async delete(key) {
    const shard = this.getShard(key);
    await shard.delete(key);
  }
}

module.exports = PartitionCache;
