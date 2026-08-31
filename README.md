# gerdur

> Command-line music downloader for Deezer — Spotify and Tidal links resolved via
> ISRC/UPC matching — with automatic MP3/FLAC tagging, synced lyrics, and a
> side-effect-free programmatic API.

[![npm](https://img.shields.io/npm/v/gerdur.svg)](https://www.npmjs.com/package/gerdur)
[![npm downloads](https://img.shields.io/npm/dm/gerdur.svg)](https://www.npmjs.com/package/gerdur)
[![node](https://img.shields.io/node/v/gerdur.svg)](https://www.npmjs.com/package/gerdur)

<img src="https://raw.githubusercontent.com/soulwax/gerdur/main/.github/assets/logo.png" alt="gerdur" width="160" height="160" />

![Screenshot](https://raw.githubusercontent.com/soulwax/gerdur/main/.github/assets/screenshot.png)

> Artists and studios put real work into this music. Use `gerdur` for personal
> and archival copies of things you're entitled to, and **buy the music you
> love** so the people who made it keep making it.

---

## Contents

- [Install](#install)
- [First run — your `arl`](#first-run--your-arl)
- [CLI](#cli)
  - [Common tasks](#common-tasks)
  - [Options](#options)
  - [Sources](#sources)
  - [Search](#search)
  - [Previews](#previews)
  - [Better cover art (`--enrich`)](#better-cover-art---enrich)
  - [Output templates](#output-templates)
  - [Config file](#config-file)
  - [Headless / scripting](#headless--scripting)
- [Programmatic API](#programmatic-api)
  - [High-level: sessions](#high-level-sessions)
  - [Low-level: primitives](#low-level-primitives)
  - [Re-exported query functions](#re-exported-query-functions)
  - [Auth &amp; config helpers](#auth--config-helpers)
  - [Multiple accounts](#multiple-accounts)
- [Supported services](#supported-services)
- [The name](#the-name)
- [Legal](#legal)

---

## Install

**As a global CLI** (needs [Node](https://nodejs.org) 18+):

```bash
npm i -g gerdur        # sudo may be required on Linux/macOS
```

```bash
yarn global add gerdur
```

```bash
pnpm add -g gerdur
```

Run `gerdur` with no arguments for the interactive prompt.

**As a prebuilt binary** — download for your platform from
[Releases](https://github.com/soulwax/gerdur/releases). On Windows double-click;
on Linux/macOS `chmod +x gerdur && ./gerdur`.

**As a library** — `npm i gerdur` and import it. Importing is side-effect-free
(no banner, no arg parsing, nothing logged). See [Programmatic API](#programmatic-api).

## First run — your `arl`

`gerdur` logs in to Deezer with an **`arl` cookie**. On the first interactive run,
if none is configured, it walks you through getting one and saves it.

**Guided setup** (any time):

```bash
gerdur setup           # same as: gerdur --setup
```

**Paste an `arl` directly:**

```bash
gerdur --set-arl <your_arl>
```

To copy it manually: open <https://www.deezer.com> logged in → DevTools (`F12`) →
Application → Cookies → `deezer.com` → copy the `arl` value (192 hex chars).

**Log in with email &amp; password** — the guided setup can fetch the `arl` for you
via Deezer's mobile OAuth flow, so you never open DevTools. Only the resulting
`arl` is stored; your password is never written to disk unless you explicitly opt
in when prompted. Deezer bot-protects scripted logins, so this is best-effort and
falls back to pasting an `arl`.

**Zero-config / CI** — set `GERDUR_ARL` (or `GERDUR_EMAIL` + `GERDUR_PASSWORD`)
and skip the config file entirely. `GERDUR_ARL` takes precedence over the config
file and is never written to disk:

```bash
GERDUR_ARL=<your_arl> gerdur -d -q 320 -u https://deezer.com/album/302127
```

When you save an `arl` and there's no `gerdur.config.json` in the current
directory, it goes to a **global** path
(`$XDG_CONFIG_HOME/gerdur/gerdur.config.json`, or `~/.config/gerdur/…`) and is
reused everywhere.

---

## CLI

### Common tasks

```bash
# Interactive — paste a URL or type a search term, then pick what to download
gerdur

# A single track / album / playlist / artist URL
gerdur -u https://deezer.com/album/302127 -q flac

# A Spotify or Tidal link (matched to Deezer by ISRC / UPC)
gerdur -u https://open.spotify.com/track/0DiWol3AO6WpXZgp0goxAV -q 320

# Many URLs from a file, 8 at a time
gerdur -i links.txt -c 8 -q 320

# Search and pick
gerdur --search "get lucky" --artist "Daft Punk"

# Grab an exact recording by barcode, no prompts
gerdur -d -q flac -u isrc:USUM71311296

# Your Deezer Flow
gerdur -u flow

# 30-second previews instead of full tracks (no arl needed)
gerdur --preview -u https://deezer.com/album/302127
```

### Options

All options are optional; the interactive prompt fills in the rest. Provide
`--quality` **and** `--url` to skip all prompts (see [Headless](#headless--scripting)).

| Option | Short | Values | Description |
| :--- | :--- | :--- | :--- |
| `--quality` | `-q` | `128` \| `320` \| `flac` | Download quality (falls back to a lower tier if unlicensed) |
| `--url` | `-u` | URL or [source](#sources) | What to download (positional also works: `gerdur <url>`) |
| `--output` | `-o` | template | Filename/path template — see [Output templates](#output-templates) |
| `--input-file` | `-i` | path | Download every URL / source listed in a text file (one per line) |
| `--concurrency` | `-c` | `1`–`50` | Parallel downloads for albums / artists / playlists (default 4) |
| `--overwrite` | `-w` | — | Re-download files that already exist (default: skip) |
| `--set-arl` | `-a` | `arl` string | Save your `arl` and exit |
| `--setup` | `-s` | — | Run guided setup (also `gerdur setup`) |
| `--headless` | `-d` | — | Never prompt — requires `--url` and `--quality`. For scripts/CI |
| `--config-file` | `-conf` | path | Use a config file at a custom location |
| `--create-playlist` | `-cp` | — | Also write an `.m3u8` for albums and artists |
| `--resolve-full-path` | `-rfp` | — | Use absolute paths inside generated playlist files |
| `--search` | | free text | Track search; combine with the filters below |
| `--artist` / `--album` / `--track` / `--label` | | text | Search filters |
| `--bpm-min` / `--bpm-max` | | number | Tempo range (BPM) |
| `--dur-min` / `--dur-max` | | seconds | Duration range |
| `--search-limit` | | number | How many results to fetch (default 50) |
| `--preview` | | — | Download 30-second `.preview.mp3` clips — no `--quality`, no `arl` |
| `--enrich` | | — | Embed a higher-res cover from the Cover Art Archive (by ISRC) |
| `--fast` | | — | Skip per-track credits, BPM and the Musixmatch lyrics fallback — **~81% fewer Deezer requests** |
| `--update` | `-U` | — | Self-update (prebuilt binary only) |
| `--help` | `-h` | — | Full help |

### Sources

Anywhere a URL is accepted (`-u`, the interactive prompt, or a line in
`--input-file`) you can also use a prefixed source:

| Input | Downloads |
| :--- | :--- |
| `https://deezer.com/...` | Deezer track / album / audiobook / playlist / artist (incl. `page.link` short links) |
| `https://open.spotify.com/...` · `spotify:...` | Spotify track / album / playlist / artist, matched to Deezer |
| `https://tidal.com/...` | Tidal track / album / playlist / artist, matched to Deezer |
| `https://youtu.be/...` | a single YouTube track, matched to Deezer |
| `Harder Better Faster Stronger` | plain track search — pick what to download |
| `artist:daft punk` | artist search → pick an artist → its discography |
| `album:discovery` | album search → pick an album |
| `playlist:deep focus` | playlist search → pick a playlist |
| `search:artist:"daft punk" bpm_min:120` | [advanced](#search) track search |
| `isrc:USUM71311296` | the exact track for an ISRC |
| `upc:0724384960650` | the album for a UPC / EAN barcode |
| `flow` · `flow:<userId>` | your Deezer Flow, or another user's |
| `radio:<id>` | a radio's current playlist |
| `chart` · `chart:<genreId>` | this week's chart (optionally a genre) |
| `artist-top:<artistId>` | an artist's most popular tracks |
| `mix:<trackId>` | a "more like this" mix seeded from a track |
| `library` · `favorites` | your own loved tracks (private library) |
| `episode:<episodeId>` | a single podcast episode (plain MP3, saved to `Podcasts/`) |

All of these work in `--headless` mode too (`gerdur -d -q 320 -u flow`).

### Search

**From flags** (works headless) — `--search` / `--artist` / `--album` /
`--track` / `--label` / `--bpm-min` / `--bpm-max` / `--dur-min` / `--dur-max`
are composed into one Deezer advanced-search query. Interactively you tick which
matches to download; headless grabs every match up to `--search-limit`.

```bash
gerdur --artist "Daft Punk" --track "Around the World"            # interactive
gerdur -d -q flac --search "get lucky" --artist "Daft Punk" --search-limit 5
gerdur --artist "Justice" --bpm-min 120 --bpm-max 130 --dur-min 180
```

**From the prompt** — type `search:<query>` for the same advanced search, or a
plain phrase for a normal one. Matches are resolved to full tracks before
downloading, so quality fallback, tagging and `.lrc` sidecars all work.

**Advanced operators** — usable in `--search`, after `search:`, or via
`buildAdvancedQuery` in code. Deezer treats them as ranking hints (not hard
filters) and honours them reliably only on **track** search; an empty result is
retried as plain text.

| Operator | Example |
| :--- | :--- |
| `artist:` `album:` `track:` `label:` | `artist:"daft punk"` |
| `dur_min:` `dur_max:` | `dur_min:200` (seconds) |
| `bpm_min:` `bpm_max:` | `bpm_min:120` |

### Previews

`--preview` writes the 30-second clip for each track as `<name>.preview.mp3`
instead of the full file — plain, licence-free MP3s: no `--quality`, no
decryption, no tagging. Works with every source and headless.

```bash
gerdur --preview -u https://deezer.com/album/302127          # 14 clips
gerdur -d --preview --artist "Justice" --search-limit 10     # audition a search
```

### Better cover art (`--enrich`)

`--enrich` looks each track's ISRC up on MusicBrainz, walks its release-groups
canonical-first, and embeds the front cover from the
[Cover Art Archive](https://coverartarchive.org) instead of Deezer's (which caps
at 1800 px). No match or the services are down? It silently keeps Deezer's cover.

```bash
gerdur --enrich -q flac -u https://deezer.com/album/302127
```

### Downloading a lot at once (`--fast`)

Tagging, not downloading, is what burns through Deezer's rate limit: a 14-track
album costs about **54 requests to tag** and 2 to fetch. Most of that is per-track
— full credits and BPM (`song.getData` + a public lookup each), plus a Musixmatch
scrape for every track Deezer has no lyrics for, which fails outright on many
networks.

`--fast` skips exactly those. Same audio, same cover, same Deezer lyrics, same
`.lrc` sidecars:

```bash
gerdur --fast -q flac -u https://deezer.com/album/302127
```

| 14-track album | requests | against Deezer's quota |
| :--- | ---: | ---: |
| default | 54 | 36 |
| `--fast` | **7** | **7** |

You lose full studio credits, BPM, and lyrics for tracks Deezer doesn't carry.
Worth it when you're pulling a large library and getting rate-limited; leave it
off for a handful of tracks you care about.

### Output templates

`--output` (or `saveLayout` in the config) is a path template. `{TOKEN}`s are
filled from the track/album; the correct extension is appended.

```bash
gerdur -u <url> -o "Music/{ALB_TITLE}/{TRACK_NUMBER} {SNG_TITLE}"
gerdur -u <url> -o "{ART_NAME} - {SNG_TITLE}"
```

| Token | Example |
| :--- | :--- |
| `{ALB_TITLE}` | `Discovery` |
| `{ART_NAME}` | `Daft Punk` |
| `{SNG_TITLE}` | `Harder, Better, Faster, Stronger` |
| `{TRACK_NUMBER}` | `04 - …` (forces a track-number prefix) |
| `{NO_TRACK_NUMBER}` | drop the track-number prefix |
| `{TITLE}` | playlist title (playlist downloads only) |

Full details, per-type layouts and every config key: **[docs/config.md](https://github.com/soulwax/gerdur/blob/main/docs/config.md)**.

### Config file

`gerdur.config.json` — resolution order: `--config-file` →
`./gerdur.config.json` → global `~/.config/gerdur/gerdur.config.json`.

```jsonc
{
  "concurrency": 4,
  "saveLayout": {
    "track": "Music/{ALB_TITLE}/{SNG_TITLE}",
    "album": "Music/{ALB_TITLE}/{SNG_TITLE}",
    "artist": "Music/{ALB_TITLE}/{SNG_TITLE}",
    "playlist": "Playlist/{TITLE}/{SNG_TITLE}"
  },
  "trackNumber": true,
  "fallbackTrack": true,
  "fallbackQuality": true,
  "overwrite": false,
  "coverSize": {"128": 500, "320": 500, "flac": 1000},
  "cookies": {"arl": "xxx…"}
}
```

### Headless / scripting

Pass `--headless` (`-d`) with `--url` and `--quality` and `gerdur` never prompts —
it uses the configured `arl` (or `GERDUR_ARL`) and downloads. Piped / non-TTY
runs behave the same way.

```bash
GERDUR_ARL=$ARL gerdur -d -q flac -u https://deezer.com/playlist/908622995 \
  -o "Music/{ALB_TITLE}/{TRACK_NUMBER} {SNG_TITLE}" -c 8
```

---

## Programmatic API

`import`/`require` `gerdur` and it stays silent — no banner, no `process.exit`,
no console output; progress arrives through callbacks. CommonJS and ESM both work.

> **Full reference:** [docs/api.md](https://github.com/soulwax/gerdur/blob/main/docs/api.md) ·
> **Runnable examples:** [examples/](https://github.com/soulwax/gerdur/tree/main/examples)

### High-level: sessions

`createSession` logs in (arl or email/password), verifies, and returns query +
download helpers:

```ts
import {createSession} from 'gerdur';

const session = await createSession({email: 'you@example.com', password: 'secret'});
// ...or: await createSession({arl: '…'})

// Resolve any Deezer / Spotify / Tidal URL and download it:
await session.downloadUrl('https://deezer.com/album/302127', 'flac', {
  output: 'Music/{ALB_TITLE}/{SNG_TITLE}',
  concurrency: 4,
  onProgress: ({index, total, track, result}) =>
    console.log(`${index + 1}/${total} ${track.SNG_TITLE} -> ${result?.path ?? 'unavailable'}`),
});

// ...or work with the pieces:
const {tracks, linkinfo} = await session.parseUrl('https://deezer.com/track/3135556');
const results = await session.downloadTracks(tracks, '320', {output: '{ART_NAME} - {SNG_TITLE}'});

// Search:
const hits = await session.search('daft punk', ['TRACK'], 10);
const advanced = await session.searchAdvanced(
  {query: 'one more time', artist: 'daft punk', durMin: 200},
  {limit: 25, order: 'RANKING'},
);
const suggestions = await session.suggest('daf'); // autocomplete

// Get a tagged Buffer without touching disk:
const mp3 = await session.getTrackBuffer(tracks[0], '320');
```

| Group | Methods |
| :--- | :--- |
| resolve / search | `parseUrl`, `search`, `searchAdvanced`, `suggest` |
| browse | `genres`, `chart`, `chartTracks`, `editorialSections`, `artistTopTracks`, `relatedArtists`, `artistAlbums`, `artistRadio`, `trackByISRC`, `albumByUPC` |
| flow / library | `flow`, `favoriteTracks`, `favoriteAlbums`, `favoriteArtists`, `playlists`, `userRadios`, `radios`, `radioTracks` — the `userId` arg defaults to the logged-in user |
| download | `getTrackBuffer`, `streamTrack`, `downloadTrack`, `downloadTracks`, `downloadUrl`, `trackPreview`, `downloadPreview` |
| account | `getUser` |

`downloadTracks` / `downloadUrl` take `concurrency` and `onProgress`, and return
one `{path, written, lrcPath?} | null` per track.

`streamTrack(track, quality?, opts?)` → `{stream, size, startedAt, isEncrypted}` —
decrypted audio at constant memory, with `onProgress(received, total)` and
`resumeFrom` (bytes). Pipe `stream` to a file or your own tag muxer.

`searchAdvanced(filters, opts?)` returns **public-API** track objects — fetch a
hit's gw track with `getTrackInfo(String(hit.id))` before downloading it. Deezer's
operators are unreliable, so an empty result is retried as free text unless you
pass `{fallback: false}`.

### Low-level: primitives

```ts
import {getArl, initDeezerApi, getTrackInfo, getTrackBuffer, downloadTrackToFile} from 'gerdur';

const arl = await getArl('you@example.com', 'secret'); // throws LoginError on failure
await initDeezerApi(arl);

const track = await getTrackInfo('3135556');

const mp3 = await getTrackBuffer(track, '320');            // tagged Buffer, no disk I/O
const {path, written} = (await downloadTrackToFile(track, 'flac', {
  output: '{ART_NAME} - {SNG_TITLE}',
}))!;                                                       // ...or write it
```

`getTaggedTrack(track, quality, opts?)` is like `getTrackBuffer` but returns
`{buffer, model}` — `model.lyricsSynced` is an LRC document for a `.lrc` sidecar.

### Re-exported query functions

So you don't need `gerdur-core` as a second dependency (call after
`initDeezerApi` or `createSession`):

| Group | Functions |
| :--- | :--- |
| query | `parseInfo`, `getUser`, `getTrackInfo`, `getAlbumInfo`, `getAlbumTracks`, `getPlaylistInfo`, `getPlaylistTracks`, `getArtistInfo`, `getDiscography`, `getLyrics` |
| search | `searchMusic`, `searchFacets`, `searchPublicApi`, `searchTracks`, `searchAlbums`, `searchArtists`, `searchPlaylists`, `buildAdvancedQuery`, `suggest` |
| browse | `getGenres`, `getChart`, `getChartTracks`, `getGenreArtists`, `getEditorialList`, `getEditorialReleases`, `getEditorialSelection`, `getEditorialCharts`, `getArtistTopTracks`, `getRelatedArtists`, `getArtistAlbums`, `getArtistPlaylists`, `getArtistRadioTracks`, `getTrackByISRC`, `getAlbumByUPC` |
| flow / library | `getUserFlow`, `getUserFavoriteTracks`, `getUserFavoriteAlbums`, `getUserFavoriteArtists`, `getUserPlaylists`, `getUserRadios`, `getUserChartTracks`, `getRadios`, `getRadioTracks`, `getRadioGenres`, `getEpisode`, `getShowEpisodes` |
| download | `getTrackDownloadUrl`, `resolveDownloadUrls`, `refreshTrackTokens`, `streamTrackDownload`, `downloadTrackBuffer`, `createDecryptStream`, `getStream`, `getTrackPreview`, `downloadPreview`, `formatName`, `toFormat`, `DEEZER_FORMATS` |
| enrichment | `configureMusicBrainz`, `lookupRecordingByISRC`, `getMusicBrainzRecording`, `getMusicBrainzRelease`, `getCoverArt`, `getBestCoverArtUrl`, `getRecordingCoverArt`, `getCoverArtByISRC`, `PoliteJsonClient` |
| tagging | `addTrackTags`, `getRichAlbum`, `normalizeContributors`, `toLrc` |
| errors | `DeezerError` (`code` / `keys` / `retryable`), `GeoBlocked` |

### Auth &amp; config helpers

```ts
import {loginWithEmail, LoginError, Config, globalConfigPath} from 'gerdur';

const result = await loginWithEmail('you@example.com', 'password');
if (result.ok) console.log(result.arl);
else console.error(result.reason, result.message); // 'wrong-credentials' | 'no-arl' | 'network' | 'unknown'

const conf = new Config();          // the same config the CLI uses
conf.set('cookies.arl', 'xxx…');
```

Passwords passed to these functions authenticate only — never written to disk or
logged; only the resulting `arl` is returned or stored.

### Multiple accounts

gerdur's `Session` uses one process-wide login. For **concurrent** accounts, use
`gerdur-core`'s low-level session (re-exported), each fully isolated:

```ts
import {createCoreSession} from 'gerdur';

const a = await createCoreSession(arlOne);
const b = await createCoreSession(arlTwo);
const track = await a.getTrackInfo('3135556');
const audio = await a.getTrackBuffer(track, 9); // resolved + decrypted as account a
```

---

## Supported services

| Service | Track | Album | Playlist | Artist | Notes |
| :--- | :-: | :-: | :-: | :-: | :--- |
| **Deezer** | ✅ | ✅ | ✅ | ✅ | audiobooks and `page.link` short links too |
| **Spotify** | ✅ | ✅ | ✅ | ✅ | matched to Deezer by ISRC / UPC; artist capped at ~10 tracks |
| **Tidal** | ✅ | ✅ | ✅ | ✅ | matched to Deezer by ISRC / UPC |
| **YouTube** | ✅ | | | | single tracks, matched to Deezer |

Quality is `128` / `320` kbps MP3 or FLAC, subject to your Deezer plan and the
track's licensing; `gerdur` falls back to a lower tier (and to a same-artist
alternate track) rather than failing.

The engine — API clients, URL resolution, decryption and tagging — is
[`gerdur-core`](https://www.npmjs.com/package/gerdur-core), published separately.

## The name

**Gerðr** is the jötunn Freyr sends Skírnir riding through a wall of fire to
fetch. Her name is *garðr* — "the enclosure, the walled garden" (English
*garden*, *garth*). A track behind a service is Gerðr; `gerdur` rides through the
fire and brings it home into your own *garðr*: decrypted, tagged, and yours to
keep.

## Legal

For personal and archival use with content you are entitled to access. You are
responsible for complying with the terms of service of any provider and with
copyright law in your jurisdiction. The authors accept no liability for how the
software is used. Buy the music you love.

See [LICENSE](LICENSE) · [Contributing](.github/CONTRIBUTING.md) ·
[Code of Conduct](.github/CODE_OF_CONDUCT.md) ·
[Issues](https://github.com/soulwax/gerdur/issues)
