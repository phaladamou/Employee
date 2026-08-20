const { createDatabase } = require('./dist/state/database.js');
const os = require('os');
const path = require('path');
const db = createDatabase(path.join(os.homedir(), '.employee', 'employee.db'));
const memories = db.raw.prepare('SELECT * FROM episodic_memory ORDER BY created_at DESC LIMIT 5').all();
console.log(JSON.stringify(memories, null, 2));
db.close();
