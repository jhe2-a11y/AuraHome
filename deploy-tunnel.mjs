import localtunnel from 'localtunnel';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const PORT = 3001;

// Start the server
console.log('Starting AuraHome server...');
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'pipe',
  env: { ...process.env, PORT: String(PORT) },
});

server.stdout.on('data', d => process.stdout.write(d));
server.stderr.on('data', d => process.stderr.write(d));

// Wait for server to be ready
await new Promise(r => setTimeout(r, 3000));

// Open tunnel
console.log('\nOpening tunnel...');
try {
  const tunnel = await localtunnel({ port: PORT });
  console.log('\n========================================');
  console.log('  AuraHome is LIVE at:');
  console.log(`  ${tunnel.url}`);
  console.log('========================================\n');
  console.log('Note: You may need to click "Click to Continue"');
  console.log('on the first visit (localtunnel splash page).\n');

  // Write URL to file so it can be read
  fs.writeFileSync('/tmp/aurahome-url.txt', tunnel.url);

  tunnel.on('close', () => {
    console.log('Tunnel closed');
    server.kill();
    process.exit(0);
  });
} catch (err) {
  console.error('Tunnel error:', err.message);
  server.kill();
  process.exit(1);
}
