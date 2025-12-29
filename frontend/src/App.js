import React, { useState } from 'react';
import { Search, Sparkles, AlertCircle, X, Moon, Sun } from 'lucide-react';

const LyricsAnalyzer = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysisData, setAnalysisData] = useState(null);

  const API_URL = 'http://127.0.0.1:8000';

  const fetchLyrics = async () => {
    const response = await fetch(
      `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(songTitle)}`
    );
    if (!response.ok) throw new Error('Track not found in database');
    const data = await response.json();
    return data.plainLyrics || data.syncedLyrics?.replace(/\[\d+:\d+\.\d+\]/g, '') || '';
  };

  const analyzeLyrics = async (lyrics) => {
    const response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyrics }),
    });
    if (!response.ok) throw new Error('Analysis service unavailable');
    return await response.json();
  };

  const handleAnalyze = async () => {
    if (!songTitle.trim() || !artistName.trim()) {
      setError('Enter both fields to begin');
      return;
    }
    setLoading(true);
    setError('');
    setAnalysisData(null);
    try {
      const lyrics = await fetchLyrics();
      const analysis = await analyzeLyrics(lyrics);
      setAnalysisData(analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleAnalyze(); };

  // --- Theme Configuration ---
  const theme = {
    bg: darkMode ? 'bg-[#09090B]' : 'bg-[#FAFAFA]',
    text: darkMode ? 'text-zinc-400' : 'text-zinc-600',
    heading: darkMode ? 'text-zinc-100' : 'text-zinc-900',
    border: darkMode ? 'border-zinc-800' : 'border-zinc-200',
    card: darkMode ? 'bg-zinc-900/40' : 'bg-white',
    input: darkMode ? 'bg-zinc-900/60' : 'bg-white',
    scheme: darkMode ? 'text-zinc-600' : 'text-zinc-400',
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} transition-colors duration-500`}>
      {/* Premium Typography: Geist Sans & Geist Mono */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap');
        body { font-family: 'Geist', sans-serif; letter-spacing: -0.01em; }
        .mono { font-family: 'Geist Mono', monospace; }
      `}</style>

      {/* Nav */}
      <nav className={`border-b ${theme.border} sticky top-0 z-50 backdrop-blur-xl transition-colors`}>
        <div className="max-w-5xl mx-auto px-8 h-14 flex items-center justify-between">
          <span className={`text-[11px] mono uppercase tracking-[0.2em] font-semibold ${theme.heading}`}>
            Rhyme Engine <span className="text-zinc-500 opacity-50">v2.0</span>
          </span>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'}`}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-8 py-12">
        {/* Input Bar - Focused & Minimal */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className={`flex flex-col sm:flex-row gap-0 border ${theme.border} rounded-xl overflow-hidden shadow-sm transition-all focus-within:ring-1 focus-within:ring-zinc-500`}>
            <input 
              className={`flex-1 ${theme.input} p-4 text-sm outline-none border-b sm:border-b-0 sm:border-r ${theme.border} ${theme.heading}`}
              placeholder="Track Title" 
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <input 
              className={`flex-1 ${theme.input} p-4 text-sm outline-none ${theme.heading}`}
              placeholder="Artist" 
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <button 
              onClick={handleAnalyze}
              disabled={loading}
              className={`px-8 py-4 text-sm font-medium transition-all ${darkMode ? 'bg-zinc-100 text-zinc-900 hover:bg-white' : 'bg-zinc-900 text-white hover:bg-black'} disabled:opacity-50`}
            >
              {loading ? '...' : 'Analyze'}
            </button>
          </div>
          {error && <p className="mt-4 text-xs text-red-500 text-center mono">{error}</p>}
        </div>

        {/* Results - WIDER WINDOW */}
        {analysisData ? (
          <div className="animate-in fade-in duration-1000">
            <header className="mb-12 border-b border-zinc-800/10 pb-6 flex justify-between items-end">
              <div>
                <h2 className={`text-2xl font-medium ${theme.heading}`}>{songTitle}</h2>
                <p className="text-sm opacity-60">{artistName}</p>
              </div>
              <div className="text-[10px] mono uppercase tracking-widest opacity-40">Phonetic Scheme</div>
            </header>

            <div className="space-y-4">
              {analysisData.highlighted_lyrics.map((line, lineIdx) => (
                <div key={lineIdx} className="flex gap-8 group transition-all">
                  {/* Scheme Indicator */}
                  <div className={`w-6 text-right shrink-0 select-none pt-1`}>
                    <span className={`text-[10px] mono font-bold ${theme.scheme} opacity-40 group-hover:opacity-100 transition-opacity`}>
                      {analysisData.rhyme_scheme[lineIdx] || '·'}
                    </span>
                  </div>

                  {/* Lyrics - SMALLER & CLEANER */}
                  <div className="flex flex-wrap gap-y-2 items-baseline text-[0.92rem] leading-[1.8]">
                    {line.map((wordObj, wordIdx) => (
                      <span key={wordIdx} className="inline-flex mr-[0.4rem] items-baseline">
                        {wordObj.syllable_parts && wordObj.syllable_parts.length > 0 ? (
                          wordObj.syllable_parts.map((syl, sIdx) => (
                            <span
                              key={sIdx}
                              className="transition-colors duration-300"
                              style={{
                                backgroundColor: syl.color || 'transparent',
                                color: syl.color ? '#000' : 'inherit',
                                padding: syl.color ? '1px 3px' : '0',
                                borderRadius: syl.color ? '2px' : '0',
                                fontWeight: syl.color ? '500' : '400',
                                // This ensures 'people' stays 'people' even with different colors
                                marginLeft: '-0.2px', 
                                marginRight: '-0.2px'
                              }}
                            >
                              {syl.text}
                            </span>
                          ))
                        ) : (
                          <span className="opacity-80">{wordObj.word}</span>
                        )}
                        {wordObj.punct && <span className="opacity-40">{wordObj.punct}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !loading && (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/10 rounded-3xl opacity-20">
              <Sparkles size={32} strokeWidth={1} />
              <p className="mt-4 text-xs mono tracking-widest uppercase">Awaiting Input</p>
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default LyricsAnalyzer;