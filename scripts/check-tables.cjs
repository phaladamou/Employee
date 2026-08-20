const { createDatabase } = require('./dist/state/database.js');
const os = require('os');
const path = require('path');
const db = createDatabase(path.join(os.homedir(), '.employee', 'employee.db'));
const tables = db.raw.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));
db.close();
