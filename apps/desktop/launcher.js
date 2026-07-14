// Simple launcher to catch Electron startup errors
const { spawn } = require('child_process');
const path = require('path');

const electronPath = require('electron');
const appPath = path.join(__dirname, 'dist-electron/index.js');

console.log('[Launcher] Starting Electron...');
console.log('[Launcher] Electron path:', electronPath);
console.log('[Launcher] App path:', appPath);

const child = spawn(electronPath, [appPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
    NODE_ENV: 'development',
  },
});

child.on('error', (error) => {
  console.error('[Launcher] Failed to start Electron:', error);
});

child.on('exit', (code, signal) => {
  console.log(`[Launcher] Electron exited with code ${code} and signal ${signal}`);
  process.exit(code || 0);
});
