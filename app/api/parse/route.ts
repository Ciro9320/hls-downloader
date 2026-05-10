import { NextResponse } from 'next/server';
import { Parser } from 'm3u8-parser';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.statusText}`);
    }

    const manifestText = await response.text();
    const parser = new Parser();
    parser.push(manifestText);
    parser.end();

    const manifest = parser.manifest;

    let variants = [];
    let audioTracks = [];

    // If it's a Master Playlist
    if (manifest.playlists && manifest.playlists.length > 0) {
      variants = manifest.playlists.map((p: any, index: number) => ({
        id: index,
        bandwidth: p.attributes.BANDWIDTH,
        resolution: p.attributes.RESOLUTION ? `${p.attributes.RESOLUTION.width}x${p.attributes.RESOLUTION.height}` : 'Single Stream',
        codecs: p.attributes.CODECS,
        uri: new URL(p.uri, url).href
      }));
    } else {
      // If it's a Media Playlist (single stream)
      variants = [{
        id: 0,
        bandwidth: 0,
        resolution: 'Original Quality',
        uri: url
      }];
    }

    // Extract audio tracks
    if (manifest.mediaGroups?.AUDIO) {
      audioTracks = Object.keys(manifest.mediaGroups.AUDIO).flatMap(groupName => {
        const group = manifest.mediaGroups.AUDIO[groupName];
        return Object.keys(group).map(lang => ({
          id: `${groupName}-${lang}`,
          name: group[lang].name || lang,
          language: group[lang].language || lang,
          uri: group[lang].uri ? new URL(group[lang].uri, url).href : null,
          default: group[lang].default
        }));
      });
    }


    return NextResponse.json({
      variants,
      audioTracks,
      originalUrl: url
    });
  } catch (error: any) {
    console.error('Parsing error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
