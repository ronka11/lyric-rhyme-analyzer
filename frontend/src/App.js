import React, { useState } from 'react';
import { Moon, Sun, Music, Sparkles } from 'lucide-react';

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
    
    if (!response.ok) {
      throw new Error('Song not found in LRCLIB database');
    }
    
    const data = await response.json();
    return data.plainLyrics || data.syncedLyrics?.replace(/\[\d+:\d+\.\d+\]/g, '') || '';
  };

  const analyzeLyrics = async (lyrics) => {
    const response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lyrics }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to analyze lyrics');
    }
    
    return await response.json();
  };

  const handleAnalyze = async () => {
    if (!songTitle.trim() || !artistName.trim()) {
      setError('Please enter both song title and artist name');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysisData(null);

    try {
      const lyrics = await fetchLyrics();
      
      if (!lyrics || lyrics.trim().length === 0) {
        throw new Error('No lyrics found for this song');
      }

      const analysis = await analyzeLyrics(lyrics);
      setAnalysisData(analysis);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  const bgColor = darkMode ? 'bg-[#0a0a0a]' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-[#1a1a1a]' : 'bg-white';
  const textColor = darkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-gray-500' : 'text-gray-600';
  const borderColor = darkMode ? 'border-gray-800' : 'border-gray-200';
  const inputBg = darkMode ? 'bg-[#2a2a2a]' : 'bg-gray-100';

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${cardBg} border-b ${borderColor} sticky top-0 z-50 backdrop-blur-lg bg-opacity-95`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Music className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Lyrics Rhyme Analyzer
            </h1>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg ${inputBg} hover:opacity-80 transition-opacity`}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className={`${cardBg} rounded-xl p-6 shadow-2xl mb-8 border ${borderColor}`}>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>
                Song Title
              </label>
              <input
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter song title..."
                className={`w-full px-4 py-3 rounded-lg ${inputBg} ${textColor} border ${borderColor} focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>
                Artist Name
              </label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter artist name..."
                className={`w-full px-4 py-3 rounded-lg ${inputBg} ${textColor} border ${borderColor} focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all`}
              />
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze Lyrics
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4 mb-8">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Results - Only Lyrics */}
        {analysisData && (
          <div className={`${cardBg} rounded-xl p-8 shadow-2xl border ${borderColor}`}>
            <div className="flex items-center gap-2 mb-6">
              <Music className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-bold">Highlighted Lyrics</h2>
            </div>
            <div className="space-y-2">
              {analysisData.highlighted_lyrics.map((line, lineIdx) => (
                <div key={lineIdx} className="flex items-start gap-4 group">
                  <span 
                    className={`${textSecondary} text-xs font-bold min-w-[35px] text-right pt-1.5 transition-colors group-hover:text-purple-400`}
                    style={{
                      fontFamily: 'monospace'
                    }}
                  >
                    {analysisData.rhyme_scheme[lineIdx] || '-'}
                  </span>
                  <div className="flex flex-wrap gap-x-2 flex-1" style={{ lineHeight: '1.8' }}>
                    {line.map((wordObj, wordIdx) => (
                      <span key={wordIdx} style={{ display: 'inline-block' }}>
                        {wordObj.syllable_parts && wordObj.syllable_parts.length > 0 ? (
                          <>
                            {wordObj.syllable_parts.map((syllable, sylIdx) => (
                              <span
                                key={sylIdx}
                                style={{
                                  color: syllable.color ? (darkMode ? '#000000' : '#FFFFFF') : (darkMode ? '#D1D5DB' : '#4B5563'),
                                  fontWeight: syllable.color ? '600' : '400',
                                  fontSize: '1.05rem',
                                  backgroundColor: syllable.color || 'transparent',
                                  padding: syllable.color ? '3px 4px' : '0',
                                  borderRadius: syllable.color ? '3px' : '0',
                                  boxShadow: syllable.color ? `0 0 20px ${syllable.color}80` : 'none',
                                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                  letterSpacing: '0.01em'
                                }}
                              >
                                {syllable.text}
                              </span>
                            ))}
                          </>
                        ) : (
                          <span style={{
                            color: darkMode ? '#D1D5DB' : '#4B5563',
                            fontWeight: '400',
                            fontSize: '1.05rem',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                          }}>
                            {wordObj.word}
                          </span>
                        )}
                        {wordObj.punct && (
                          <span style={{
                            color: darkMode ? '#D1D5DB' : '#4B5563',
                            fontWeight: '400',
                            fontSize: '1.05rem'
                          }}>
                            {wordObj.punct}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Footer */}
        {!analysisData && !loading && (
          <div className={`${cardBg} rounded-xl p-8 shadow-2xl text-center border ${borderColor}`}>
            <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Music className="w-10 h-10 text-white" />
            </div>
            <p className={`${textColor} mb-2 text-lg font-medium`}>
              Enter a song title and artist name to analyze rhyme patterns
            </p>
            <p className={`${textSecondary} text-sm`}>
              Powered by LRCLIB API & Syllable-based Phonetic Analysis
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LyricsAnalyzer;