import { Assessment, Session, Speaker, Turn } from '@shared/index';
import crypto from 'crypto';
import { app } from 'electron';
import * as fs from 'fs/promises';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';

export class DatabaseManager {
	private db: Database | null = null;
	private readonly dbPath: string;

	constructor(userDataPath: string) {
		const dataDir = path.join(userDataPath, 'data');
		this.dbPath = path.join(dataDir, 'app.db');
	}

	async initialize(): Promise<void> {
		try {
			// Ensure data directory exists
			await fs.mkdir(path.dirname(this.dbPath), { recursive: true });

			// Find WASM file - in dev it's in node_modules at workspace root
			const isDev = !app.isPackaged;
			let wasmPath: string;

			if (isDev) {
				// In development, use workspace root node_modules
				// apps/desktop -> apps -> workspace root
				const workspaceRoot = path.join(app.getAppPath(), '../..');
				wasmPath = path.join(
					workspaceRoot,
					'node_modules/sql.js/dist/sql-wasm.wasm',
				);
			} else {
				// In production, should be in resources
				wasmPath = path.join(process.resourcesPath, 'sql-wasm.wasm');
			}

			console.log('[Database] Loading WASM from:', wasmPath);
			const wasmBinary = await fs.readFile(wasmPath);

			const SQL = await initSqlJs({
				wasmBinary,
			});

			// Try to load existing database
			try {
				const buffer = await fs.readFile(this.dbPath);
				this.db = new SQL.Database(buffer);
				console.log('[Database] Loaded existing database');
			} catch (error) {
				// Create new database if file doesn't exist
				this.db = new SQL.Database();
				console.log('[Database] Created new database');
			}

			// Run migrations
			await this.runMigrations();

			// Save database to disk
			await this.saveToDisk();

			console.log('[Database] Initialized at', this.dbPath);
		} catch (error) {
			console.error('[Database] Failed to initialize:', error);
			throw error;
		}
	}

	async close(): Promise<void> {
		if (this.db) {
			await this.saveToDisk();
			this.db.close();
			this.db = null;
		}
	}

	private async saveToDisk(): Promise<void> {
		if (!this.db) return;
		const data = this.db.export();
		await fs.writeFile(this.dbPath, data);
	}

	private async runMigrations(): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		// Create migrations table
		this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

		// Define migrations
		const migrations = [
			{
				name: '001_initial_schema',
				sql: this.getMigration001(),
			},
		];

