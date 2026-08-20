import { createDatabase } from "./dist/state/database.js";
import { resolvePath } from "./dist/config.js";
import { randomUUID } from "crypto";

const db = createDatabase(resolvePath("~/.employee/employee.db"));

const stmt = db.raw.prepare("INSERT INTO inbox_messages (id, from_address, content, received_at, to_address, status) VALUES (?, ?, ?, ?, ?, ?)");

stmt.run(
  randomUUID(),
  "user",
  "Bonjour Cofoundator, qui es-tu ?",
  new Date().toISOString(),
  "local",
  "received"
);

console.log("Message envoyé !");
db.close();

