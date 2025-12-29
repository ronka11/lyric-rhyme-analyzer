from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
from collections import defaultdict
from typing import Dict, List, Optional, Any, Set
import pronouncing
from functools import lru_cache

app = FastAPI(title="Lyrics Rhyme Analyzer API")

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
    rhyme_scheme: List[str]

class Song:
    def __init__(self, lyrics: str):
        self.lyrics = lyrics
        self.lines_with_punctuation = lyrics.split('\n')
        self.tokenized_lyrics = self.tokenize_lyrics(self.lyrics)
        # Minimal blacklist - articles and very common connectors
        self.blacklist = {"a", "the", "an", "and", "or", "of", "to", "in", "it", "is"}
        self.word_to_rhyme_group = {}
        self.rhyme_groups = self.detect_rhymes_syllable_based(self.tokenized_lyrics)

    def tokenize_lyrics(self, lyrics: str) -> List[List[Dict[str, str]]]:
        """Tokenize while preserving punctuation"""
        lines = lyrics.split('\n')
        tokenized = []
        for line in lines:
            # Find all words with optional punctuation
            words_with_punct = re.findall(r'\b\w+\b[.,!?;:]*', line)
            line_tokens = []
            for word_punct in words_with_punct:
                # Separate word from punctuation
                match = re.match(r'(\w+)([.,!?;:]*)', word_punct)
                if match:
                    word = match.group(1).lower()
                    punct = match.group(2)
                    line_tokens.append({"word": word, "punct": punct})
            tokenized.append(line_tokens)
        return tokenized

    @lru_cache(maxsize=10000)
    def get_phonetic_code(self, word: str) -> str:
        """Get pronunciation, with fallback for common suffixes"""
        pronunciations = pronouncing.phones_for_word(word)
        if pronunciations:
            return pronunciations[0]
            
        # Fallback: Try removing common suffixes if word not found
        if word.endswith("s") and len(word) > 3:
            root = word[:-1]
            root_phones = pronouncing.phones_for_word(root)
            if root_phones: return root_phones[0] + " Z" # Approximate plural
            
        if word.endswith("ing") and len(word) > 5:
            root = word[:-3]
            root_phones = pronouncing.phones_for_word(root)
            if root_phones: return root_phones[0] + " IH0 NG"
            
        if word.endswith("ed") and len(word) > 4:
            root = word[:-2]
            root_phones = pronouncing.phones_for_word(root)
            if root_phones: return root_phones[0] + " D"

        return ''

    def get_syllables(self, word: str) -> List[str]:
        """Get individual syllables from a word"""
        phonetic = self.get_phonetic_code(word)
        if not phonetic:
            return []
        
        # Split by stress markers to get syllables
        syllables = []
        current_syllable = []
        
        for phoneme in phonetic.split():
            current_syllable.append(phoneme)
            # If phoneme has stress marker (0, 1, or 2), it's a vowel ending a syllable
            if any(stress in phoneme for stress in ['0', '1', '2']):
                syllables.append(' '.join(current_syllable))
                current_syllable = []
        
        # Add remaining phonemes (coda) to the last syllable
        if current_syllable:
            if syllables:
                syllables[-1] += ' ' + ' '.join(current_syllable)
            else:
                syllables.append(' '.join(current_syllable))
        
        return syllables
    
    def split_word_by_syllables(self, word: str) -> List[str]:
        """Split a word into its syllable strings (visual approximation)"""
        syllables = self.get_syllables(word)
        if not syllables or len(syllables) <= 1:
            return [word]
        
        # Approximate character split based on syllable count
        word_len = len(word)
        num_syllables = len(syllables)
        
        chars_per_syllable = word_len / num_syllables
        
        syllable_strings = []
        start = 0
        for i in range(num_syllables):
            if i == num_syllables - 1:
                # Last syllable gets remaining characters
                syllable_strings.append(word[start:])
            else:
                end = int((i + 1) * chars_per_syllable)
                # Ensure we don't have empty slices if math gets weird on short words
                if end <= start: end = start + 1
                syllable_strings.append(word[start:end])
                start = end
        
        return syllable_strings

    def get_rhyme_signature(self, syllable_phonemes: str) -> str:
        """
        Creates a 'fuzzy' rhyme signature to allow slant rhymes.
        Groups similar sounding consonants together.
        Example: 'IY1 M' (Dream) and 'IY1 N' (Green) -> Both become 'IY1-N' group
        """
        phonemes = syllable_phonemes.split()
        
        # 1. Identify the Vowel (Nucleus)
        vowel_index = -1
        vowel_sound = ""
        for i, p in enumerate(phonemes):
            if any(char.isdigit() for char in p):
                vowel_index = i
                vowel_sound = p # e.g., 'AA1'
                break
        
        if vowel_index == -1:
            return syllable_phonemes # No vowel found, return strictly
            
        # 2. Process the Coda (sound after vowel)
        coda_phonemes = phonemes[vowel_index + 1:]
        
        # 3. Create a simplified Coda signature
        # We map similar sounding consonants to a single representative class
        normalized_coda = []
        for p in coda_phonemes:
            # Nasals (M, N, NG) -> N
            if p in ['M', 'N', 'NG']:
                normalized_coda.append('N')
            # Sibilants (S, Z, SH, ZH) -> S
            elif p in ['S', 'Z', 'SH', 'ZH', 'CH', 'JH']:
                normalized_coda.append('S')
            # Plosives (P, B, T, D, K, G) -> P (Soft rhyme class)
            elif p in ['P', 'B', 'T', 'D', 'K', 'G']:
                normalized_coda.append('P')
            # Fricatives (F, V) -> F
            elif p in ['F', 'V']:
                normalized_coda.append('F')
            # Liquids (L, R) -> L
            elif p in ['L', 'R', 'ER0', 'ER1']:
                normalized_coda.append('L')
            else:
                normalized_coda.append(p)
                
        return f"{vowel_sound}-{''.join(normalized_coda)}"

    def detect_rhymes_syllable_based(self, tokenized_lyrics: List[List[Dict[str, str]]]) -> Dict[str, List[tuple]]:
        """Detect rhymes at syllable level using Slant Rhyme logic"""
        all_words = []
        for line in tokenized_lyrics:
            for token in line:
                word = token["word"]
                if word not in self.blacklist and len(word) > 1:
                    all_words.append(word)
        
        # Find all syllable-level rhymes
        syllable_rhyme_groups = defaultdict(list)
        
        for i, word1 in enumerate(all_words):
            syllables1 = self.get_syllables(word1)
            for syl_idx1, syl1 in enumerate(syllables1):
                # Use the new Slant Rhyme Signature
                rhyme_sig1 = self.get_rhyme_signature(syl1)
                
                # Check against ALL other words
                for j, word2 in enumerate(all_words):
                    if i == j: continue # Skip same instance
                        
                    syllables2 = self.get_syllables(word2)
                    for syl_idx2, syl2 in enumerate(syllables2):
                        rhyme_sig2 = self.get_rhyme_signature(syl2)
                        
                        if rhyme_sig1 == rhyme_sig2:
                            syllable_rhyme_groups[rhyme_sig1].append((word1, syl_idx1))
                            syllable_rhyme_groups[rhyme_sig1].append((word2, syl_idx2))
        
        # Filter groups
        filtered_groups = {}
        for rhyme_part, syllables in syllable_rhyme_groups.items():
            # Remove exact duplicate tuples
            unique_syllables = list(set(syllables))
            
            # Check if multiple unique words exist in this group
            unique_words_in_group = set(word for word, _ in unique_syllables)
            if len(unique_words_in_group) >= 2:
                filtered_groups[rhyme_part] = unique_syllables
        
        # Map each word-syllable pair to its group
        for group_key, syllables in filtered_groups.items():
            for word, syl_idx in syllables:
                self.word_to_rhyme_group[(word, syl_idx)] = group_key
        
        return filtered_groups

    def assign_colors(self, rhyme_groups: Dict[str, List[tuple]]) -> Dict[str, str]:
        # Updated Pastel / Less Neon Palette
        color_palette = [
            "#FCD34D", # Soft Amber
            "#F472B6", # Muted Pink
            "#67E8F9", # Soft Cyan
            "#FB7185", # Soft Rose
            "#86EFAC", # Pastel Green
            "#A78BFA", # Soft Purple
            "#FDA4AF", # Light Pink
            "#5EEAD4", # Teal
            "#FDBA74", # Soft Orange
            "#93C5FD", # Pastel Blue
            "#C4B5FD", # Light Violet
            "#818CF8", # Indigo
            "#34D399", # Emerald
            "#F87171", # Red-Orange
            "#2DD4BF", # Muted Turquoise
            "#E879F9", # Orchid
            "#A3E635", # Lime
            "#38BDF8", # Sky Blue
            "#FB923C", # Orange
            "#E2E8F0", # Slate
        ]

        color_palette = [
            "#FFFF00",  # Yellow
            "#FF1493",  # Deep pink/Magenta
            "#00FFFF",  # Cyan
            "#FF4500",  # Orange red
            "#32CD32",  # Lime green
            "#FF69B4",  # Hot pink
            "#00CED1",  # Dark turquoise
            "#FFD700",  # Gold
            "#BA55D3",  # Medium orchid
            "#00FA9A",  # Medium spring green
            "#FF6347",  # Tomato
            "#1E90FF",  # Dodger blue
            "#FFA500",  # Orange
            "#8A2BE2",  # Blue violet
            "#00FF7F",  # Spring green
            "#DC143C",  # Crimson
            "#20B2AA",  # Light sea green
            "#FF00FF",  # Magenta
            "#7FFF00",  # Chartreuse
            "#00BFFF",  # Deep sky blue
        ]
        
        # Sort groups by frequency (most common rhymes get first colors)
        sorted_groups = sorted(rhyme_groups.keys(), key=lambda k: len(rhyme_groups[k]), reverse=True)
        
        colors = {}
        for idx, group_key in enumerate(sorted_groups):
            colors[group_key] = color_palette[idx % len(color_palette)]
        
        return colors

    def get_rhyme_scheme(self, tokenized_lyrics: List[List[Dict[str, str]]]) -> List[str]:
        """Determine rhyme scheme based on last word of each line"""
        scheme = []
        line_to_letter = {}
        current_letter = ord('A')
        
        for line in tokenized_lyrics:
            if not line:
                scheme.append('')
                continue
            
            # Get last word
            last_token = line[-1]
            last_word = last_token["word"]
            
            if last_word in self.blacklist or len(last_word) <= 1:
                scheme.append('-')
                continue
            
            # Check if any syllable of the last word is in a rhyme group
            syllables = self.get_syllables(last_word)
            found_rhyme = False
            
            # Prioritize the LAST syllable for scheme detection
            for syl_idx in range(len(syllables) - 1, -1, -1):
                if (last_word, syl_idx) in self.word_to_rhyme_group:
                    group_key = self.word_to_rhyme_group[(last_word, syl_idx)]
                    
                    if group_key not in line_to_letter:
                        line_to_letter[group_key] = chr(current_letter)
                        current_letter += 1
                        if current_letter > ord('Z'): current_letter = ord('A') # Reset if Z exceeded
                    
                    scheme.append(line_to_letter[group_key])
                    found_rhyme = True
                    break
            
            if not found_rhyme:
                scheme.append('-')
        
        return scheme

    def analyze(self) -> dict:
        rhyme_colors = self.assign_colors(self.rhyme_groups)
        
        # Highlight lyrics with syllable-level coloring
        highlighted_lyrics = []
        for line_idx, line in enumerate(self.tokenized_lyrics):
            highlighted_line = []
            for word_idx, token in enumerate(line):
                word = token["word"]
                punct = token["punct"]
                
                # Capitalize first word of each line
                display_word = word.capitalize() if word_idx == 0 else word
                
                syllables = self.get_syllables(word)
                syllable_strings = self.split_word_by_syllables(display_word)
                
                # Build syllable-by-syllable color mapping
                syllable_parts = []
                for syl_idx in range(len(syllables)):
                    color = None
                    if (word, syl_idx) in self.word_to_rhyme_group:
                        group_key = self.word_to_rhyme_group[(word, syl_idx)]
                        color = rhyme_colors[group_key]
                    
                    syllable_parts.append({
                        "text": syllable_strings[syl_idx] if syl_idx < len(syllable_strings) else "",
                        "color": color
                    })
                
                highlighted_line.append({
                    "word": display_word,
                    "punct": punct,
                    "syllable_parts": syllable_parts
                })
            
            highlighted_lyrics.append(highlighted_line)
        
        rhyme_scheme = self.get_rhyme_scheme(self.tokenized_lyrics)
        
        # Format rhyme groups for output
        formatted_rhyme_groups = {}
        for group_key, syllables in self.rhyme_groups.items():
            word_list = [f"{word}[{syl_idx}]" for word, syl_idx in syllables]
            formatted_rhyme_groups[group_key] = word_list
        
        return {
            "rhyme_groups": formatted_rhyme_groups,
            "rhyme_colors": rhyme_colors,
            "highlighted_lyrics": highlighted_lyrics,
            "rhyme_scheme": rhyme_scheme
        }

@app.get("/")
async def root():
    return {
        "message": "Lyrics Rhyme Analyzer API",
        "endpoints": {
            "/analyze": "POST - Analyze lyrics for rhymes"
        }
    }

@app.post("/analyze", response_model=RhymeResponse)
async def analyze_lyrics(request: LyricsRequest):
    try:
        if not request.lyrics or len(request.lyrics.strip()) == 0:
            raise HTTPException(status_code=400, detail="Lyrics cannot be empty")
        
        song = Song(request.lyrics)
        result = song.analyze()
        
        return RhymeResponse(**result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing lyrics: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}