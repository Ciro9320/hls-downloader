import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { videoUrl, audioUrls, filename } = await request.json();

    if (!videoUrl || !filename) {
      return NextResponse.json({ error: 'Video URL and filename are required' }, { status: 400 });
    }

    // Prepare ffmpeg command
    // Basic command: ffmpeg -i [video_url] -c copy [filename].mp4
    // If multiple audio tracks, it gets more complex.
    
    // Use DOWNLOAD_DIR environment variable if available, otherwise default to local 'downloads' folder
    const downloadDir = process.env.DOWNLOAD_DIR || path.join(process.cwd(), 'downloads');
    const outputPath = path.join(downloadDir, `${filename}.mp4`);
    
    // Ensure downloads directory exists
    const fs = require('fs');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }


    const args = ['-i', videoUrl];
    
    // Add audio tracks if provided and different from video stream
    // (In HLS, often the variant already has audio, but sometimes they are separate)
    if (audioUrls && audioUrls.length > 0) {
      audioUrls.forEach((url: string) => {
        args.push('-i', url);
      });
      // Simple mapping: take first video, all audios
      args.push('-map', '0:v:0');
      for (let i = 0; i <= audioUrls.length; i++) {
        args.push('-map', `${i}:a?`);
      }
    }

    args.push('-c', 'copy', '-y', outputPath);

    console.log('Running ffmpeg with args:', args);

    // We don't want to wait for it to finish in the request
    // Just start it and return
    const ffmpeg = spawn('ffmpeg', args);

    ffmpeg.on('error', (err: any) => {
      console.error('Failed to start ffmpeg process:', err);
      if (err.code === 'ENOENT') {
        console.error('FFMPEG NOT FOUND. Please install it (e.g. brew install ffmpeg)');
      }
    });

    ffmpeg.stdout.on('data', (data) => {
      console.log(`ffmpeg stdout: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
      console.log(`ffmpeg stderr: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      console.log(`ffmpeg process exited with code ${code}`);
    });

    return NextResponse.json({ 
      message: 'Download started', 
      path: outputPath,
      warning: 'Note: FFMPEG must be installed on your system for this to work.'
    });

  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
