"""Read public playlist membership without downloading media."""
import json
from pathlib import Path
import yt_dlp
root = Path(__file__).resolve().parent.parent
playlists = json.loads((root / 'src/data/youtube-playlists.json').read_text(encoding='utf-8'))
memberships = []
with yt_dlp.YoutubeDL({'skip_download': True, 'extract_flat': True, 'quiet': True, 'socket_timeout': 20, 'retries': 2}) as client:
    for kind, playlist_id in playlists.items():
        print(f'Fetching {kind} playlist...', flush=True)
        playlist = client.extract_info(f'https://www.youtube.com/playlist?list={playlist_id}', download=False)
        for entry in playlist['entries']:
            item = {'kind': kind, 'id': entry['id']}
            if item not in memberships:
                memberships.append(item)
(root / '.tools/playlist-memberships.json').write_text(json.dumps(memberships), encoding='utf-8')
