import path from "path"
import { fileURLToPath } from "url"

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default [
  {
    test: {
      name: "web",
      root: "./packages/web",
      environment: "jsdom",
    },
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "packages/web/src"),
      },
    },
  },
  {
    test: {
      name: "shared",
      root: "./packages/shared",
      environment: "node",
    },
  },
  {
    test: {
      name: "db",
      root: "./packages/db",
      environment: "node",
    },
  },
]
