import { Hono } from "hono";
import { logger } from "hono/logger";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "../db/schema";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const app = new Hono();

client.connect();

app.use(logger());
app.get("/", async (c) => {
  const db = drizzle(client, { schema });
  const users = await db.query.user.findMany();
  return c.json(users);
});

app.post("/", async (c) => {
  const body = await c.req.parseBody<{
    name: string;
    email: string;
    password: string;
    role: "admin" | "customer";
  }>();

  if (!body.name || !body.email || !body.password || !body.role) {
    return c.json({ error: "Bad Request" }, 400);
  }

  const db = drizzle(client, { schema });
  const user = await db
    .insert(schema.user)
    .values({
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role,
    })
    .returning();

  return c.json(user);
});

export default app;
