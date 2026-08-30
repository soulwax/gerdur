# Configuration

The `gerdur.config.json` file is where user data should be saved. The configuration file is not required for most users but sometimes there are advanced users who want to customize the way `gerdur` save files or download items.

You will have to create `gerdur.config.json` in the same directory you execute `gerdur` from. Here is the default. Double quotes are necessary. You can omit some values and `gerdur` will use defaults mentioned below.

You can also use different location for config file using argument `-conf` or `--config-file`. Example --> `gerdur -conf custom-config.json`

### Config file location

When you do not pass `--config-file`, `gerdur` looks for a config in this order:

1. `gerdur.config.json` in the current directory (project-local).
2. A **global** config at `$XDG_CONFIG_HOME/gerdur/gerdur.config.json`, or `~/.config/gerdur/gerdur.config.json` if `XDG_CONFIG_HOME` is not set.

When you set your `arl` (via `gerdur setup` or `gerdur --set-arl`) and there is no project-local config, it is written to the global location so it is reused from any directory.

### `GERDUR_ARL` environment variable

The `GERDUR_ARL` environment variable, if set, is used as the `arl` for the session and **takes precedence** over any config file. It is never written to disk, which makes it convenient for CI, containers, and quick one-offs:

```bash
GERDUR_ARL=your_arl gerdur -q 320 -u https://deezer.com/...
```

### Experimental email/password login

With `--experimental-login`, `gerdur` can attempt to fetch an `arl` from your Deezer credentials. This is **best-effort** — Deezer bot-protects scripted logins, so it often fails and falls back to pasting an `arl`.

- Interactive: run `gerdur setup --experimental-login` and enter your email/password (masked). Only the fetched `arl` is stored; you are asked before any credential is saved.
- Non-interactive: set `GERDUR_EMAIL` and `GERDUR_PASSWORD` and run with `--experimental-login`.
- `cookies.email` / `cookies.password` may be stored in the config file, but they are **plaintext on disk** — prefer env vars or the interactive prompt. These are never added to the default config.

```js
{
  "concurrency": 4,
  "saveLayout": {
    "track": "Music/{ALB_TITLE}/{SNG_TITLE}",
    "album": "Music/{ALB_TITLE}/{SNG_TITLE}",
    "artist": "Music/{ALB_TITLE}/{SNG_TITLE}",
    "playlist": "Playlist/{TITLE}/{SNG_TITLE}"
  },
  "playlist": {
    "resolveFullPath": false
  },
  "trackNumber": true,
  "fallbackTrack": true,
  "fallbackQuality": true,
  "overwrite": false,
  "coverSize": {
    "128": 500,
    "320": 500,
    "flac": 1000
  },
  "cookies": {
    "arl": "xxx..."
  }
}
```

This file will also be auto-generated when you set your arl from command using `gerdur -a your_arl`. It is recommended that you set your arl cookie and keep it updated instead of relying on the default value.

## Config Details

### _concurrency_: number <1-50>

- This sets the concurrent download when downloading albums, artists, and playlists. For example, if you set this to `8` the program will download `8` tracks at once. This boosts download speed on a faster connection but don't set this too high for reliability.

### _saveLayout_

- `.track` save structure for single-track downloads.
- `.album` save structure for album downloads.
- `.artist` save structure for artist downloads.
- `.playlist` save structure for playlist downloads.

You can change save structure from command line as well. For example `gerdur -o "{ART_NAME} - {SNG_TITLE}"`. Available values for track, album, artist, and playlist are:

| Key               |    Description     |             Example Value             |
| :---------------- | :----------------: | :-----------------------------------: |
| `ALB_TITLE`       |    Album Title     |               Discovery               |
| `ART_NAME`        |    Artist Name     |               Daft Punk               |
| `SNG_TITLE`       |    Track Title     |   Harder, Better, Faster, Stronger    |
| `TRACK_NUMBER`    | Force track number | 04 - Harder, Better, Faster, Stronger |
| `NO_TRACK_NUMBER` | Skip track number  |                                       |

There are also additional values available only for the playlist.

| Key     |  Description   | Example Value |
| :------ | :------------: | :-----------: |
| `TITLE` | Playlist Title | wtf playlist  |

You can also find other less recently used values [here](https://github.com/soulwax/gerdur-core/tree/main/src/types)

### _playlist_

- `.resolveFullPath` true | false

If true playlist file `.m3u8` will save files with absolute path. Example:

```bash
/home/user/Playlist/My Playlist/01 - A song.mp3
```

### _trackNumber_: true | false

If true track number will be added to file name like this `01 - Title, 02 - Title` and so on. If false number will be omitted.

### _fallbackTrack_: true | false

Sometimes some songs are deleted and moved. Recommended set to `true` to download if there is fallback track available. This is how deezer app works as well.

### _fallbackQuality_: true | false

Sometimes 320kbps or flac is not available but 128kbps. By default gerdur will download 128kbps format if other formats are not available. Set this to `false` if you want to skip download.

### _overwrite_: true | false

By default `gerdur` skips a track if the destination file already exists. Set this to `true` (or pass `--overwrite`/`-w` on the command line) to re-download and overwrite existing files instead. The command-line flag takes precedence over this config value.

### _coverSize_

Album cover size in number for metadata tagging. Acceptable values are between 50-1800.

- `.128` for 128kbps,
- `.320` for 320kbps,
- `.flac` for flac,
