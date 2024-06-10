import { Hono } from "hono";
import { logger } from "hono/logger";

import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "../db/schema";
import { z } from "zod";
import { validator } from "hono/validator";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const app = new Hono();

client.connect();
const db = drizzle(client, { schema });

app.use(logger());
app.get("/api/v1/user", async (c) => {
  const users = await db.query.user.findMany();
  return c.json(users);
});

const createUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: z.enum(["admin", "customer"]),
});

app.post(
  "/api/v1/user",
  validator("form", (value, c) => {
    const validatedBody = createUserSchema.safeParse(value);
    if (!validatedBody.success) {
      return c.json({ error: validatedBody.error.message }, 400);
    }
    return validatedBody.data;
  }),
  async (c) => {
    const { name, email, password, role } = c.req.valid("form");

    const user = await db
      .insert(schema.user)
      .values({
        name,
        email,
        password,
        role,
      })
      .returning();

    return c.json(user);
  }
);

export default app;
