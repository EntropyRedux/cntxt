import fs from 'fs';
import path from 'path';

const PRIMARY_CONTRACT = path.resolve('contracts/data_shapes.ts');
const CONTEXT_CONTRACT = path.resolve('generated-documents/context/contracts/data_shapes.ts');

console.log('🔍 Verifying canonical contract synchronization ...');

if (!fs.existsSync(PRIMARY_CONTRACT)) {
  console.error(`\x1b[31m[CONTRACT SYNC ERROR]\x1b[0m Primary contract missing: ${PRIMARY_CONTRACT}`);
  process.exit(1);
}

if (!fs.existsSync(CONTEXT_CONTRACT)) {
  console.error(`\x1b[31m[CONTRACT SYNC ERROR]\x1b[0m Living context contract missing: ${CONTEXT_CONTRACT}`);
  process.exit(1);
}

const primaryContent = fs.readFileSync(PRIMARY_CONTRACT, 'utf-8').replace(/\r\n/g, '\n');
const contextContent = fs.readFileSync(CONTEXT_CONTRACT, 'utf-8').replace(/\r\n/g, '\n');

if (primaryContent !== contextContent) {
  console.error('\x1b[31m[CONTRACT DIVERGENCE DETECTED]\x1b[0m');
  console.error(`  Production:  contracts/data_shapes.ts (${primaryContent.length} chars)`);
  console.error(`  Context:     generated-documents/context/contracts/data_shapes.ts (${contextContent.length} chars)`);
  console.error('  Contracts must be 100% identical. Synchronize changes before committing.');
  process.exit(1);
}

console.log('✔ Clean! Canonical contracts/data_shapes.ts and context/contracts/data_shapes.ts are 100% in sync.');
process.exit(0);
