const { createDatabase } = require('./dist/state/database.js');
const os = require('os');
const path = require('path');
const db = createDatabase(path.join(os.homedir(), '.employee', 'employee.db'));

const tables = ['working_memory', 'episodic_memory', 'semantic_memory', 'procedural_memory', 'relationship_memory', 'session_summaries', 'event_stream', 'knowledge_store'];

for (const table of tables) {
  try {
    const sql = 'SELECT COUNT(*) as count FROM ' + table;
    const count = db.raw.prepare(sql).get();
    console.log(table + ': ' + count.count + ' entrées');
  } catch (err) {
    console.log(table + ': ERREUR - ' + err.message);
  }
}
db.close();
