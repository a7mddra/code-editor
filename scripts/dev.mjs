import { createServer } from 'vite';
import { spawn } from 'child_process';
import electron from 'electron';
import path from 'path';

async function startDev() {
  // Build electron first in watch mode
  const { build } = await import('vite');
  await build({
    configFile: path.resolve(process.cwd(), 'vite.electron.config.mts'),
    build: {
      watch: {} // Leave watcher active
    }
  });

  const server = await createServer({
    configFile: path.resolve(process.cwd(), 'vite.config.mts')
  });

  await server.listen();
  const address = server.httpServer.address();
  const port = address.port;
  const devUrl = `http://localhost:${port}`;
  console.log(`[Vite] Dev server started at ${devUrl}`);

  const electronProcess = spawn(electron, ['--no-sandbox', '.', devUrl], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  electronProcess.on('close', (code) => {
    console.log(`[Electron] Process exited with code ${code}`);
    server.close();
    process.exit(code || 0);
  });

  electronProcess.on('error', (err) => {
    console.error('[Electron] Failed to start:', err);
    server.close();
    process.exit(1);
  });
}

startDev().catch((err) => {
  console.error('[Dev] Startup error:', err);
  process.exit(1);
});
