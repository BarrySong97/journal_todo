import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema",
  out: "../desktop/src-tauri/migrations",
  verbose: true,
  strict: true,
  casing: "snake_case",
})
