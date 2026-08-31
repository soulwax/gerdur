# gerdur

<img src="https://raw.githubusercontent.com/soulwax/gerdur/main/.github/assets/logo.png" alt="gerdur logo" width="200" height="200" style="display: block; margin-left: auto; margin-right: auto;" />

> A component of the darkfloor streaming stack.
> Source: <https://github.com/soulwax/gerdur>

![Screenshot](https://raw.githubusercontent.com/soulwax/gerdur/main/.github/assets/screenshot.png)

**gerdur is a program for downloading music from streaming music services. Remember that the artists and studios put a lot of work into making music — purchase the original music to support them.**

## Why *gerdur*?

**Gerðr** is a jötunn — in the old poems, *the fairest of all beings*, the glow of her arms lighting sea and sky. Freyr sees her from Odin's watchtower, falls ill with longing, and sends his servant Skírnir riding through a wall of fire to win her back. Her name is *garðr*: the enclosure, the walled yard, the tended garden — the same root as English *garden* and *garth*, and the *-grad* of Slavic city-names.

A track behind a service is Gerðr — walled off, worth the crossing. **gerdur** is what rides through the fire and brings it home into your own *garðr*: decrypted, tagged, and yours to keep.

## Features

- *Supports downloading tracks, albums, artists, and playlists*
- *Allows music quality selection (**128 kbps**, **320 kbps** and **FLAC**)*
- *Auto tagging **MP3** & **FLAC** (including album cover and lyrics)*
- *Support downloading from both links and via searching*

## Supported Sites

### *Deezer*, *Spotify* and *Tidal*

- *Tracks*
- *Albums*
- *Audiobook*
- *Playlists*
- *Artists*

> Note that Spotify and Tidal tracks will be sourced from Deezer using ISRC matching and UPC for albums. Also Spotify artist tracks are limited upto 10 items.

## Install

### *Method 1*

First install `nodejs` following [this tutorial](https://nodejs.org/en/download/package-manager/)

Once `nodejs` installation is complete run this command.

    npm i -g gerdur # may require sudo on linux and macOS

or if you are using yarn

    yarn global add gerdur

or pnpm

    pnpm add -g gerdur

Now you can run using command `gerdur` to start.

### First run — getting your `arl`

`gerdur` logs in to Deezer using an `arl` cookie. On the **first interactive run** (just
running `gerdur` with no `--headless`/scripting flags), if you have not configured an `arl`
yet, `gerdur` walks you through it: it prints where to find the cookie and prompts you to
paste it, then saves it for you. It will also offer to re-enter the `arl` if login fails
because the cookie has expired.

To get your `arl` manually:

1. Open [https://www.deezer.com](https://www.deezer.com) in your browser and log in.
2. Open DevTools (`F12`) → **Application** → **Cookies** → `deezer.com`.
3. Copy the value of the `arl` cookie (a long hex string).

You can set or update it any time without the prompt:

    gerdur --set-arl <your_arl>

Or run the guided setup at any time:

    gerdur setup        # same as: gerdur --setup

#### Log in with email & password

`gerdur` can fetch your `arl` automatically from your Deezer email and password, so you
never have to open DevTools. The guided setup offers it as the first option:

    gerdur setup

Only the fetched `arl` is stored; your password is never written to disk unless you
explicitly opt in when prompted. For headless use, supply `GERDUR_EMAIL` and
`GERDUR_PASSWORD` env vars and `gerdur` will log in automatically when no `arl` is set:

    GERDUR_EMAIL=you@example.com GERDUR_PASSWORD=secret gerdur -q 320 -u <url>

> Login uses Deezer's mobile OAuth flow. If it ever fails (bad credentials or a change
> on Deezer's side), `gerdur` falls back to asking you to paste an `arl`.

### Zero-config usage (env var & global config)

`gerdur` works from **any directory** without a per-folder config file:

- Set the `GERDUR_ARL` environment variable and `gerdur` will use it (it takes precedence over
  the config file, and is never written to disk). Handy for CI, containers, and one-offs:

      GERDUR_ARL=<your_arl> gerdur -q 320 -u <url>

- When you save an `arl` (via `setup` or `--set-arl`) and there is no `gerdur.config.json` in
  the current directory, `gerdur` stores it in a **global** location
  (`$XDG_CONFIG_HOME/gerdur/gerdur.config.json`, or `~/.config/gerdur/gerdur.config.json`) so it is
  reused everywhere. A `gerdur.config.json` in the current directory still takes precedence.

> Scripted, headless (`-d`), and non-interactive (piped) runs never prompt — they behave
> exactly as before and simply use the configured `arl` (or `GERDUR_ARL`).

### *Method 2*

Download pre-built binary from [here](https://github.com/soulwax/gerdur/releases) and then double click on Windows to run. For Linux and macOS user, first open your choice of terminal and the execute with `./gerdur`

## CLI Parameters

All options are optional. You can suppress prompts via providing `quality` and `url` if you are using scripts. You can also use config file. Read the docs [here](https://github.com/soulwax/gerdur/blob/main/docs/config.md) for more info.

| Parameter             |      Short      |                                                    Supported values                                                     |                                                                  Description                                                                  |
| :-------------------- | :-------------: | :---------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------: |
| `--quality`           |      `-q`       |                                                      128/320/flac                                                       |                                                     The quality of the files to download                                                      |
| `--output`            |      `-o`       | Output file format according to `saveLayout`. See more [here](https://github.com/soulwax/gerdur/blob/main/docs/config.md) |                                                       The path to download the files to                                                       |
| `--url`               | `-u or nothing` |                                             album/artist/playlist/track url                                             |                                                              Downloads from url                                                               |
| `--input-file`        |      `-i`       |                          Downloads all urls listed in text file. Example: `gerdur -i links.txt`                           |                                                              Downloads from url                                                               |
| `--concurrency`       |  `-c` 1 to 50   |                                               Downloads X songs at a time                                               |                                                                                                                                               |
| `--set-arl`           |      `-a`       |                                                      `arl` string                                                       |                                                                Set arl cookies                                                                |
| `--setup`             |      `-s`       |                                                        *Nothing*                                                        |                                Run guided setup to enter your `arl` cookie. Also available as `gerdur setup`.                                    |
| `--overwrite`         |      `-w`       |                                                        *Nothing*                                                        |                                     Re-download and overwrite existing files (default is to skip them).                                        |
| `--experimental-login`|     *None*      |                                                        *Nothing*                                                        |                  Enable experimental email/password login to fetch an `arl` (often blocked by Deezer; falls back to arl paste).                |
| `--headless`          |      `-d`       |                                                        *Nothing*                                                        | Run in headless mode. You must provide both `--url` and `--quality` if you run in headless mode. This mode is meant for scripting automation. |
| `--resolve-full-path` |     `-rfp`      |                                                        *Nothing*                                                        |                                               Create playlist file with absolute path location                                                |
| `--create-playlist`   |      `-cp`      |                                                        *Nothing*                                                        |                                                    Create playlist for albums and artists                                                     |
| `--config-file`       |     `-conf`     |                               Config location. Example: `gerdur -conf my-gerdur.config.json`                                |                                                    Specify custom location to config file                                                     |
| `--update`            |      `-U`       |                                                        *Nothing*                                                        |                                                       Download new update (binary only)                                                       |
| `--help`              |      `-h`       |                                                        *Nothing*                                                        |                                                              Shows the CLI help                                                               |
| `--search`            |     *None*      |                                                     free-text query                                                     |                                    Search tracks and pick what to download. Combine with the filters below.                                    |
| `--artist`            |     *None*      |                                                      artist name                                                       |                                                  Search filter — restrict results to this artist                                              |
| `--album`             |     *None*      |                                                      album title                                                       |                                                   Search filter — restrict results to this album                                              |
| `--track`             |     *None*      |                                                      track title                                                       |                                                   Search filter — restrict results to this title                                              |
| `--label`             |     *None*      |                                                     record label                                                      |                                                   Search filter — restrict results to this label                                              |
| `--bpm-min` / `--bpm-max` | *None*      |                                                        number                                                          |                                                    Search filter — tempo range (beats per minute)                                            |
| `--dur-min` / `--dur-max` | *None*      |                                                    number (seconds)                                                    |                                                       Search filter — track duration range                                                    |
| `--search-limit`      |     *None*      |                                                   number (default 50)                                                  |                                                       How many search results to fetch                                                        |
| `--preview`           |     *None*      |                                                        *Nothing*                                                        |                            Download the 30-second preview clips (`.preview.mp3`) instead of full tracks — no `--quality` needed                |

## Search

### From the interactive prompt

When `gerdur` asks for a URL, a search term, or a prefixed query:

| Input | Does |
| :--- | :--- |
| `Harder Better Faster Stronger` | plain track search — pick tracks to download |
| `artist:daft punk` | artist search — pick an artist, then its discography |
| `album:discovery` | album search — pick an album |
| `playlist:deep focus` | playlist search — pick a playlist |
| `search:artist:"daft punk" bpm_min:120` | advanced track search (see operators below) |
| `isrc:GBDUW0000059` | download the exact track for an ISRC |
| `upc:0724384960650` | download the album for a UPC / EAN barcode |
| `flow` | pick tracks from your Deezer **Flow** |
| `flow:2064440442` | pick tracks from another user's Flow |
| `radio:38305` | pick tracks from a radio's current playlist |
| `chart` / `chart:132` | pick tracks from this week's chart (optionally a genre) |

`isrc:` / `upc:` / `flow` / `radio:` also work in `--headless` mode (`-u flow`, …).

### From flags (works headless)

The `--search` / `--artist` / `--album` / `--track` / `--label` / `--bpm-min` /
`--bpm-max` / `--dur-min` / `--dur-max` flags are composed into one Deezer
advanced-search query, the matches are listed, and — interactively — you pick
which to download. In `--headless` mode every match (up to `--search-limit`) is
downloaded.

```bash
# interactive: search, then tick the tracks you want
gerdur --artist "Daft Punk" --track "Around the World"

# headless: grab the first 5 matches as FLAC
gerdur -d -q flac --search "get lucky" --artist "Daft Punk" --search-limit 5

# tempo / duration windows
gerdur --artist "Justice" --bpm-min 120 --bpm-max 130 --dur-min 180
```

Search hits are resolved to full tracks (via `getTrackInfo`) before downloading,
so quality fallback, tagging and `.lrc` sidecars all work as normal.

### Advanced query operators

Usable inside `--search`, after `search:`, or via `buildAdvancedQuery` in code.
Deezer applies them as ranking hints (not hard filters), and they bite reliably
only on **track** search:

| Operator | Example |
| :--- | :--- |
| `artist:` | `artist:"daft punk"` |
| `album:` | `album:"discovery"` |
| `track:` | `track:"one more time"` |
| `label:` | `label:"Virgin"` |
| `dur_min:` / `dur_max:` | `dur_min:200` (seconds) |
| `bpm_min:` / `bpm_max:` | `bpm_min:120` |

## Previews

`--preview` writes the 30-second clip for each track as `<name>.preview.mp3`
instead of downloading the full file. The clips are plain, licence-free MP3s —
no `--quality`, no decryption, no tagging. Works with every source (URL, search,
`isrc:` / `upc:`) and in `--headless` mode.

```bash
gerdur --preview -u https://deezer.com/album/302127          # 14 clips
gerdur -d --preview --artist "Justice" --search-limit 10     # audition a search
```

## Programmatic API

When installed as a dependency, `gerdur` exposes a side-effect-free API
(importing it does **not** print the banner or parse CLI args, and nothing logs to the
console — progress is delivered via callbacks). CommonJS and ESM both work.

> **Full reference:** [docs/api.md](https://github.com/soulwax/gerdur/blob/main/docs/api.md) ·
> **Runnable examples:** [examples/](https://github.com/soulwax/gerdur/tree/main/examples)

### High-level: sessions

The quickest path from credentials to files. `createSession` logs in (with an `arl` or
email/password), verifies the session, and returns helpers for querying and downloading:

```ts
import {createSession} from 'gerdur';

const session = await createSession({email: 'you@example.com', password: 'secret'});
// ...or: createSession({arl: '...'})

// Resolve any Deezer / Spotify / Tidal URL and download it:
await session.downloadUrl('https://deezer.com/album/302127', 'flac', {
  output: 'Music/{ALB_TITLE}/{SNG_TITLE}',
  concurrency: 4,
  onProgress: ({index, total, track, result}) =>
    console.log(`${index + 1}/${total} ${track.SNG_TITLE} -> ${result?.path ?? 'unavailable'}`),
});

// Or work with the pieces:
const {tracks} = await session.parseUrl('https://deezer.com/track/3135556');
const found = await session.search('daft punk', ['TRACK'], 10);
const results = await session.downloadTracks(tracks, '320', {output: '{ART_NAME} - {SNG_TITLE}'});

// Structured search against the public REST API (isrc / preview / bpm-aware):
const hits = await session.searchAdvanced(
  {query: 'one more time', artist: 'daft punk', durMin: 200},
  {limit: 25, order: 'RANKING'},
);
const suggestions = await session.suggest('daft'); // autocomplete
```

Session methods:

- **resolve / search** — `parseUrl`, `search`, `searchAdvanced`, `suggest`
- **browse** — `genres`, `chart`, `chartTracks`, `editorialSections`,
  `artistTopTracks`, `relatedArtists`, `artistAlbums`, `artistRadio`,
  `trackByISRC`, `albumByUPC`
- **flow / library** — `flow`, `favoriteTracks`, `favoriteAlbums`,
  `favoriteArtists`, `playlists`, `userRadios`, `radios`, `radioTracks`
  (the `userId` arg defaults to the logged-in user)
- **user / download** — `getUser`, `getTrackBuffer`, `streamTrack`,
  `downloadTrack`, `downloadTracks`, `downloadUrl`, `trackPreview`, `downloadPreview`

Every download call is silent; `downloadTracks` / `downloadUrl` accept
`concurrency` and an `onProgress` callback and return one `{path, written} | null`
per track.

`streamTrack(track, quality?, options?)` returns `{stream, size, startedAt,
isEncrypted}` — decrypted audio at constant memory, with `onProgress(got, total)`
and `resumeFrom` (bytes). Pipe `stream` to a file or your own tag muxer.

`searchAdvanced(filters, options?)` builds a Deezer advanced-search query from
`{query?, artist?, album?, track?, label?, durMin?, durMax?, bpmMin?, bpmMax?}`
and takes `{order?, strict?, limit?, index?, fallback?}`. Deezer's operators are
unreliable, so an empty result is retried as a plain free-text query unless
`fallback: false`. It returns public-API track objects — fetch a hit's gw track
with `getTrackInfo(id)` before downloading it.

```ts
// Browse: this week's electro chart, download the top 5
const {tracks} = await session.chart(106, 5);            // 106 = "Dance" genre
const full = await Promise.all(tracks.data.map((t) => getTrackInfo(String(t.id))));
await session.downloadTracks(full, 'flac');

// Find & grab an exact recording by barcode
const t = await session.trackByISRC('GBDUW0000059');
await session.downloadTrack(await getTrackInfo(String(t.id)), '320');
```

### Low-level: primitives

```ts
import {getArl, initDeezerApi, getTrackInfo, getTrackBuffer, downloadTrackToFile} from 'gerdur';

const arl = await getArl('you@example.com', 'secret'); // throws LoginError on failure
await initDeezerApi(arl);

const track = await getTrackInfo('3135556');

// Get the tagged audio as a Buffer without touching the disk:
const mp3 = await getTrackBuffer(track, '320');

// ...or write it straight to a file:
const {path, written} = (await downloadTrackToFile(track, 'flac', {output: '{ART_NAME} - {SNG_TITLE}'}))!;
```

### Re-exported query functions

So you don't need `gerdur-core` as a second dependency (call after `initDeezerApi`
or `createSession`):

- **Query** — `parseInfo`, `getUser`, `getTrackInfo`, `getAlbumInfo`,
  `getAlbumTracks`, `getPlaylistInfo`, `getPlaylistTracks`, `getArtistInfo`,
  `getDiscography`, `getLyrics`
- **Search** — `searchMusic`, `searchPublicApi`, `searchTracks`, `searchAlbums`,
  `searchArtists`, `searchPlaylists`, `buildAdvancedQuery`, `suggest`
- **Browse** — `getGenres`, `getChart`, `getChartTracks`, `getGenreArtists`,
  `getEditorialList`, `getEditorialReleases`, `getEditorialSelection`,
  `getEditorialCharts`, `getArtistTopTracks`, `getRelatedArtists`,
  `getArtistAlbums`, `getArtistPlaylists`, `getArtistRadioTracks`,
  `getTrackByISRC`, `getAlbumByUPC`
- **Flow / library** — `getUserFlow`, `getUserFavoriteTracks`,
  `getUserFavoriteAlbums`, `getUserFavoriteArtists`, `getUserPlaylists`,
  `getUserRadios`, `getUserChartTracks`, `getRadios`, `getRadioTracks`,
  `getRadioGenres`
- **Download** — `getTrackDownloadUrl`, `resolveDownloadUrls`,
  `streamTrackDownload`, `downloadTrackBuffer`, `createDecryptStream`, `getStream`,
  `getTrackPreview`, `downloadPreview`, `formatName`, `toFormat`, `DEEZER_FORMATS`
- **Errors** — `DeezerError` (`code` / `keys` / `retryable`), `GeoBlocked`
- **Low-level sessions** — `createCoreSession(arl)` / `CoreSession` /
  `defaultSession` from `gerdur-core`: an isolated client (its own `arl`, cache,
  `license_token`) with `getTrackInfo` / `searchMusic` / `getTrackBuffer` / … for
  talking to Deezer directly or from multiple accounts. gerdur's own
  `createSession` / `Session` (above) is the higher-level download orchestrator.

### Auth & config helpers

```ts
import {loginWithEmail, LoginError, Config, globalConfigPath} from 'gerdur';

const result = await loginWithEmail('you@example.com', 'password');
if (result.ok) console.log(result.arl);
else console.error(result.reason, result.message); // 'wrong-credentials' | 'no-arl' | 'network' | 'unknown'

const conf = new Config();      // same config file the CLI uses
conf.set('cookies.arl', result.ok ? result.arl : '');
```

Passwords passed to these functions are used only to authenticate and are never written
to disk or logged; only the resulting `arl` is returned or stored.

### Disclaimer

> I am not responsible in any way for the usage of others.

---

> Made with :heart: by the Bluesix Team. If you want to contribute, please read the [contributing guidelines](.github/CONTRIBUTING.md) first.
