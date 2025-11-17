import amqp from "amqplib";
import { redisClient } from "../server.js";
import { sql } from "./db.js";

interface CacheInvalidationMessage {
  action: string;
  keys: string[];
}
export const startCacheConsumer = async () => {
  try {
    // const connection = await amqp.connect({
    //   protocol: "amqp",
    //   hostname: 'localhost',
    //   port: 5672,
    //   username: "admin",
    //   password: "admin123",
    // });

    const connection  = await amqp.connect(process.env.CLOUD_AMQP!)

    const channel = await connection.createChannel();

    const queueName = "cache-invalidation";

    await channel.assertQueue(queueName, { durable: true });

    console.log("✅ Blog Service cache consumer started");

    channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          console.log("message : ",msg)
          const content = JSON.parse(
            msg.content.toString()
          ) as CacheInvalidationMessage;

          console.log(
            "📩 Blog service recieved cache invalidation message",
            content
          );

          if (content.action === "invalidateCache") {
            for (const pattern of content.keys) {
              console.log(pattern)
              const keys = await redisClient.keys(pattern);
              console.log("keys : ",keys)
              if (keys.length > 0) {
                await redisClient.del(keys);

                console.log(
                  `🗑️ Blog service invalidated ${keys.length} cache keys matching: ${pattern}`
                );

                const category = "";

                const searchQuery = "";

                const cacheKey = `blogs:${searchQuery}:${category}`;

                const blogs =
                  await sql`SELECT * FROM blogs ORDER BY created_at DESC`;

                await redisClient.set(cacheKey, JSON.stringify(blogs), {
                  EX: 3600,
                });

                console.log("🔄️ Cache rebuilt with key:", cacheKey);
              }
            }
          }

          channel.ack(msg);
        } catch (error) {
          console.error(
            "❌ Error processing cache invalidation in blog service:",
            error
          );

          channel.nack(msg, false, true);
        }
      }
    });
  } catch (error) {
    console.error("❌ Failed to start rabbitmq consumer");
  }
};