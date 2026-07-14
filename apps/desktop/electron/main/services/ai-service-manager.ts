import axios, { AxiosInstance } from 'axios';
import { ChildProcess, spawn } from 'child_process';
import * as crypto from 'crypto';
import { app } from 'electron';
import * as fs from 'fs';
import path from 'path';

export class AIServiceManager {
	private process: ChildProcess | null = null;
	private port: number = 0;
	private authToken: string = '';
	private client: AxiosInstance | null = null;
	private readonly userDataPath: string;
	private readonly servicePath: string;
	private healthCheckInterval: NodeJS.Timeout | null = null;
	private restartAttempts = 0;
	private readonly MAX_RESTART_ATTEMPTS = 3;

	constructor(userDataPath: string) {
		this.userDataPath = userDataPath;

		// Determine service path based on whether we're in dev or production
		if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
			// Get workspace root: app.getAppPath() returns apps/desktop folder
			const appPath = app.getAppPath();
			console.log('[AIService] app.getAppPath():', appPath);
			const appsDir = path.dirname(appPath); // apps directory
			this.servicePath = path.join(appsDir, 'ai-service');
			console.log('[AIService] Calculated service path:', this.servicePath);
		} else {
			this.servicePath = path.join(process.resourcesPath, 'ai-service');
		}
	}

	async start(): Promise<boolean> {
		try {
			// Generate authentication token
			this.authToken = crypto.randomBytes(32).toString('hex');

			// Find available port
			this.port = await this.findAvailablePort(8000);

			console.log(`[AIService] Starting service on port ${this.port}`);

			// Spawn Python process
			const pythonExecutable = await this.getPythonExecutable();
			console.log(`[AIService] Using Python from: ${pythonExecutable}`);
			console.log(`[AIService] Service path (cwd): ${this.servicePath}`);

			// Verify Python executable exists
			if (!fs.existsSync(pythonExecutable)) {
				throw new Error(`Python executable not found at: ${pythonExecutable}`);
			}

			// Verify service path exists
			if (!fs.existsSync(this.servicePath)) {
				throw new Error(`AI service path not found at: ${this.servicePath}`);
			}

			// On Windows, wrap the path in quotes and use cmd /c for better compatibility
			const isWindows = process.platform === 'win32';
			const command = isWindows ? 'cmd.exe' : pythonExecutable;
			const args =
				isWindows ?
					[
						'/c',
						`"${pythonExecutable}" -m uvicorn app.main:app --host 127.0.0.1 --port ${this.port}`,
					]
				:	[
						'-m',
						'uvicorn',
						'app.main:app',
						'--host',
						'127.0.0.1',
						'--port',
						this.port.toString(),
					];

			this.process = spawn(command, args, {
				cwd: this.servicePath,
				env: {
					...process.env,
					AI_SERVICE_AUTH_TOKEN: this.authToken,
					AI_SERVICE_DATA_PATH: this.userDataPath,
				},
				stdio: ['ignore', 'pipe', 'pipe'],
				windowsVerbatimArguments: true,
			});

			// Log output
			this.process.stdout?.on('data', (data) => {
				console.log('[AIService]', data.toString().trim());
			});

			this.process.stderr?.on('data', (data) => {
				console.error('[AIService Error]', data.toString().trim());
			});

			this.process.on('exit', (code) => {
				console.log(`[AIService] Process exited with code ${code}`);
				this.handleServiceCrash();
			});

			// Wait for service to be ready
			const ready = await this.waitForHealthy(30000);

			if (ready) {
				// Initialize axios client
				this.client = axios.create({
					baseURL: `http://127.0.0.1:${this.port}`,
					headers: {
						Authorization: `Bearer ${this.authToken}`,
					},
					timeout: 120000, // 2 minutes default timeout
				});

				// Start health check
				this.startHealthCheck();

				this.restartAttempts = 0;
				return true;
			} else {
				console.error('[AIService] Service failed to become healthy');
				await this.stop();
				return false;
			}
		} catch (error) {
			console.error('[AIService] Failed to start:', error);
			return false;
		}
	}

	async stop(): Promise<void> {
		console.log('[AIService] Stopping service...');

		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
		}

		if (this.process) {
			this.process.kill('SIGTERM');

			// Wait for graceful shutdown
			await new Promise<void>((resolve) => {
				const timeout = setTimeout(() => {
					if (this.process) {
						this.process.kill('SIGKILL');
					}
					resolve();
				}, 5000);

				this.process?.once('exit', () => {
					clearTimeout(timeout);
					resolve();
				});
			});

			this.process = null;
		}

		this.client = null;
		console.log('[AIService] Service stopped');
	}

	async checkHealth(): Promise<boolean> {
		try {
			const response = await this.client?.get('/health', { timeout: 5000 });
			return response?.status === 200;
		} catch {
			return false;
		}
	}

	getClient(): AxiosInstance | null {
		return this.client;
	}

	getPort(): number {
		return this.port;
	}

	getAuthToken(): string {
		return this.authToken;
	}

	private async waitForHealthy(timeoutMs: number): Promise<boolean> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeoutMs) {
			try {
				const response = await axios.get(
					`http://127.0.0.1:${this.port}/health`,
					{
						timeout: 2000,
					},
				);

				if (response.status === 200) {
					console.log('[AIService] Service is healthy');
					return true;
				}
			} catch {
				// Service not ready yet
			}

			// Wait 500ms before next attempt
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		return false;
	}

	private startHealthCheck(): void {
		this.healthCheckInterval = setInterval(async () => {
			const healthy = await this.checkHealth();
			if (!healthy) {
				console.warn('[AIService] Health check failed');
				// Service might have crashed, attempt restart
				this.handleServiceCrash();
			}
		}, 30000); // Check every 30 seconds
	}

	private async handleServiceCrash(): Promise<void> {
		if (this.restartAttempts >= this.MAX_RESTART_ATTEMPTS) {
			console.error('[AIService] Max restart attempts reached, giving up');
			return;
		}

		this.restartAttempts++;
		console.log(
			`[AIService] Attempting restart (${this.restartAttempts}/${this.MAX_RESTART_ATTEMPTS})`,
		);

		await this.stop();
		await new Promise((resolve) => setTimeout(resolve, 2000));
		await this.start();
	}

	private async findAvailablePort(startPort: number): Promise<number> {
		// Simple port finding - in production, use a proper port-finding library
		return startPort + Math.floor(Math.random() * 1000);
	}

	private async getPythonExecutable(): Promise<string> {
		// In development, use virtual environment Python from workspace root
		if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
			// Get workspace root: apps/desktop/dist-electron -> apps/desktop -> apps -> workspace
			const workspaceRoot = path.join(app.getAppPath(), '../..');
			const venvPath = path.join(workspaceRoot, '.venv');
			const pythonPath =
				process.platform === 'win32' ?
					path.join(venvPath, 'Scripts', 'python.exe')
				:	path.join(venvPath, 'bin', 'python');
			return pythonPath;
		}

		// In production, use bundled Python
		if (process.platform === 'win32') {
			return path.join(process.resourcesPath, 'python', 'python.exe');
		} else {
			return path.join(process.resourcesPath, 'python', 'bin', 'python3');
		}
	}
}
