import React, { useState } from 'react';
import { Search, Mic, Moon, Sun, X, AlertCircle, BookOpen } from 'lucide-react';

const App = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [song, setSong] = useState({ title: '', artist: '' });
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const theme = {
    bg: darkMode ? 'bg-[#0B0A0C]' : 'bg-[#FAF9FB]',
    text: darkMode ? 'text-zinc-500' : 'text-stone-600',
    heading: darkMode ? 'text-zinc-100' : 'text-indigo-950',
    border: darkMode ? 'border-zinc-800' : 'border-purple-100',
    card: darkMode ? 'bg-zinc-900/40' : 'bg-white shadow-md shadow-purple-900/5',
    accent: 'purple-700', // Royal Purple
    accentHover: 'purple-600'
  };

  const handleSearch = async (overrideSong = null) => {
    const target = overrideSong || song;
    if (!target.title || !target.artist) return;
    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const res = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(target.artist)}&track_name=${encodeURIComponent(target.title)}`);
      if (!res.ok) {
        const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(target.title + ' ' + target.artist)}`);
        const searchData = await searchRes.json();
        if (searchData && searchData.length > 0) {
          setSuggestion({ title: searchData[0].trackName, artist: searchData[0].artistName });
          throw new Error("Track not found. Did you mean this?");
        }
        throw new Error("LRCLIB couldn't find this song. Check your spelling.");
      }
      const lrc = await res.json();
      const lyrics = lrc.plainLyrics || lrc.syncedLyrics?.replace(/\[.*\]/g, '') || '';
      // const analysis = await fetch('http://127.0.0.1:8000/analyze', {
      const analysis = await fetch(`${process.env.REACT_APP_API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics }),
      });
      setData(await analysis.json());
      if (overrideSong) setSong(overrideSong);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} transition-all duration-700 selection:bg-purple-500/30`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&family=Inter:wght@300;400;500&display=swap');
        .serif { font-family: 'Crimson Pro', serif; }
        .sans { font-family: 'Inter', sans-serif; }
        .syllable-row { display: inline-flex; flex-direction: row; align-items: baseline; gap: 0; }
      `}</style>

      {/* Preface with New Heading */}
      {showIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-500">
          <div className={`${darkMode ? 'bg-[#121114]' : 'bg-white'} max-w-xl w-full p-12 rounded-[2rem] border ${theme.border} shadow-2xl relative`}>
            <button onClick={() => setShowIntro(false)} className="absolute top-8 right-8 opacity-40 hover:opacity-100"><X size={20}/></button>
            <div className="mb-8 text-purple-600"><BookOpen size={32} /></div>
            <h2 className={`text-4xl serif italic mb-2 ${theme.heading}`}>Lyrics Rhymer Analyzer</h2>
            <p className="sans text-[10px] uppercase tracking-[0.3em] mb-8 text-purple-500 font-bold">The Preface</p>
            <div className="space-y-4 serif text-lg leading-relaxed opacity-90">
              <p>This engine is designed to visualize the phonetic geometry of musical lyrics. It retrieves manuscripts from the LRCLIB database and applies complex mathematical phonology to map internal rhymes.</p>
              <p>Note that language is fluid; artists often slant their pronunciations to fit a specific scheme. Because of this, the analysis may not be 100% perfect, as it struggles to account for individual artistic inflection.</p>
            </div>
            <button 
              onClick={() => setShowIntro(false)}
              className="mt-10 w-full py-4 rounded-xl bg-purple-800 hover:bg-purple-700 text-purple-50 sans font-medium transition-all shadow-lg shadow-purple-900/20"
            >
              Begin Analysis
            </button>
          </div>
        </div>
      )}

      {/* Nav with New Icon and Name */}
      <nav className={`h-24 flex items-center px-12 justify-between border-b ${theme.border}`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/10 flex items-center justify-center text-purple-600"><Mic size={20}/></div>
          <span className={`serif text-2xl font-semibold tracking-tighter ${theme.heading}`}>Lyrics Rhymer Analyzer</span>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={() => setShowIntro(true)} className="sans text-[10px] font-bold uppercase tracking-widest hover:text-purple-600 transition-colors">Preface</button>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 opacity-40 hover:opacity-100">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-20">
        {/* Search */}
        <div className="max-w-2xl mx-auto mb-20 text-center">
          <div className={`flex flex-col md:flex-row border ${theme.border} rounded-2xl overflow-hidden ${theme.card}`}>
            <input 
              className={`flex-1 ${theme.bg} p-5 sans outline-none ${theme.heading}`}
              placeholder="Song title..." value={song.title} onChange={e => setSong({...song, title: e.target.value})}
            />
            <input 
              className={`flex-1 ${theme.bg} p-5 sans outline-none border-t md:border-t-0 md:border-l ${theme.border} ${theme.heading}`}
              placeholder="Artist..." value={song.artist} onChange={e => setSong({...song, artist: e.target.value})}
            />
            <button onClick={() => handleSearch()} disabled={loading} className="bg-purple-800 hover:bg-purple-700 text-purple-50 px-10 py-5 transition-colors">
              {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"/> : <Search size={22}/>}
            </button>
          </div>

          {error && (
            <div className="mt-8 animate-in slide-in-from-top-2">
              <div className="flex justify-center items-center gap-2 text-red-500/80 sans text-sm italic">
                <AlertCircle size={14} /> <span>{error}</span>
              </div>
              {suggestion && (
                <button 
                  onClick={() => handleSearch(suggestion)}
                  className="mt-4 px-6 py-2 rounded-full border border-purple-200 text-purple-700 serif text-lg hover:bg-purple-50 transition-all"
                >
                  Did you mean <span className="font-bold italic">{suggestion.title}</span> by <span className="font-bold italic">{suggestion.artist}</span>?
                </button>
              )}
            </div>
          )}
        </div>

        {/* Output */}
        {data ? (
          <div className="animate-in fade-in duration-1000">
            <div className="text-center mb-24">
              <h1 className={`text-6xl serif italic font-light mb-3 ${theme.heading}`}>{song.title}</h1>
              <p className="sans uppercase tracking-[0.5em] text-[10px] opacity-40">{song.artist}</p>
            </div>

            <div className="space-y-6 max-w-2xl mx-auto text-center">
              {data.highlighted_lyrics.map((line, lIdx) => (
                <div key={lIdx} className="flex flex-wrap gap-x-2 gap-y-3 justify-center">
                  {line.map((wordObj, wIdx) => (
                    <div key={wIdx} className="syllable-row">
                      {wordObj.syllable_parts.map((syl, sIdx) => (
                        <span
                          key={sIdx}
                          style={{
                            // Higher opacity and bolder colors in Light Mode for visibility
                            color: syl.color || 'inherit',
                            backgroundColor: syl.color ? (darkMode ? `${syl.color}15` : `${syl.color}25`) : 'transparent',
                            borderBottom: syl.color ? `2px solid ${syl.color}${darkMode ? '40' : '90'}` : 'none',
                            fontWeight: syl.color ? '600' : '400'
                          }}
                          className="serif text-xl px-[1px] transition-all duration-700"
                        >
                          {syl.text}
                        </span>
                      ))}
                      {wordObj.punct && <span className="opacity-30 serif text-xl">{wordObj.punct}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          !loading && (
            <div className="h-64 flex flex-col items-center justify-center opacity-10">
              <Mic size={64} strokeWidth={0.5} className="text-purple-600" />
              <p className="mt-6 serif italic text-xl tracking-[0.2em]">Awaiting the manuscript...</p>
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default App;