import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

// Set ffmpeg binary path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export interface HLSProcessorOptions {
  sessionId: string;
  chunkIndex: number;
  videoBuffer: Buffer;
  outputDir?: string;
}

export interface HLSProcessorResult {
  success: boolean;
  playlistPath?: string;
  segmentPath?: string;
  error?: string;
}

export class HLSProcessor {
  private baseDir: string;

  constructor(baseDir: string = '/var/www/plato/ApplicantTracker/uploads/recordings/hls') {
    this.baseDir = baseDir;
  }

  /**
   * Process a video chunk and convert it to HLS format
   */
  async processChunk(options: HLSProcessorOptions): Promise<HLSProcessorResult> {
    const { sessionId, chunkIndex, videoBuffer } = options;
    const sessionDir = path.join(this.baseDir, sessionId);

    try {
      // Ensure session directory exists
      await this.ensureDirectory(sessionDir);

      // Save the incoming WebM chunk temporarily
      const tempChunkPath = path.join(sessionDir, `chunk-${chunkIndex}.webm`);
      await writeFile(tempChunkPath, videoBuffer);

      // Output paths for HLS files
      const segmentPath = path.join(sessionDir, `segment-${chunkIndex}.ts`);
      const playlistPath = path.join(sessionDir, 'playlist.m3u8');

      // Convert WebM chunk to HLS segment
      await this.convertToHLS(tempChunkPath, segmentPath, chunkIndex);

      // Update the master playlist
      await this.updatePlaylist(sessionDir, chunkIndex, segmentPath);

      // Clean up temporary WebM chunk
      await this.safeUnlink(tempChunkPath);

      return {
        success: true,
        playlistPath: playlistPath,
        segmentPath: segmentPath,
      };
    } catch (error) {
      console.error(`HLS processing error for session ${sessionId}, chunk ${chunkIndex}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert a WebM chunk to HLS .ts segment using ffmpeg
   */
  private async convertToHLS(inputPath: string, outputPath: string, chunkIndex: number): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v libx264',           // H.264 video codec (widely supported)
          '-c:a aac',                // AAC audio codec (widely supported)
          '-preset veryfast',        // Fast encoding preset
          '-crf 23',                 // Constant Rate Factor (quality: 0=lossless, 51=worst)
          '-maxrate 1500k',          // Maximum bitrate
          '-bufsize 3000k',          // Buffer size
          '-profile:v baseline',     // H.264 baseline profile (maximum compatibility)
          '-level 3.0',              // H.264 level
          '-start_number ' + chunkIndex, // Start segment numbering from chunk index
          '-hls_time 5',             // Target segment duration: 5 seconds
          '-hls_list_size 0',        // Keep all segments in playlist
          '-f mpegts',               // MPEG-TS format for HLS segments
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log(`[HLS] FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[HLS] Processing chunk ${chunkIndex}: ${Math.round(progress.percent)}% done`);
          }
        })
        .on('end', () => {
          console.log(`[HLS] Successfully converted chunk ${chunkIndex} to HLS segment`);
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          console.error(`[HLS] FFmpeg error for chunk ${chunkIndex}:`, err.message);
          console.error(`[HLS] FFmpeg stderr:`, stderr);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Update or create the HLS playlist (.m3u8) file
   */
  private async updatePlaylist(sessionDir: string, chunkIndex: number, segmentPath: string): Promise<void> {
    const playlistPath = path.join(sessionDir, 'playlist.m3u8');
    const segmentFilename = path.basename(segmentPath);

    let playlistContent = '';
    let existingSegments: string[] = [];

    // Check if playlist already exists
    try {
      await access(playlistPath, fs.constants.F_OK);
      const existingContent = await readFile(playlistPath, 'utf-8');

      // Parse existing segments
      const lines = existingContent.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('segment-') && lines[i].endsWith('.ts')) {
          existingSegments.push(lines[i]);
        }
      }
    } catch (error) {
      // Playlist doesn't exist yet, will create new one
    }

    // Add new segment to the list
    existingSegments.push(segmentFilename);

    // Sort segments by index to ensure proper order
    existingSegments.sort((a, b) => {
      const aIndex = parseInt(a.match(/segment-(\d+)\.ts/)?.[1] || '0');
      const bIndex = parseInt(b.match(/segment-(\d+)\.ts/)?.[1] || '0');
      return aIndex - bIndex;
    });

    // Calculate total duration (approximate: 5 seconds per segment)
    const targetDuration = 6; // Slightly higher than actual to be safe

    // Build playlist content
    playlistContent = '#EXTM3U\n';
    playlistContent += '#EXT-X-VERSION:3\n';
    playlistContent += `#EXT-X-TARGETDURATION:${targetDuration}\n`;
    playlistContent += '#EXT-X-MEDIA-SEQUENCE:0\n';

    // Add each segment
    for (const segment of existingSegments) {
      playlistContent += `#EXTINF:5.0,\n`;
      playlistContent += `${segment}\n`;
    }

    // Don't add #EXT-X-ENDLIST yet - recording is still ongoing
    // This will be added when the interview is finalized

    // Write updated playlist
    await writeFile(playlistPath, playlistContent, 'utf-8');
    console.log(`[HLS] Updated playlist with ${existingSegments.length} segments`);
  }

  /**
   * Finalize the HLS playlist when recording is complete
   */
  async finalizePlaylist(sessionId: string): Promise<void> {
    const playlistPath = path.join(this.baseDir, sessionId, 'playlist.m3u8');

    try {
      const content = await readFile(playlistPath, 'utf-8');

      // Add end tag if not already present
      if (!content.includes('#EXT-X-ENDLIST')) {
        const finalContent = content + '#EXT-X-ENDLIST\n';
        await writeFile(playlistPath, finalContent, 'utf-8');
        console.log(`[HLS] Finalized playlist for session ${sessionId}`);
      }
    } catch (error) {
      console.error(`[HLS] Error finalizing playlist for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Ensure a directory exists, create if it doesn't
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await access(dirPath, fs.constants.F_OK);
    } catch {
      await mkdir(dirPath, { recursive: true });
      console.log(`[HLS] Created directory: ${dirPath}`);
    }
  }

  /**
   * Safely unlink a file (doesn't throw if file doesn't exist)
   */
  private async safeUnlink(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error) {
      // Ignore errors if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`[HLS] Warning: Could not delete file ${filePath}:`, error);
      }
    }
  }

  /**
   * Clean up old or incomplete HLS recordings
   */
  async cleanup(sessionId: string): Promise<void> {
    const sessionDir = path.join(this.baseDir, sessionId);

    try {
      // Remove all files in session directory
      const files = fs.readdirSync(sessionDir);
      for (const file of files) {
        await this.safeUnlink(path.join(sessionDir, file));
      }

      // Remove session directory
      fs.rmdirSync(sessionDir);
      console.log(`[HLS] Cleaned up session directory: ${sessionId}`);
    } catch (error) {
      console.error(`[HLS] Error cleaning up session ${sessionId}:`, error);
    }
  }

  /**
   * Get the playlist path for a session
   */
  getPlaylistPath(sessionId: string): string {
    return path.join(this.baseDir, sessionId, 'playlist.m3u8');
  }

  /**
   * Get relative playlist path (for database storage)
   */
  getRelativePlaylistPath(sessionId: string): string {
    return path.join('hls', sessionId, 'playlist.m3u8');
  }
}

// Export singleton instance
export const hlsProcessor = new HLSProcessor();
