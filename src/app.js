const express = require("express");
const CacheManagerWithPromiseCaching = require("./helpers/cache-with-promise");
const app = express();

// Create cache manager
const cacheManager = new CacheManagerWithPromiseCaching({
  backend: "redis",
  redisOptions: {
    client: "localhost:6379",
  },
  compression: true,
});

// Example API endpoint with caching
app.get("/data/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const data = await cacheManager.cachePromise(
      `data_${id}`,
      async () => {
        // Simulate database fetch
        return await getDataFromDatabase(id);
      },
      60000 // Cache for 60 seconds
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));

async function getDataFromDatabase(id) {
  // Simulate a DB call
  return { id, name: `Data for ${id}` };
}
