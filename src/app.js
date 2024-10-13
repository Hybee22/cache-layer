const express = require("express");
const CacheManagerWithPromiseCaching = require("./helpers/cache-with-promise");
const app = express();

// Create cache manager
const cacheManager = new CacheManagerWithPromiseCaching({
  backend: "memcached",
  redisOptions: {
    client: "localhost:11211",
  },
  compression: false,
});

app.use(express.json());

/**
 * GET - Fetch data with caching
 */
app.get("/data/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const data = await cacheManager.cachePromise(
      `data:${id}`,
      async () => {
        // Simulate database fetch
        return await getDataFromDatabase(id);
      },
      60 // Cache for 60 seconds
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error });
  }
});

/**
 * PUT - Update data and invalidate cache
 */
app.put("/data/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const updatedData = await cacheManager.invalidateOnUpdate(
      `data:${id}`,
      async () => {
        // Simulate database update
        return await updateDataInDatabase(id, body);
      },
      60 // Reset cache TTL to 60 seconds
    );
    res.json({ message: "Data updated", data: updatedData });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong", error });
  }
});

/**
 * DELETE - Delete data and invalidate cache
 */
app.delete("/data/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Simulate database delete
    await deleteDataFromDatabase(id);

    // Invalidate cache
    await cacheManager.invalidateOnDelete(`data:${id}`);
    res.json({ message: "Data deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong", error });
  }
});

/**
 * Simulated DB functions
 */
async function getDataFromDatabase(id) {
  // Simulate a DB call
  return { id, name: `Data for ${id}` };
}

async function updateDataInDatabase(id, body) {
  // Simulate a DB update
  return { id, ...body, name: `Updated ${id}: ${body?.name}` };
}

async function deleteDataFromDatabase(id) {
  // Simulate a DB delete
  console.log(`Deleted data for ID: ${id}`);
  return true;
}

/**
 * Start the server
 */
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
