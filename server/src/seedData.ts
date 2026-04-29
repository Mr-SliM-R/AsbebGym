import { fileURLToPath } from "node:url";
import {
  DB_PATH,
  closeDatabase,
  initializeDatabase,
  resetDatabase,
  seedDatabase
} from "./db.js";

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const shouldReset = process.argv.includes("--reset");

  if (shouldReset) {
    resetDatabase();
  }

  initializeDatabase();
  seedDatabase();
  closeDatabase();

  console.log(`Gym Rival database seeded at ${DB_PATH}`);
}
