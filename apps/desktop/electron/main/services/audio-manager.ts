import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import path from 'path';

export class AudioManager {
	private readonly audioDir: string;

	constructor(userDataPath: string) {
		this.audioDir = path.join(userDataPath, 'audio');
	}

	async initialize(): Promise<void> {
		// Ensure audio directory exists
		await fs.mkdir(this.audioDir, { recursive: true });
	}

	async saveRecording(
		sessionId: string,
		audioBuffer: Buffer,
		format: string = 'webm',
	): Promise<string> {
		// Create session subdirectory
		const sessionDir = path.join(this.audioDir, sessionId);
		await fs.mkdir(sessionDir, { recursive: true });

		// Generate unique filename
		const timestamp = Date.now();
		const filename = `${timestamp}-${crypto.randomBytes(4).toString('hex')}.${format}`;
		const filePath = path.join(sessionDir, filename);

		// Save audio file
		await fs.writeFile(filePath, audioBuffer);

		// Return relative path for database storage
		return path.relative(this.audioDir, filePath);
	}

	async getRecording(relativePath: string): Promise<Buffer> {
		const fullPath = path.join(this.audioDir, relativePath);
		return await fs.readFile(fullPath);
	}

	getFullPath(relativePath: string): string {
		return path.join(this.audioDir, relativePath);
	}

	async deleteRecording(relativePath: string): Promise<void> {
		const fullPath = path.join(this.audioDir, relativePath);
		try {
			await fs.unlink(fullPath);
		} catch (error) {
			console.error('[AudioManager] Failed to delete recording:', error);
		}
	}

	async deleteSessionRecordings(sessionId: string): Promise<void> {
		const sessionDir = path.join(this.audioDir, sessionId);
		try {
			await fs.rm(sessionDir, { recursive: true, force: true });
		} catch (error) {
			console.error(
				'[AudioManager] Failed to delete session recordings:',
				error,
			);
		}
	}

	async cleanupOldRecordings(retentionDays: number): Promise<void> {
		const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

		try {
			const sessionDirs = await fs.readdir(this.audioDir);

			for (const dir of sessionDirs) {
				const dirPath = path.join(this.audioDir, dir);
				const stat = await fs.stat(dirPath);

				if (stat.isDirectory() && stat.mtimeMs < cutoffDate) {
					await fs.rm(dirPath, { recursive: true, force: true });
					console.log(`[AudioManager] Deleted old recordings: ${dir}`);
				}
			}
		} catch (error) {
			console.error('[AudioManager] Failed to cleanup old recordings:', error);
		}
	}
}
