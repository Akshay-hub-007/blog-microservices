import amqp from "amqplib";
import { redisClient } from "../server.js";
import { sql } from "./db.js";

interface CacheInvalidationConsumer {
  action: string;
  keys: string[];
}

export const startCacheControl = async () => {
  try {
    const connection = await amqp.connect({
      protocol: "amqp",
      hostname: "localhost",
      port: 5672,
      username: "admin",
      password: "admin123",
    });

    const channel = await connection.createChannel();

    const queueName = "cache-invalidation";

    await channel.assertQueue(queueName, { durable: true });
    // channel.prefetch(1);

    console.log("Blog service consumer Started");

    channel.consume(queueName, async (msg) => {
      try {
        if (!msg || !msg.content) {
          return;
        }

        const content = JSON.parse(msg.content.toString()) as CacheInvalidationConsumer;

        console.log("Blog Service received:", content);

        if (content.action === "invalidateCache") {
          // 1. Invalidate all matched keys
          for (const pattern of content.keys) {
            const keys = await redisClient.keys(pattern);

            if (keys.length > 0) {
              // delete keys individually to avoid spreading an array into a function
              await Promise.all(keys.map((k) => redisClient.del(k)));

              console.log(
                `Invalidated ${keys.length} cache keys for pattern: ${pattern}`
              );
            }
          }

          // 2. Rebuild the default blog list cache AFTER invalidation
          const blogs = await sql`
            SELECT * FROM blogs ORDER BY created_at DESC
          `;

          await redisClient.set("blogs:all", JSON.stringify(blogs));

          console.log("Cache rebuilt: blogs:all");
        }

        channel.ack(msg);
      } catch (error) {
        console.log("Error in consumer:", error);
        channel.nack(msg, false, true);
      }
    });
  } catch (error) {
    console.log("Failed to start rabbitmq consumer:", error);
  }
};
