import { db } from '../db.js';
import { interviewSessions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

// Set FFmpeg path to the static binary
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
  console.log('✅ Using FFmpeg from ffmpeg-static package');
} else {
  console.warn('⚠️ ffmpeg-static not found, using system FFmpeg');
}

// Get the base uploads directory
const getUploadsDirectory = (): string => {
  // Use the uploads directory relative to server folder
  return path.join(__dirname, '..', '..', 'uploads');
};

export interface HLSUploadResult {
  success: boolean;
  segmentPath?: string;
  segmentIndex?: number;
  error?: string;
}

export interface HLSFinalizeResult {
  success: boolean;
  playlistUrl?: string;
  totalSegments?: number;
  error?: string;
}

interface SegmentMetadata {
  index: number;
  duration: number;
  path: string;
}

export const hlsService = {
  /**
   * Get the HLS directory for a specific interview
   */
  getHLSDirectory(interviewId: string): string {
    const uploadsDir = getUploadsDirectory();
    return path.join(uploadsDir, 'hls', interviewId);
  },

  /**
   * Get the temp directory for processing chunks
   */
  getTempDirectory(interviewId: string): string {
    const uploadsDir = getUploadsDirectory();
    return path.join(uploadsDir, 'temp', interviewId);
  },

  /**
   * Process a WebM chunk - Just store it, transcode later when complete
   *
   * Note: MediaRecorder only puts full WebM headers in the first chunk.
   * Subsequent chunks are data-only and cannot be transcoded individually.
   * We store all chunks and transcode the complete merged file during finalization.
   */
  async processHLSChunk(
    interviewId: string,
    chunkIndex: number,
    chunkFile: Express.Multer.File
  ): Promise<HLSUploadResult> {
    try {
      const tempDir = this.getTempDirectory(interviewId);

      // Ensure directory exists
      await mkdir(tempDir, { recursive: true });

      const tempChunkPath = path.join(tempDir, `chunk-${chunkIndex}.webm`);

      console.log(`📥 Storing chunk ${chunkIndex}:`);
      console.log(`   Upload size: ${chunkFile.size} bytes`);
      console.log(`   Storage path: ${tempChunkPath}`);

      // Check if uploaded file exists and is valid
      if (!fs.existsSync(chunkFile.path)) {
        throw new Error(`Uploaded chunk file not found at: ${chunkFile.path}`);
      }

      const uploadStats = fs.statSync(chunkFile.path);
      if (uploadStats.size === 0) {
        throw new Error('Uploaded chunk file is empty');
      }

      console.log(`   ✅ Upload file verified: ${uploadStats.size} bytes`);

      // Copy uploaded chunk to temp directory
      try {
        fs.copyFileSync(chunkFile.path, tempChunkPath);
        console.log(`   ✅ Chunk stored successfully`);
      } catch (copyError: any) {
        throw new Error(`Failed to copy chunk: ${copyError.message}`);
      }

      // Verify the copied file
      const tempStats = fs.statSync(tempChunkPath);
      if (tempStats.size !== uploadStats.size) {
        throw new Error(`Chunk size mismatch: expected ${uploadStats.size}, got ${tempStats.size}`);
      }

      // Delete the original upload file
      try {
        fs.unlinkSync(chunkFile.path);
      } catch (unlinkError) {
        console.warn('   ⚠️ Could not delete original upload file:', unlinkError);
      }

      console.log(`✅ Chunk ${chunkIndex} stored (will transcode during finalization)`);

      return {
        success: true,
        segmentPath: `/temp/${interviewId}/chunk-${chunkIndex}.webm`,
        segmentIndex: chunkIndex
      };
    } catch (error: any) {
      console.error('Chunk storage failed:', error);

      // Clean up on error
      if (chunkFile.path && fs.existsSync(chunkFile.path)) {
        fs.unlinkSync(chunkFile.path);
      }

      return {
        success: false,
        error: `Chunk storage failed: ${error.message}`
      };
    }
  },

  /**
   * Verify WebM file is valid using ffprobe
   */
  async verifyWebMFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`ffprobe error: ${err.message}`));
          return;
        }

        // Check if file has video stream
        const hasVideo = metadata.streams?.some(s => s.codec_type === 'video');
        if (!hasVideo) {
          reject(new Error('No video stream found in WebM file'));
          return;
        }

        // Log WebM file info
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        console.log('   WebM file info:');
        if (videoStream) {
          console.log(`     Video: ${videoStream.codec_name}, ${videoStream.width}x${videoStream.height}`);
        }
        if (audioStream) {
          console.log(`     Audio: ${audioStream.codec_name}`);
        }
        console.log(`     Duration: ${metadata.format.duration}s`);

        resolve();
      });
    });
  },

  /**
   * Transcode merged WebM file to HLS using FFmpeg HLS muxer
   */
  async transcodeToHLS(
    inputPath: string,
    playlistPath: string,
    segmentPattern: string,
    segmentDuration: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .inputOptions([
          '-analyzeduration 2000000',        // Reduced from 10M to 2M
          '-probesize 2000000'               // Reduced from 10M to 2M
        ])
        .outputOptions([
          '-c:v libx264',                    // Video codec
          '-preset ultrafast',               // FASTEST preset
          '-crf 30',                         // More aggressive compression (was 28)
          '-tune zerolatency',               // Optimize for fast encoding
          '-c:a aac',                        // Audio codec
          '-b:a 64k',                        // More aggressive audio bitrate (was 96k)
          '-vf scale=854:480',               // Scale to 480p
          '-b:v 500k',                       // More aggressive video bitrate (was 1000k)
          '-maxrate 750k',                   // Lower max bitrate (was 1500k)
          '-bufsize 1000k',                  // Smaller buffer (was 2000k)
          '-g 48',                           // GOP size for faster seeking
          '-sc_threshold 0',                 // Disable scene change detection
          '-f hls',                          // HLS format
          '-hls_time ' + segmentDuration,    // Segment duration
          '-hls_playlist_type vod',          // VOD playlist
          '-hls_segment_filename ' + segmentPattern, // Segment naming pattern
          '-hls_list_size 0',                // Include all segments in playlist
          '-hls_flags independent_segments', // Make segments independent
          '-threads 0'                       // Use all available CPU cores
        ])
        .output(playlistPath)
        .on('start', (cmd) => {
          console.log('   FFmpeg HLS command:', cmd);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`   Transcoding: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('   ✅ HLS transcoding completed');
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          console.error('   ❌ FFmpeg HLS error:', err.message);
          if (stderr) {
            console.error('   FFmpeg stderr:', stderr);
          }
          reject(new Error(`HLS transcoding failed: ${err.message}`));
        })
        .run();
    });
  },


  /**
   * Convert WebM chunk to HLS TS segment using FFmpeg (DEPRECATED - not used anymore)
   */
  async convertToHLSSegment(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🎬 Starting FFmpeg conversion...`);
      console.log(`   Input: ${inputPath}`);
      console.log(`   Output: ${outputPath}`);

      // Verify input file exists
      if (!fs.existsSync(inputPath)) {
        reject(new Error(`Input file does not exist: ${inputPath}`));
        return;
      }

      const inputStats = fs.statSync(inputPath);
      console.log(`   Input size: ${inputStats.size} bytes`);

      if (inputStats.size === 0) {
        reject(new Error('Input file is empty'));
        return;
      }

      ffmpeg(inputPath)
        .inputOptions([
          '-analyzeduration 10000000',  // Analyze up to 10s of data
          '-probesize 10000000'          // Probe up to 10MB
        ])
        .outputOptions([
          '-c:v libx264',           // Video codec: H.264
          '-preset veryfast',        // Encoding speed
          '-crf 23',                 // Quality (lower is better, 23 is good default)
          '-c:a aac',                // Audio codec: AAC (if audio exists)
          '-b:a 128k',               // Audio bitrate
          '-vf scale=1280:720',      // Scale to 720p
          '-b:v 2500k',              // Video bitrate 2.5 Mbps
          '-maxrate 2500k',          // Max bitrate
          '-bufsize 5000k',          // Buffer size
          '-avoid_negative_ts make_zero', // Fix timestamp issues
          '-fflags +genpts',         // Generate presentation timestamps
          '-f mpegts'                // Output format: MPEG-TS
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('   FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`   Processing: ${Math.round(progress.percent)}% done`);
          }
        })
        .on('end', () => {
          console.log('   ✅ FFmpeg conversion completed');

          // Verify output was created
          if (fs.existsSync(outputPath)) {
            const outputStats = fs.statSync(outputPath);
            console.log(`   Output size: ${outputStats.size} bytes`);
            resolve();
          } else {
            reject(new Error('FFmpeg completed but output file was not created'));
          }
        })
        .on('error', (err, stdout, stderr) => {
          console.error('   ❌ FFmpeg error:', err.message);
          if (stderr) {
            console.error('   FFmpeg stderr:', stderr);
          }
          reject(new Error(`FFmpeg conversion failed: ${err.message}${stderr ? ': ' + stderr : ''}`));
        })
        .run();
    });
  },

  /**
   * Get segment duration using FFmpeg probe
   */
  async getSegmentDuration(segmentPath: string): Promise<{ duration: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(segmentPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        const duration = metadata.format.duration || 6; // Default to 6 seconds
        resolve({ duration });
      });
    });
  },

  /**
   * Save segment metadata to JSON file
   */
  async saveSegmentMetadata(interviewId: string, segment: SegmentMetadata): Promise<void> {
    const hlsDir = this.getHLSDirectory(interviewId);
    const metadataPath = path.join(hlsDir, 'segments-metadata.json');

    let metadata: SegmentMetadata[] = [];

    // Read existing metadata if it exists
    if (fs.existsSync(metadataPath)) {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      metadata = JSON.parse(content);
    }

    // Add or update segment metadata
    const existingIndex = metadata.findIndex(s => s.index === segment.index);
    if (existingIndex >= 0) {
      metadata[existingIndex] = segment;
    } else {
      metadata.push(segment);
    }

    // Sort by index
    metadata.sort((a, b) => a.index - b.index);

    // Save metadata
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  },

  /**
   * Generate M3U8 playlist - Merge chunks first, then create HLS segments
   */
  async generateM3U8Playlist(interviewId: string): Promise<HLSFinalizeResult> {
    try {
      const hlsDir = this.getHLSDirectory(interviewId);
      const tempDir = this.getTempDirectory(interviewId);

      // Ensure HLS directory exists
      await mkdir(hlsDir, { recursive: true });

      console.log('🔄 Starting HLS playlist generation...');
      console.log(`   Temp dir: ${tempDir}`);
      console.log(`   HLS dir: ${hlsDir}`);

      // Get all chunk files
      if (!fs.existsSync(tempDir)) {
        return {
          success: false,
          error: 'No chunks found - temp directory does not exist'
        };
      }

      const chunkFiles = fs.readdirSync(tempDir)
        .filter(f => f.startsWith('chunk-') && f.endsWith('.webm'))
        .sort((a, b) => {
          // Extract chunk index from filename (chunk-0.webm -> 0)
          const indexA = parseInt(a.match(/chunk-(\d+)\.webm/)?.[1] || '0');
          const indexB = parseInt(b.match(/chunk-(\d+)\.webm/)?.[1] || '0');
          return indexA - indexB; // Numerical sorting
        });

      if (chunkFiles.length === 0) {
        return {
          success: false,
          error: 'No chunk files found'
        };
      }

      console.log(`   Found ${chunkFiles.length} chunks`);

      // Step 1: Merge all chunks into a single WebM file using BINARY concatenation
      // MediaRecorder creates: chunk-0 has headers, chunk-1+ are headerless fragments
      // We must use binary concatenation, NOT FFmpeg concat demuxer
      const mergedPath = path.join(tempDir, 'merged.webm');
      console.log('📦 Merging chunks using binary concatenation...');
      console.log('   (MediaRecorder: chunk-0 has headers, chunk-1+ are fragments)');

      // Binary concatenation: append all chunks sequentially
      const writeStream = fs.createWriteStream(mergedPath);

      for (const chunkFile of chunkFiles) {
        const chunkPath = path.join(tempDir, chunkFile);
        const chunkData = fs.readFileSync(chunkPath);
        writeStream.write(chunkData);
        console.log(`   ✅ Appended ${chunkFile} (${chunkData.length} bytes)`);
      }

      writeStream.end();

      // Wait for write to complete
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      console.log('   ✅ Binary concatenation completed');

      const mergedStats = fs.statSync(mergedPath);
      console.log(`   ✅ Merged file: ${(mergedStats.size / 1024 / 1024).toFixed(2)} MB`);

      // Step 2: Transcode merged file to HLS segments using FFmpeg
      console.log('🎬 Transcoding to HLS segments...');

      const segmentDuration = 10; // 10 second segments
      const segmentPattern = path.join(hlsDir, 'segment-%04d.ts');
      const playlistPath = path.join(hlsDir, 'playlist.m3u8');

      await this.transcodeToHLS(mergedPath, playlistPath, segmentPattern, segmentDuration);

      console.log('   ✅ HLS segments created');

      // Count segments
      const segmentFiles = fs.readdirSync(hlsDir).filter(f => f.endsWith('.ts'));

      console.log(`   ✅ Created ${segmentFiles.length} HLS segments`);

      // Step 3: Generate the public URL for the playlist
      // The playlist will be served from /uploads/hls/{interviewId}/playlist.m3u8
      const relativeUrl = `/uploads/hls/${interviewId}/playlist.m3u8`;

      // Construct full URL using APP_URL from environment
      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      const fullUrl = `${baseUrl}${relativeUrl}`;

      console.log('   ✅ Playlist relative URL:', relativeUrl);
      console.log('   ✅ Playlist full URL:', fullUrl);

      // Update interview session record with FULL playlist URL
      // Convert sessionId to number if it's not already
      const sessionIdNum = parseInt(interviewId);

      if (!isNaN(sessionIdNum)) {
        await db
          .update(interviewSessions)
          .set({
            interviewVideoUrl: fullUrl  // Save full URL instead of relative URL
          })
          .where(eq(interviewSessions.id, sessionIdNum));

        console.log(`✅ Updated interview session ${sessionIdNum} with full video URL: ${fullUrl}`);
      } else {
        console.warn(`⚠️ Could not update interview session: invalid ID ${interviewId}`);
      }

      console.log(`✅ HLS playlist generated: ${fullUrl}`);
      console.log(`📊 Total segments: ${segmentFiles.length}`);

      // Save playlist metadata with full URL
      const metadataPath = path.join(hlsDir, 'playlist-metadata.json');
      const metadata = {
        interviewId,
        playlistUrl: fullUrl,
        relativeUrl,
        totalSegments: segmentFiles.length,
        generatedAt: new Date().toISOString(),
        baseUrl
      };
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`✅ Saved playlist metadata: ${metadataPath}`);

      // Clean up local temp files
      await this.cleanupTempFiles(interviewId);

      return {
        success: true,
        playlistUrl: fullUrl,  // Return full URL
        totalSegments: segmentFiles.length
      };
    } catch (error: any) {
      console.error('Playlist generation failed:', error);
      return {
        success: false,
        error: `Playlist generation failed: ${error.message}`
      };
    }
  },

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(interviewId: string): Promise<void> {
    try {
      const tempDir = this.getTempDirectory(interviewId);

      if (fs.existsSync(tempDir)) {
        const files = await readdir(tempDir);
        for (const file of files) {
          const filePath = path.join(tempDir, file);
          await unlink(filePath);
        }
        await rmdir(tempDir);
      }
    } catch (error) {
      console.error('Temp file cleanup failed:', error);
    }
  },

  /**
   * Delete HLS files for an interview
   */
  async deleteHLSFiles(interviewId: string): Promise<boolean> {
    try {
      // Clean up local HLS directory
      const hlsDir = this.getHLSDirectory(interviewId);
      if (fs.existsSync(hlsDir)) {
        const files = await readdir(hlsDir);
        for (const file of files) {
          const filePath = path.join(hlsDir, file);
          await unlink(filePath);
        }
        await rmdir(hlsDir);
        console.log(`✅ Deleted HLS directory: ${hlsDir}`);
      }

      // Clean up temp directory
      await this.cleanupTempFiles(interviewId);

      return true;
    } catch (error) {
      console.error('HLS file deletion failed:', error);
      return false;
    }
  }
};
