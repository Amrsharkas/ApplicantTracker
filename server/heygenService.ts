interface HeyGenSession {
  session_id: string;
  url: string;
  access_token: string;
  session_duration_limit: number;
  is_paid: boolean;
  realtime_endpoint?: string;
  livekit_agent_token?: string;
  // Include any other fields from the full HeyGen response
  [key: string]: any;
}

interface HeyGenTaskResponse {
  duration_ms: number;
  task_id: string;
}

interface HeyGenCreateSessionOptions {
  quality?: 'low' | 'medium' | 'high';
  video_encoding?: 'H264' | 'VP8';
  disable_idle_timeout?: boolean;
  version?: string;
  activity_idle_timeout?: number;
}

export class HeyGenService {
  private apiKey: string;
  private activeSessions: Map<string, HeyGenSession> = new Map();

  constructor() {
    this.apiKey = process.env.HEYGEN_API_KEY || '';
    if (!this.apiKey) {
      console.warn('HeyGen API key not configured. HeyGen features will be disabled.');
    }
  }

  /**
   * Create a new HeyGen streaming session
   */
  async createSession(options: HeyGenCreateSessionOptions = {}): Promise<HeyGenSession> {
    if (!this.apiKey) {
      throw new Error('HeyGen API key not configured');
    }

    const requestBody = {
      quality: options.quality || 'medium',
      voice: {
        rate: 1
      },
      video_encoding: options.video_encoding || 'VP8',
      disable_idle_timeout: options.disable_idle_timeout || false,
      version: options.version || 'v2',
      stt_settings: {
        provider: 'deepgram',
        confidence: 0.55
      },
      activity_idle_timeout: options.activity_idle_timeout || 120
    };

    console.log('Creating HeyGen session with options:', requestBody);

    try {
      const response = await fetch('https://api.heygen.com/v1/streaming.new', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen session creation failed:', response.status, errorText);
        throw new Error(`Failed to create HeyGen session: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      if (data.code !== 100 || !data.data) {
        console.error('HeyGen API returned error:', data);
        throw new Error(`HeyGen API error: ${data.message || 'Unknown error'}`);
      }

      const session: HeyGenSession = data.data;
      this.activeSessions.set(session.session_id, session);

      console.log('HeyGen session created successfully:', {
        session_id: session.session_id,
        url: session.url,
        realtime_endpoint: session.realtime_endpoint,
        livekit_agent_token: session.livekit_agent_token ? 'present' : 'missing',
        duration_limit: session.session_duration_limit,
        is_paid: session.is_paid,
        all_fields: Object.keys(session)
      });

      return session;
    } catch (error) {
      console.error('Error creating HeyGen session:', error);
      throw error;
    }
  }

  /**
   * Start an existing HeyGen session
   */
  async startSession(sessionId: string): Promise<{ status: string }> {
    if (!this.apiKey) {
      throw new Error('HeyGen API key not configured');
    }

    if (!this.activeSessions.has(sessionId)) {
      throw new Error('Session not found');
    }

    console.log('Starting HeyGen session:', sessionId);

    try {
      const response = await fetch('https://api.heygen.com/v1/streaming.start', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({
          session_id: sessionId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen session start failed:', response.status, errorText);
        throw new Error(`Failed to start HeyGen session: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('HeyGen session started successfully:', { sessionId, status: data.status });

      return data;
    } catch (error) {
      console.error('Error starting HeyGen session:', error);
      throw error;
    }
  }

  /**
   * Send text task to HeyGen session
   */
  async sendTask(sessionId: string, text: string): Promise<HeyGenTaskResponse> {
    if (!this.apiKey) {
      throw new Error('HeyGen API key not configured');
    }

    if (!this.activeSessions.has(sessionId)) {
      throw new Error('Session not found');
    }

    console.log('Sending task to HeyGen session:', { sessionId, text: text.substring(0, 100) + '...' });

    try {
      const response = await fetch('https://api.heygen.com/v1/streaming.task', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({
          session_id: sessionId,
          text: text
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen task send failed:', response.status, errorText);
        throw new Error(`Failed to send task to HeyGen: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('HeyGen task sent successfully:', { sessionId, task_id: data.task_id, duration_ms: data.duration_ms });

      return data;
    } catch (error) {
      console.error('Error sending task to HeyGen:', error);
      throw error;
    }
  }

  /**
   * Stop a HeyGen session
   */
  async stopSession(sessionId: string): Promise<{ status: string }> {
    if (!this.apiKey) {
      throw new Error('HeyGen API key not configured');
    }

    if (!this.activeSessions.has(sessionId)) {
      console.warn('Attempted to stop non-existent session:', sessionId);
      return { status: 'not_found' };
    }

    console.log('Stopping HeyGen session:', sessionId);

    try {
      const response = await fetch('https://api.heygen.com/v1/streaming.stop', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({
          session_id: sessionId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen session stop failed:', response.status, errorText);
        throw new Error(`Failed to stop HeyGen session: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('HeyGen session stopped successfully:', { sessionId, status: data.status });

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      return data;
    } catch (error) {
      console.error('Error stopping HeyGen session:', error);
      // Still remove from active sessions even if API call fails
      this.activeSessions.delete(sessionId);
      throw error;
    }
  }

  /**
   * Get active session by ID
   */
  getSession(sessionId: string): HeyGenSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Map<string, HeyGenSession> {
    return new Map(this.activeSessions);
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions) {
      const sessionAge = now - parseInt(sessionId.split('-')[0] || '0');
      const maxAge = session.session_duration_limit * 1000; // Convert to milliseconds

      if (sessionAge > maxAge) {
        console.log('Cleaning up expired HeyGen session:', sessionId);
        this.activeSessions.delete(sessionId);
        // Try to stop it gracefully, but don't wait for it
        this.stopSession(sessionId).catch(err =>
          console.warn('Failed to cleanup expired session:', err)
        );
      }
    }
  }

  /**
   * Check if HeyGen is configured and available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

// Export singleton instance
export const heygenService = new HeyGenService();

// Schedule cleanup of expired sessions every 5 minutes
setInterval(() => {
  heygenService.cleanupExpiredSessions();
}, 5 * 60 * 1000);