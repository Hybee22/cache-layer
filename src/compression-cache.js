const zlib = require("node:zlib");
const Cache = require("./cache");

class CompressedCache extends Cache {
  constructor(cache) {
    super();
    this.cache = cache;
  }

  async get(key) {
    const compressedValue = await this.cache.get(key);
    if (!compressedValue) return null;

    // Check if the compressedValue is already a Buffer object
    let buffer;
    if (compressedValue.type === "Buffer") {
      buffer = Buffer.from(compressedValue.data); // Convert the 'data' array back into a Buffer
    } else {
      buffer = compressedValue; // Assume it's already a Buffer if no 'type' property exists
    }

    // Decompress and return the value
    const decompressedValue = zlib.gunzipSync(buffer);
    return JSON.parse(decompressedValue.toString());
  }

  async set(key, value, ttl) {
    const compressedValue = zlib.gzipSync(JSON.stringify(value));
    await this.cache.set(key, compressedValue, ttl);
  }
}

module.exports = CompressedCache;
