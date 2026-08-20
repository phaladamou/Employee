const { createDatabase } = require('./dist/state/database.js');
const os = require('os');
const path = require('path');
const db = createDatabase(path.join(os.homedir(), '.employee', 'employee.db'));
const { randomUUID } = require('crypto');
db.raw.prepare('DELETE FROM inbox_messages').run();
db.raw.prepare('INSERT INTO inbox_messages (id, from_address, content, received_at, to_address, status) VALUES (?, ?, ?, ?, ?, ?)').run(
  randomUUID(),
  'creator',
  'MISSION: Execute exactement cette commande: dir /b /a-d src\\agent | find /c /v "". Reporte le resultat.',
  new Date().toISOString(),
  'local',
  'received'
);
console.log('Mission insérée');
db.close();
