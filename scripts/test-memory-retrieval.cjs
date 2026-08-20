const { createDatabase } = require('./dist/state/database.js');
const { MemoryRetriever } = require('./dist/memory/retrieval.js');
const os = require('os');
const path = require('path');

const db = createDatabase(path.join(os.homedir(), '.employee', 'employee.db'));
const retriever = new MemoryRetriever(db.raw);
const result = retriever.retrieve('default', 'Compter fichiers src/agent');
console.log('totalTokens:', result.totalTokens);
console.log('working:', result.workingMemory.length);
console.log('episodic:', result.episodicMemory.length);
console.log('semantic:', result.semanticMemory.length);
console.log('procedural:', result.proceduralMemory.length);
db.close();
