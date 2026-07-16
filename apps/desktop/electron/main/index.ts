import { app, BrowserWindow, Menu } from 'electron';
import * as path from 'path';
import { registerIPCHandlers } from './ipc/handlers';
import { AIServiceManager } from './services/ai-service-manager';
import { AudioManager } from './services/audio-manager';
import { DatabaseManager } from './services/database-manager';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC =
	app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let mainWindow: BrowserWindow | null;
let aiServiceManager: AIServiceManager;
let databaseManager: DatabaseManager;
let audioManager: AudioManager;

const WINDOW_WIDTH = 1200;
const WINDOW_HEIGHT = 800;

async function createWindow() {
	const preloadPath = path.join(__dirname, 'preload', 'index.js');
	console.log('[Main] Preload path:', preloadPath);
	console.log('[Main] __dirname:', __dirname);
	console.log('[Main] VITE_PUBLIC:', process.env.VITE_PUBLIC);

	mainWindow = new BrowserWindow({
		width: WINDOW_WIDTH,
		height: WINDOW_HEIGHT,
		autoHideMenuBar: true,
		webPreferences: {
			preload: preloadPath,
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false, // Disable sandbox for development debugging
		},
		title: 'C1 Speaking Coach',
		backgroundColor: '#ffffff',
		show: false, // Wait for ready-to-show
	});

	// Show window when ready to prevent visual flash
	mainWindow.once('ready-to-show', () => {
		console.log('[Main] Window ready to show');
		mainWindow?.show();
	});

	// Load the app
	if (process.env.VITE_DEV_SERVER_URL) {
		console.log(
			'[Main] Loading dev server URL:',
			process.env.VITE_DEV_SERVER_URL,
		);
		await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
	} else {
		const indexPath = path.join(process.env.DIST!, 'index.html');
		console.log('[Main] Loading file:', indexPath);
		await mainWindow.loadFile(indexPath);
	}

	// Handle window close
	mainWindow.on('closed', () => {
		console.log('[Main] Window closed');
		mainWindow = null;
	});
}

async function initializeServices() {
	console.log('[Main] Initializing services...');

	try {
		// Initialize database
		try {
			databaseManager = new DatabaseManager(app.getPath('userData'));
			await databaseManager.initialize();
			console.log('[Main] Database initialized');
		} catch (error) {
			console.error('[Main] Database initialization failed:', error);
			console.error(
				'[Main] Stack:',
				error instanceof Error ? error.stack : 'No stack trace',
			);
			// Create a stub database manager
			databaseManager = null as any;
		}

		// Initialize audio manager
		try {
			audioManager = new AudioManager(app.getPath('userData'));
			console.log('[Main] Audio manager initialized');
		} catch (error) {
			console.error('[Main] Audio manager initialization failed:', error);
			audioManager = null as any;
		}

		// Initialize AI service manager
		try {
			aiServiceManager = new AIServiceManager(app.getPath('userData'));

			// Start AI service
			const started = await aiServiceManager.start();
			if (!started) {
				console.error('[Main] Failed to start AI service');
				aiServiceManager = null as any;
			} else {
				console.log('[Main] AI service started successfully');
			}
		} catch (error) {
			console.error('[Main] AI service initialization failed:', error);
			aiServiceManager = null as any;
		}

		// Register IPC handlers (even if some services failed)
		try {
			registerIPCHandlers({
				aiService: aiServiceManager,
				database: databaseManager,
				audio: audioManager,
			});
			console.log('[Main] IPC handlers registered');
		} catch (error) {
			console.error('[Main] Failed to register IPC handlers:', error);
		}

		console.log(
			'[Main] Service initialization completed (some may have failed)',
		);
	} catch (error) {
		console.error('[Main] Fatal error initializing services:', error);
		console.error(
			'[Main] Stack:',
			error instanceof Error ? error.stack : 'No stack trace',
		);
		// Don't throw - let the app continue
	}
}

async function shutdownServices() {
	console.log('[Main] Shutting down services...');

	if (aiServiceManager) {
		await aiServiceManager.stop();
	}

	if (databaseManager) {
		await databaseManager.close();
	}

	console.log('[Main] Services shut down');
}

// App lifecycle
app.whenReady().then(async () => {
	try {
		console.log('[Main] App ready, initializing...');
		Menu.setApplicationMenu(null);
		await initializeServices();
		console.log('[Main] Services initialized, creating window...');
		await createWindow();
		console.log('[Main] Window created successfully');
	} catch (error) {
		console.error('[Main] Error during initialization:', error);
		console.error(
			'[Main] Stack:',
			error instanceof Error ? error.stack : 'No stack trace',
		);
		// Try to create window anyway
		try {
			await createWindow();
			console.log('[Main] Window created despite initialization errors');
		} catch (windowError) {
			console.error('[Main] Failed to create window:', windowError);
			app.quit();
		}
	}

	app.on('activate', () => {
		// On macOS, re-create window when dock icon is clicked
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	// On macOS, apps typically stay active until explicitly quit
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('before-quit', async (event) => {
	event.preventDefault();
	await shutdownServices();
	app.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
	console.error('[Main] Uncaught exception:', error);
	console.error('[Main] Stack:', error.stack);
	// Don't exit immediately, log the error
});

process.on('unhandledRejection', (reason, promise) => {
	console.error('[Main] Unhandled rejection at:', promise, 'reason:', reason);
});
