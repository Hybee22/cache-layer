const express = require("express");
const logger = require("./logger");
const { publishMessage } = require("./redis-streams/publisher");
const {
  startSubscriber,
  replayMessages,
} = require("./redis-streams/subscriber");
const CacheManagerWithPromiseCaching = require("./helpers/cache-with-promise");
const redisPool = require("./redis-pool");
const performanceMonitor = require("./monitoring/performance-monitor");

const app = express();

// Create cache manager
const cacheManager = new CacheManagerWithPromiseCaching({
  backend: "lru",
  lruOptions: {
    capacity: 1000, // This will be used to set maxmemory in Redis
    persistent: true,
  },
  compression: false,
});

app.use(express.json());

// Middleware to measure API response times
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    performanceMonitor.recordApiRequest(duration);
  });
  next();
});

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
    logger.error("Error fetching data:", error);
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
    logger.error("Error updating data:", error);
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
    logger.error("Error deleting data:", error);
    res.status(500).json({ message: "Something went wrong", error });
  }
});

// New endpoint for message replay
app.post("/replay-messages", async (req, res) => {
  const { fromTimestamp } = req.body;
  if (!fromTimestamp) {
    return res.status(400).json({ error: "fromTimestamp is required" });
  }

  try {
    await replayMessages(fromTimestamp);
    res.json({ message: "Message replay initiated" });
  } catch (error) {
    logger.error("Error during message replay:", error);
    res
      .status(500)
      .json({ message: "Error during message replay", error: error.message });
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
  logger.info(`Deleted data for ID: ${id}`);
  return true;
}

// Example route that publishes a message to the Redis Stream
app.post("/publish", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    const messageId = await publishMessage(message);
    res.json({ success: true, messageId });
  } catch (error) {
    logger.error(`Error publishing message: ${error.message}`);
    res.status(500).json({ error: "Failed to publish message" });
  }
});

// New route to get cache stats
app.get("/cache-stats", (req, res) => {
  const stats = cacheManager.monitor.getStats();
  res.json(stats);
});

// New route to get performance metrics
app.get("/metrics", (req, res) => {
  const metrics = performanceMonitor.getMetrics();
  res.json(metrics);
});

// Start the subscriber
startSubscriber(async (message) => {
  logger.info(`Processing received message: ${message}`);
  // Add your message processing logic here
});

// Periodically log performance metrics (every 5 minutes)
setInterval(() => {
  performanceMonitor.logMetrics();
}, 5 * 60 * 1000);

/**
 * Start the server
 */
const port = 3000;
const server = app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received. Closing HTTP server and Redis connections.');
  
  server.close(() => {
    logger.info('HTTP server closed.');
  });

  await redisPool.quit();
  logger.info('Redis connections closed.');

  process.exit(0);
});
