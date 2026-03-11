import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
from collections import defaultdict
from typing import Dict, List, Any
import pronouncing
from functools import lru_cache
from fastapi.staticfiles import StaticFiles
import os

# Concise logging for tracking analysis flow
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)

app = FastAPI(title="Lyrics Rhymer Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LyricsRequest(BaseModel):
    lyrics: str

class RhymeResponse(BaseModel):
    rhyme_groups: Dict[str, List[str]]
    rhyme_colors: Dict[str, str]
    highlighted_lyrics: List[List[Dict[str, Any]]]

class Song:
    def __init__(self, lyrics: str):
        self.lyrics = lyrics
        self.blacklist = {"a", "the", "an", "and", "or", "of", "to", "in", "it", "is"}
        self.word_to_rhyme_group = {}
        
        # Tokenize preserves original casing for display while lowercasing for analysis
        self.tokenized_lyrics = self.tokenize_lyrics(self.lyrics)
        # Detect rhymes based on phonetic syllable signatures
        self.rhyme_groups = self.detect_rhymes(self.tokenized_lyrics)

    def tokenize_lyrics(self, lyrics: str) -> List[List[Dict[str, str]]]:
        """Splits lyrics into lines and words while preserving punctuation and original casing."""
        lines = lyrics.split('\n')
        tokenized = []
        for line in lines:
            # Matches words and trailing punctuation
            tokens = re.findall(r'\b\w+\b[.,!?;:]*', line)
            line_data = []
            for t in tokens:
                match = re.match(r'(\w+)([.,!?;:]*)', t)
                if match:
                    line_data.append({
                        "original": match.group(1), # For display
                        "clean": match.group(1).lower(), # For analysis
                        "punct": match.group(2)
                    })
            tokenized.append(line_data)
        return tokenized

    @lru_cache(maxsize=10000)
    def get_phonetic_code(self, word: str) -> str:
        """Retrieves ARPAbet phonetic transcription for a word."""
        pron = pronouncing.phones_for_word(word)
        return pron[0] if pron else ''

    def get_syllables(self, word: str) -> List[str]:
        """Groups phonemes into syllables based on vowel stress markers."""
        phonetic = self.get_phonetic_code(word)
        if not phonetic: return []
        syllables, current = [], []
        for p in phonetic.split():
            current.append(p)
            if any(s in p for s in ['0', '1', '2']): # Vowel found
                syllables.append(' '.join(current))
                current = []
        if current: # Attach trailing consonants
            if syllables: syllables[-1] += ' ' + ' '.join(current)
            else: syllables.append(' '.join(current))
        return syllables

    def split_word_by_syllables(self, word: str) -> List[str]:
        """Calculates rough character spans for syllables to colorize the word parts."""
        syl_count = len(self.get_syllables(word.lower()))
        if syl_count <= 1: return [word]
        step = len(word) / syl_count
        return [word[int(i*step):int((i+1)*step) if i<syl_count-1 else len(word)] for i in range(syl_count)]

    def get_rhyme_signature(self, syllable_phonemes: str) -> str:
        """
        Creates a 'Slant Signature'. 
        Matches the primary vowel and maps trailing consonants to 'Families' 
        (e.g., 'M' and 'N' both become 'NASAL') so near-rhymes are captured.
        """
        phonemes = syllable_phonemes.split()
        v_idx = next((i for i, p in enumerate(phonemes) if any(c.isdigit() for c in p)), -1)
        if v_idx == -1: return syllable_phonemes
        
        vowel = phonemes[v_idx]
        coda = phonemes[v_idx + 1:]
        # Mapping phonemes to acoustic families
        mapping = {
            'M':'NAS','N':'NAS','NG':'NAS',
            'S':'SIB','Z':'SIB','SH':'SIB','ZH':'SIB',
            'P':'PLO','B':'PLO','T':'PLO','D':'PLO','K':'PLO','G':'PLO',
            'F':'FRI','V':'FRI','TH':'FRI','DH':'FRI'
        }
        return f"{vowel}-{''.join([mapping.get(p, p) for p in coda])}"

    def detect_rhymes(self, tokenized_lyrics: List[List[Dict[str, str]]]) -> Dict[str, List[tuple]]:
        """Scans all words to group matching syllable signatures."""
        potential = defaultdict(list)
        for line in tokenized_lyrics:
            for token in line:
                word = token["clean"]
                if word in self.blacklist or len(word) <= 1: continue
                for idx, syl in enumerate(self.get_syllables(word)):
                    sig = self.get_rhyme_signature(syl)
                    potential[sig].append((word, idx))
        
        # Filter groups to only include those appearing in multiple words
        filtered = {k: list(set(v)) for k, v in potential.items() if len(set(w for w, _ in v)) >= 2}
        for sig, matches in filtered.items():
            for word, idx in matches:
                self.word_to_rhyme_group[(word, idx)] = sig
        return filtered

    def analyze(self) -> dict:
        """Constructs the final response with majestic colors and preserved casing."""
        # Royal Palette: Deep Purple, Amethyst, Gold, Rose, Seafoam
        palette = ["#8E44AD", "#2E86C1", "#D4AC0D", "#C0392B", "#16A085", "#D35400", "#273746"]
        colors = {sig: palette[i % len(palette)] for i, sig in enumerate(self.rhyme_groups.keys())}
        
        highlighted = []
        for line in self.tokenized_lyrics:
            h_line = []
            for token in line:
                original, clean, punct = token["original"], token["clean"], token["punct"]
                syl_phonemes = self.get_syllables(clean)
                syl_strings = self.split_word_by_syllables(original)
                
                parts = []
                for i in range(len(syl_phonemes)):
                    color = colors.get(self.word_to_rhyme_group.get((clean, i)))
                    parts.append({
                        "text": syl_strings[i] if i < len(syl_strings) else "",
                        "color": color
                    })
                h_line.append({"word": original, "punct": punct, "syllable_parts": parts})
            highlighted.append(h_line)
            
        return {"rhyme_groups": {}, "rhyme_colors": colors, "highlighted_lyrics": highlighted}

@app.post("/analyze", response_model=RhymeResponse)
async def analyze_lyrics(request: LyricsRequest):
    return Song(request.lyrics).analyze()



static_dir = os.path.join(os.path.dirname(__file__), "frontend_dist")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")