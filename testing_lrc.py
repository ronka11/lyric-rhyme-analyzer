import requests

def get_lyrics(artist, track):
    url = "https://lrclib.net/api/get"
    
    params = {
        'artist_name': artist,
        'track_name': track
    }
    
    try:
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"--- Lyrics for {data.get('trackName')} by {data.get('artistName')} ---")
            
            lyrics = data.get('plainLyrics')
            
            if lyrics:
                return lyrics
            else:
                return "Lyrics found, but no plain text version available."
        
        elif response.status_code == 404:
            return "Error: Lyrics not found in the database."
        else:
            return f"Error: Received status code {response.status_code}"

    except Exception as e:
        return f"An error occurred: {e}"

def main():
    # artist_input = "martin garrix"
    # track_input = "animals"

    artist_input = "coldplay"
    track_input = "sparks"
    track_input = "such a rush"

    song_lyrics = get_lyrics(artist_input, track_input)
    print(song_lyrics)

if __name__ == "__main__":
    main()