		// Apply migrations
		for (const migration of migrations) {
			const result = this.db.exec('SELECT id FROM migrations WHERE name = ?', [
				migration.name,
			]);

			if (result.length === 0 || result[0].values.length === 0) {
				console.log(`[Database] Applying migration: ${migration.name}`);
				this.db.run(migration.sql);
				this.db.run('INSERT INTO migrations (name) VALUES (?)', [
					migration.name,
				]);
				await this.saveToDisk();
			}
		}
	}

	private getMigration001(): string {
		return `
      -- User profiles
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        target_level TEXT DEFAULT 'C1',
        native_language TEXT,
        settings_json TEXT
      );

      -- Sessions
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        config_json TEXT NOT NULL,
        started_at TIMESTAMP NOT NULL,
        ended_at TIMESTAMP,
        status TEXT NOT NULL,
        total_duration_seconds INTEGER,
        estimated_level TEXT,
        current_state TEXT,
        FOREIGN KEY (profile_id) REFERENCES profiles(id)
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(profile_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);

      -- Session parts
      CREATE TABLE IF NOT EXISTS session_parts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        part_number INTEGER NOT NULL,
        started_at TIMESTAMP NOT NULL,
        ended_at TIMESTAMP,
        status TEXT NOT NULL,
        task_id TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_parts_session ON session_parts(session_id);

      -- Turns
      CREATE TABLE IF NOT EXISTS turns (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        part_number INTEGER,
        sequence_number INTEGER NOT NULL,
        speaker TEXT NOT NULL,
        started_at TIMESTAMP NOT NULL,
        ended_at TIMESTAMP NOT NULL,
        duration_seconds REAL NOT NULL,
        transcript TEXT NOT NULL,
        edited_transcript TEXT,
        asr_confidence REAL,
        audio_path TEXT,
        word_count INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id, sequence_number);

      -- Transcript words
      CREATE TABLE IF NOT EXISTS transcript_words (
        id TEXT PRIMARY KEY,
        turn_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        word TEXT NOT NULL,
        start_time REAL NOT NULL,
        end_time REAL NOT NULL,
        confidence REAL,
        FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_words_turn ON transcript_words(turn_id, sequence);

      -- Assessments
      CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assessment_version TEXT NOT NULL,
        estimated_level TEXT,
        overall_summary TEXT,
        scores_json TEXT NOT NULL,
        strengths_json TEXT,
        corrections_json TEXT,
        fluency_metrics_json TEXT,
        interaction_analysis_json TEXT,
        priority_improvements_json TEXT,
        limitations_json TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_assessments_session ON assessments(session_id);

      -- Corrections
      CREATE TABLE IF NOT EXISTS corrections (
        id TEXT PRIMARY KEY,
        assessment_id TEXT NOT NULL,
        turn_id TEXT NOT NULL,
        original_excerpt TEXT NOT NULL,
        corrected_excerpt TEXT NOT NULL,
        natural_c1_alternative TEXT,
        category TEXT NOT NULL,
        rule_or_explanation TEXT,
        severity TEXT,
        confidence REAL,
        user_feedback TEXT,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
        FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_corrections_assessment ON corrections(assessment_id);
      CREATE INDEX IF NOT EXISTS idx_corrections_category ON corrections(category);

      -- Audio metrics
      CREATE TABLE IF NOT EXISTS audio_metrics (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        turn_id TEXT,
        metric_type TEXT NOT NULL,
        metric_value REAL,
        metadata_json TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_metrics_session ON audio_metrics(session_id);

      -- Recurring mistakes
      CREATE TABLE IF NOT EXISTS recurring_mistakes (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        normalized_pattern TEXT NOT NULL,
        category TEXT NOT NULL,
        first_seen_at TIMESTAMP NOT NULL,
        last_seen_at TIMESTAMP NOT NULL,
        occurrence_count INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active',
        confidence REAL,
        examples_json TEXT,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_mistakes_profile ON recurring_mistakes(profile_id, status);

      -- Tasks
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        version INTEGER NOT NULL DEFAULT 1,
        part INTEGER NOT NULL,
        title TEXT NOT NULL,
        topic_tags_json TEXT,
        difficulty TEXT NOT NULL,
        instructions TEXT NOT NULL,
        questions_json TEXT,
        image_assets_json TEXT,
        discussion_options_json TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        licence TEXT,
        is_active BOOLEAN DEFAULT TRUE
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_part ON tasks(part, is_active);
      CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON tasks(difficulty);

      -- Generated exercises
      CREATE TABLE IF NOT EXISTS generated_exercises (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        exercise_type TEXT NOT NULL,
        target_skill TEXT NOT NULL,
        source_mistake_id TEXT,
        source_session_id TEXT,
        content_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_exercises_profile ON generated_exercises(profile_id);

      -- Exercise attempts
      CREATE TABLE IF NOT EXISTS exercise_attempts (
        id TEXT PRIMARY KEY,
        exercise_id TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed BOOLEAN DEFAULT FALSE,
        performance_json TEXT,
        FOREIGN KEY (exercise_id) REFERENCES generated_exercises(id) ON DELETE CASCADE,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      );

      -- Installed models
      CREATE TABLE IF NOT EXISTS installed_models (
        id TEXT PRIMARY KEY,
        model_type TEXT NOT NULL,
        model_name TEXT NOT NULL,
        model_size TEXT,
        installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP,
        performance_profile TEXT,
        metadata_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_models_type ON installed_models(model_type);

      -- Application events
      CREATE TABLE IF NOT EXISTS app_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        details_json TEXT,
        occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_events_occurred ON app_events(occurred_at DESC);

      -- Create default profile if none exists
      INSERT OR IGNORE INTO profiles (id, name, target_level) 
      VALUES ('default', 'Default User', 'C1');
    `;
	}

	// Session operations
	async createSession(session: Omit<Session, 'id'>): Promise<Session> {
		if (!this.db) throw new Error('Database not initialized');

		const id = crypto.randomUUID();
		const fullSession: Session = { ...session, id };

		this.db.run(
			`INSERT INTO sessions (id, profile_id, mode, config_json, started_at, status, current_state)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				fullSession.id,
				fullSession.profileId,
				fullSession.mode,
				JSON.stringify(fullSession.config),
				fullSession.startedAt,
				fullSession.status,
				fullSession.currentState || null,
			],
		);

		await this.saveToDisk();
		return fullSession;
	}

	async updateSession(id: string, updates: Partial<Session>): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		const fields: string[] = [];
		const values: any[] = [];

		if (updates.status) {
			fields.push('status = ?');
			values.push(updates.status);
		}
		if (updates.endedAt) {
			fields.push('ended_at = ?');
			values.push(updates.endedAt);
		}
		if (updates.totalDurationSeconds !== undefined) {
			fields.push('total_duration_seconds = ?');
			values.push(updates.totalDurationSeconds);
		}
		if (updates.estimatedLevel) {
			fields.push('estimated_level = ?');
			values.push(updates.estimatedLevel);
		}
		if (updates.currentState) {
			fields.push('current_state = ?');
			values.push(updates.currentState);
		}

		if (fields.length > 0) {
			values.push(id);
			this.db.run(
				`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`,
				values,
			);
			await this.saveToDisk();
		}
	}

	async getSession(id: string): Promise<Session | null> {
		if (!this.db) throw new Error('Database not initialized');

		const result = this.db.exec('SELECT * FROM sessions WHERE id = ?', [id]);

		if (result.length === 0 || result[0].values.length === 0) return null;

		const row = result[0];
		const columns = row.columns;
		const values = row.values[0];

		const rowObj: any = {};
		columns.forEach((col, idx) => {
			rowObj[col] = values[idx];
		});

		return {
			id: rowObj.id,
			profileId: rowObj.profile_id,
			mode: rowObj.mode,
			config: JSON.parse(rowObj.config_json),
			startedAt: rowObj.started_at,
			endedAt: rowObj.ended_at,
			status: rowObj.status,
			totalDurationSeconds: rowObj.total_duration_seconds,
			estimatedLevel: rowObj.estimated_level,
			currentState: rowObj.current_state,
		};
	}

	async listSessions(
		profileId: string,
		limit: number = 50,
	): Promise<Session[]> {
		if (!this.db) throw new Error('Database not initialized');

		const result = this.db.exec(
			'SELECT * FROM sessions WHERE profile_id = ? ORDER BY started_at DESC LIMIT ?',
			[profileId, limit],
		);

		if (result.length === 0) return [];

		const row = result[0];
		const columns = row.columns;

		return row.values.map((values) => {
			const rowObj: any = {};
			columns.forEach((col, idx) => {
				rowObj[col] = values[idx];
			});

			return {
				id: rowObj.id,
				profileId: rowObj.profile_id,
				mode: rowObj.mode,
				config: JSON.parse(rowObj.config_json),
				startedAt: rowObj.started_at,
				endedAt: rowObj.ended_at,
				status: rowObj.status,
				totalDurationSeconds: rowObj.total_duration_seconds,
				estimatedLevel: rowObj.estimated_level,
				currentState: rowObj.current_state,
			};
		});
	}

	// Turn operations
	async saveTurn(turn: Turn): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		this.db.run(
			`INSERT INTO turns (id, session_id, part_number, sequence_number, speaker, started_at, ended_at, duration_seconds, transcript, edited_transcript, asr_confidence, audio_path, word_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				turn.id,
				turn.sessionId,
				turn.partNumber || null,
				turn.sequenceNumber,
				turn.speaker,
				turn.startedAt,
				turn.endedAt,
				turn.durationSeconds,
				turn.transcript,
				turn.editedTranscript || null,
				turn.asrConfidence || null,
				turn.audioPath || null,
				turn.wordCount,
			],
		);

		await this.saveToDisk();
	}

	async getTurns(sessionId: string): Promise<Turn[]> {
		if (!this.db) throw new Error('Database not initialized');

		const result = this.db.exec(
			'SELECT * FROM turns WHERE session_id = ? ORDER BY sequence_number',
			[sessionId],
		);

		if (result.length === 0) return [];

		const row = result[0];
		const columns = row.columns;

		return row.values.map((values) => {
			const rowObj: any = {};
			columns.forEach((col, idx) => {
				rowObj[col] = values[idx];
			});

			return {
				id: rowObj.id,
				sessionId: rowObj.session_id,
				partNumber: rowObj.part_number,
				sequenceNumber: rowObj.sequence_number,
				speaker: rowObj.speaker as Speaker,
				startedAt: rowObj.started_at,
				endedAt: rowObj.ended_at,
				durationSeconds: rowObj.duration_seconds,
				transcript: rowObj.transcript,
				editedTranscript: rowObj.edited_transcript,
				asrConfidence: rowObj.asr_confidence,
				audioPath: rowObj.audio_path,
				wordCount: rowObj.word_count,
			};
		});
	}

	// Assessment operations
	async saveAssessment(assessment: Assessment): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		this.db.run(
			`INSERT OR REPLACE INTO assessments (id, session_id, assessment_version, estimated_level, overall_summary, scores_json, strengths_json, corrections_json, fluency_metrics_json, interaction_analysis_json, priority_improvements_json, limitations_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				assessment.id,
				assessment.sessionId,
				assessment.assessmentVersion,
				assessment.estimatedOverallLevel,
				assessment.overallSummary,
				JSON.stringify(assessment.scores),
				JSON.stringify(assessment.strengths),
				JSON.stringify(assessment.corrections),
				JSON.stringify(assessment.fluency),
				assessment.interactionAnalysis ?
					JSON.stringify(assessment.interactionAnalysis)
				:	null,
				JSON.stringify(assessment.priorityImprovements),
				JSON.stringify(assessment.assessmentLimitations),
			],
		);

		await this.saveToDisk();
	}

	async getAssessment(sessionId: string): Promise<Assessment | null> {
		if (!this.db) throw new Error('Database not initialized');

		const result = this.db.exec(
			'SELECT * FROM assessments WHERE session_id = ?',
			[sessionId],
		);

		if (result.length === 0 || result[0].values.length === 0) return null;

		const row = result[0];
		const columns = row.columns;
		const values = row.values[0];

		const rowObj: any = {};
		columns.forEach((col, idx) => {
			rowObj[col] = values[idx];
		});

		return {
			id: rowObj.id,
			sessionId: rowObj.session_id,
			createdAt: rowObj.created_at,
			assessmentVersion: rowObj.assessment_version,
			estimatedOverallLevel: rowObj.estimated_level,
			overallSummary: rowObj.overall_summary,
			scores: JSON.parse(rowObj.scores_json),
			strengths: JSON.parse(rowObj.strengths_json),
			corrections: JSON.parse(rowObj.corrections_json),
			fluency: JSON.parse(rowObj.fluency_metrics_json),
			interactionAnalysis:
				rowObj.interaction_analysis_json ?
					JSON.parse(rowObj.interaction_analysis_json)
				:	undefined,
			priorityImprovements: JSON.parse(rowObj.priority_improvements_json),
			assessmentLimitations: JSON.parse(rowObj.limitations_json),
		};
	}

	getDb(): Database.Database {
		if (!this.db) throw new Error('Database not initialized');
		return this.db;
	}
}
