"use client";

import { useState } from "react";

interface Track {
  id: string | number;
  uri: string;
  name?: string;
  resolution?: string;
  bandwidth?: number;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state for configuration view
  const [configView, setConfigView] = useState(false);
  const [variants, setVariants] = useState<Track[]>([]);
  const [audioTracks, setAudioTracks] = useState<Track[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedAudios, setSelectedAudios] = useState<string[]>([]);
  const [filename, setFilename] = useState("download");
  const [downloading, setDownloading] = useState(false);
  const [downloadResult, setDownloadResult] = useState<string | null>(null);

  const handleIntercept = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setDownloadResult(null);

    try {
      // 1. Intercept to find the main .m3u8
      const interceptRes = await fetch("/api/intercept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const interceptData = await interceptRes.json();

      if (!interceptRes.ok) {
        throw new Error(interceptData.error || "Failed to intercept HLS URL");
      }

      // 2. Parse the manifest to get tracks
      const parseRes = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: interceptData.m3u8Url }),
      });

      const parseData = await parseRes.json();

      if (!parseRes.ok) {
        throw new Error(parseData.error || "Failed to parse manifest");
      }

      setVariants(parseData.variants);
      setAudioTracks(parseData.audioTracks);
      
      // Default selections
      if (parseData.variants.length > 0) {
        setSelectedVariant(parseData.variants[0].uri);
      }
      
      setConfigView(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: selectedVariant,
          audioUrls: selectedAudios,
          filename: filename || "download"
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setDownloadResult(data.path);
      } else {
        setError(data.error || "Download failed");
      }
    } catch (err) {
      setError("Failed to start download");
    } finally {
      setDownloading(false);
    }
  };

  const toggleAudio = (uri: string) => {
    setSelectedAudios(prev => 
      prev.includes(uri) ? prev.filter(a => a !== uri) : [...prev, uri]
    );
  };

  if (configView) {
    return (
      <div className="min-h-screen bg-canvas selection:bg-primary selection:text-on-primary">
        <section className="bg-surface-dark py-12 px-6 sm:px-12 md:px-24">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 border-2 border-primary rotate-45 flex items-center justify-center">
                <div className="w-4 h-4 bg-primary -rotate-45"></div>
              </div>
              <span className="text-on-dark font-bold text-lg tracking-widest uppercase">Stream Configuration</span>
            </div>
            <button 
              onClick={() => setConfigView(false)}
              className="text-on-dark-mute hover:text-primary uppercase text-[10px] font-bold tracking-widest transition-colors"
            >
              ← Back to Intercept
            </button>
          </div>
        </section>

        <section className="bg-canvas py-16 px-6 sm:px-12 md:px-24">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
              
              {/* Video Tracks */}
              <div className="space-y-8">
                <h2 className="heading-lg uppercase border-l-4 border-primary pl-6">Video Quality</h2>
                <div className="flex flex-col gap-4">
                  {variants.map((v) => (
                    <button 
                      key={v.id}
                      onClick={() => setSelectedVariant(v.uri)}
                      className={`p-6 border-2 text-left transition-all ${
                        selectedVariant === v.uri ? "border-primary bg-surface-soft shadow-[inset_0_0_0_1px_#ffed00]" : "border-hairline hover:border-hairline-strong bg-canvas"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm uppercase tracking-tight">{v.resolution}</span>
                          <span className="text-[10px] text-mute uppercase">{(v.bandwidth! / 1000000).toFixed(1)} Mbps</span>
                        </div>
                        {selectedVariant === v.uri && (
                          <span className="bg-primary text-on-primary text-[8px] font-bold px-2 py-1 uppercase tracking-tighter">Selected</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Tracks */}
              <div className="space-y-8">
                <h2 className="heading-lg uppercase border-l-4 border-ink pl-6">Audio Tracks</h2>
                {audioTracks.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {audioTracks.map((a) => (
                      <button 
                        key={a.id}
                        onClick={() => a.uri && toggleAudio(a.uri)}
                        disabled={!a.uri}
                        className={`p-6 border-2 text-left transition-all ${
                          !a.uri ? 'opacity-50 cursor-not-allowed bg-surface-soft' :
                          selectedAudios.includes(a.uri) ? "border-ink bg-surface-soft shadow-[inset_0_0_0_1px_#000]" : "border-hairline hover:border-hairline-strong bg-canvas"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm uppercase tracking-tight">{a.name}</span>
                          {a.uri && selectedAudios.includes(a.uri) && (
                            <span className="bg-ink text-on-dark text-[8px] font-bold px-2 py-1 uppercase tracking-tighter">Enabled</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 border-2 border-hairline border-dashed flex flex-col items-center justify-center text-center gap-2">
                    <p className="text-mute text-[10px] font-bold uppercase tracking-widest">No separate audio</p>
                    <p className="text-[8px] text-ash uppercase">Audio is already embedded in video variant</p>
                  </div>
                )}
              </div>


              {/* Finalize & Download */}
              <div className="space-y-8 lg:bg-surface-soft lg:p-10">
                <h2 className="heading-lg uppercase border-l-4 border-primary pl-6">Finalize</h2>
                
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-mute">Output Filename</label>
                    <input
                      type="text"
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      className="text-input w-full uppercase"
                      placeholder="FILENAME..."
                    />
                  </div>

                  <div className="p-6 bg-canvas border border-hairline space-y-4">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-mute">
                      <span>Format</span>
                      <span className="text-ink">MP4 (MPEG-4)</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-mute">
                      <span>Processing</span>
                      <span className="text-ink">FFMPEG COPY</span>
                    </div>
                  </div>

                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="button-primary w-full"
                  >
                    {downloading ? "Starting Download..." : "Start Download"}
                  </button>

                  {downloadResult && (
                    <div className="p-4 bg-success/10 border-l-4 border-success text-ink text-[10px] font-bold uppercase tracking-widest">
                      Download triggered. Saving to: <br />
                      <span className="text-[8px] font-mono break-all">{downloadResult}</span>
                    </div>
                  )}

                  {error && (
                    <div className="p-4 bg-error/10 border-l-4 border-error text-error text-[10px] font-bold uppercase">
                      {error}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>
        
        <footer className="bg-surface-dark py-12 px-6 sm:px-12 md:px-24 border-t border-divider-dark mt-auto">
          <div className="max-w-7xl mx-auto text-center">
            <span className="text-[10px] font-bold text-on-dark-mute uppercase tracking-widest">
              Renault Digital HLS Tools - Session Configurator
            </span>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas selection:bg-primary selection:text-on-primary flex flex-col">
      {/* Header Band - Black storytelling mode */}
      <section className="bg-surface-dark py-20 px-6 sm:px-12 md:px-24">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border-2 border-primary rotate-45 flex items-center justify-center">
              <div className="w-6 h-6 bg-primary -rotate-45"></div>
            </div>
            <span className="text-on-dark font-bold text-xl tracking-widest uppercase">HLS Downloader</span>
          </div>
          
          <div className="flex flex-col gap-4">
            <span className="text-primary font-bold text-sm tracking-widest uppercase mb-[-12px]">Revolutionary Streaming</span>
            <h1 className="display-xl text-on-dark max-w-2xl">
              INTERCEPT <br />
              ANY STREAM.
            </h1>
            <p className="text-on-dark-mute text-lg max-w-xl font-normal leading-relaxed">
              Industrial grade HLS extraction tool. Intercept .m3u8 playlists directly from the network layer using automated headless interception.
            </p>
          </div>
        </div>
      </section>

      {/* Main Band - White catalogue mode */}
      <section className="bg-canvas py-20 px-6 sm:px-12 md:px-24 flex-grow">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-12">
              <div className="space-y-6">
                <h2 className="heading-lg uppercase border-l-4 border-primary pl-6">
                  Stream Interception
                </h2>
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-mute">
                      Target URL
                    </label>
                    <input
                      type="url"
                      placeholder="ENTER VIDEO PAGE URL..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="text-input w-full uppercase placeholder:text-ash"
                    />
                  </div>

                  <button
                    onClick={handleIntercept}
                    disabled={loading || !url}
                    className="button-primary w-full"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-4">
                        <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                        INTERCEPTING...
                      </span>
                    ) : "Start Interception"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-6 bg-surface-soft border-l-4 border-error text-ink text-sm font-bold uppercase">
                  Error: {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer Band - Black storytelling mode */}
      <footer className="bg-surface-dark py-12 px-6 sm:px-12 md:px-24 border-t border-divider-dark">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-[10px] font-bold text-on-dark-mute uppercase tracking-widest">
            © 2026 Renault Digital HLS Tools.
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-[10px] font-bold text-on-dark uppercase tracking-widest hover:text-primary transition-colors">Documentation</a>
            <a href="#" className="text-[10px] font-bold text-on-dark uppercase tracking-widest hover:text-primary transition-colors">Legal</a>
            <a href="#" className="text-[10px] font-bold text-on-dark uppercase tracking-widest hover:text-primary transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
