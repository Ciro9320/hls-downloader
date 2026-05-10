import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

export async function POST(request: Request) {
  try {
    const { url: targetUrl } = await request.json();

    if (!targetUrl) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 1. Lancia un browser invisibile
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let m3u8Url: string | null = null;

    // 2. Mettiti in ascolto di TUTTE le richieste di rete PRIMA di caricare la pagina
    page.on('request', (request) => {
      if (m3u8Url) return; // Prendi solo il primo
      const url = request.url();
      if (url.includes('.m3u8') || url.includes('playlist')) {
        console.log('Playlist HLS intercettata:', url);
        m3u8Url = url;
      }
    });

    // 3. Naviga verso l'URL e attendi o il caricamento o l'intercettazione
    try {
      await Promise.race([
        page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 }),
        // Aspetta attivamente una richiesta m3u8 per chiudere prima se trovata
        page.waitForResponse(res => res.url().includes('.m3u8') || res.url().includes('playlist'), { timeout: 15000 }).catch(() => {}),
        // Fallback di sicurezza se la pagina è lenta ma il video parte dopo
        new Promise(resolve => setTimeout(resolve, 15000))
      ]);
    } catch (error) {
      console.log('Navigazione interrotta o timeout, procedo con quello che ho trovato');
    }


    await browser.close();

    if (!m3u8Url) {
      return NextResponse.json({ error: 'No HLS stream found on this page' }, { status: 404 });
    }

    return NextResponse.json({ m3u8Url });
  } catch (error: any) {
    console.error('Interception error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
