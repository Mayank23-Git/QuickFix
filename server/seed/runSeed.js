import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { seedDemoDataIfEmpty } from './seed.js';

async function main() {
  try {
    await connectDatabase();
    const result = await seedDemoDataIfEmpty();
    console.log('[PeerUp CLI Seed] Result:', result);
  } catch (error) {
    console.error('[PeerUp CLI Seed] Failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

main();
