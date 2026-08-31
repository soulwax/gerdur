# Changelog

## 2.5.0 - 2026-08-31

### Changed

- **`gerdur-core@^2.5.0`.** Track decryption in the download pipeline is now
  **streamed** to a temp file (`decryptFileToFile`) instead of read fully into
  memory twice — peak memory during decrypt drops to ~one 2048-byte stripe.
- Gateway failures now surface as `DeezerError` (re-exported) with `code` /
  `keys` / `retryable`, and gateway retries are bounded (no more infinite spin
  on a persistently failing endpoint).

### Added

- Re-exports: `streamTrackDownload`, `createDecryptStream`, `getStream`,
  `DeezerError` + the `StreamTrackOptions` / `TrackStream` / `StreamResponse` types.
- **`Session.streamTrack(track, quality?, options?)`** — download a track as a
  constant-memory stream of decrypted audio (`{stream, size, startedAt}`),
  with `onProgress` and `resumeFrom`.

## 2.4.0 - 2026-08-31

### Added

- **`gerdur-core@^2.3.0`** — re-exports `getTrackPreview`, `downloadPreview`,
  `formatName`, `toFormat`, `DEEZER_FORMATS` and the `DeezerFormat` /
  `TrackPreview` types.
- **`--preview`** — download the 30-second clip for each track as
  `<name>.preview.mp3` instead of the full file. Plain licence-free MP3s: no
  `--quality`, no decryption, no tagging. Works with every source and headless.
- **`Session.trackPreview(track)`** and **`Session.downloadPreview(track)`**.

## 2.3.0 - 2026-08-31

### Added

- **`gerdur-core@^2.2.0`** — the browse / discovery surface is re-exported:
  `getGenres`, `getChart`, `getChartTracks`, `getGenreArtists`,
  `getEditorialList` / `getEditorialReleases` / `getEditorialSelection` /
  `getEditorialCharts`, `getArtistTopTracks`, `getRelatedArtists`,
  `getArtistAlbums`, `getArtistPlaylists`, `getArtistRadioTracks`,
  `getTrackByISRC`, `getAlbumByUPC`, plus their types.
- **`Session` browse methods**: `genres`, `chart`, `chartTracks`,
  `editorialSections`, `artistTopTracks`, `relatedArtists`, `artistAlbums`,
  `artistRadio`, `trackByISRC`, `albumByUPC`.
- **CLI `isrc:` / `upc:` prefixes** — `gerdur -u isrc:GBDUW0000059` downloads the
  exact track for an ISRC; `gerdur -u upc:0724384960650` downloads the album for
  a barcode. Both work in `--headless` mode and from the interactive prompt.

## 2.2.0 - 2026-08-31

### Added

- **CLI search.** New flags — `--search`, `--artist`, `--album`, `--track`,
  `--label`, `--bpm-min` / `--bpm-max`, `--dur-min` / `--dur-max`,
  `--search-limit` — are composed into a Deezer advanced-search query. The
  matches are listed and you tick which to download; `--headless` grabs every
  match up to `--search-limit`. Hits are resolved to full tracks before
  downloading, so quality fallback / tagging / `.lrc` sidecars all work.
- **`search:` prefix** at the interactive prompt (and `-u 'search:…'`) runs the
  same advanced track search, e.g. `search:artist:"daft punk" bpm_min:120`.
- When Deezer's advanced operators return nothing (they are unreliable), the CLI
  automatically retries the same words as a plain free-text query.

### Changed

- **`Session.searchAdvanced`** now falls back to a plain free-text query when the
  advanced operators match nothing (opt out with `{fallback: false}`), and
  accepts `fallback` in its options.
- The interactive prompt now reads "Enter a URL, a search term, or
  `search:<advanced query>`".
- Search / filter helpers extracted to `src/lib/search.ts`
  (`advancedFiltersFromFlags`, `searchAdvancedTracks`, `plainTextQuery`).

## 2.1.0 - 2026-08-31

### Added

- **`gerdur-core@^2.1.0`** — the new search surface is re-exported from the
  library: `searchPublicApi`, `searchTracks` / `searchAlbums` / `searchArtists` /
  `searchPlaylists`, `buildAdvancedQuery`, `suggest`, plus the matching types.
- **`Session.searchAdvanced(filters, options?)`** — structured search against the
  public REST API — a free-text query plus `{artist, album, track, label, durMin,
  durMax, bpmMin, bpmMax}`, with `order` / `limit` / `index`. Returns public-API
  track objects with `isrc` / `preview`; fetch a hit's gw track with
  `getTrackInfo(id)` to download.
- **`Session.suggest(query, nb?)`** — `deezer.suggest` autocomplete.

_No CLI changes in this release — the interactive `gerdur` flow is unchanged._

## 2.0.0 - 2026-08-31

### Changed

- **Metadata is now much richer** (`gerdur-core@^2.0.0`). Every downloaded file
  gets ReplayGain (`REPLAYGAIN_TRACK_GAIN`), BPM, real `©`/`℗` lines, the true
  original release date (distinct from a reissue date), full studio credits
  (featured artists, mastering / mixing / recording engineers, producers),
  compilation/live flags, iTunes advisory, Deezer ids, and the artist photo as a
  second embedded image. Album/playlist tracks are hydrated with one coalesced
  `song.getData` so the credits are complete.
- **`.lrc` sidecar files** are written next to the audio for tracks with
  time-synced lyrics. Toggle with `"lyrics": {"lrcFile": false}` in
  `gerdur.config.json`.
- Cover-art requests are capped at Deezer's real ceiling of 1800 px.

### Breaking (programmatic API)

- `gerdur-core.addTrackTags` changed signature/return — see its 2.0.0 changelog.
  `getTrackBuffer` is unaffected (still resolves to `Buffer | null`); new
  `getTaggedTrack(track, quality, options)` returns `{buffer, model}` with the
  structured metadata and LRC. `downloadTrackToFile` now also returns `lrcPath`
  when a sidecar was written.

## 1.0.1 - 2026-08-30

### Changed

- Decryption now relies entirely on `gerdur-core@^1.0.3` (correct on every Node, ~290 MiB/s). Removed the `egoroof-blowfish` dependency and the OpenSSL-3 fallback dance.
- Removed the `worker_threads` decrypt pool — with a fast native-speed decrypt it only added thread-spawn latency. `decryptDownloadFile` is now a thin sync wrapper.

## 1.0.0 - 2026-08-30

Initial public release.

- CLI for downloading tracks, albums, artists and playlists from Deezer, with Spotify and Tidal links resolved via ISRC / UPC matching.
- Quality selection: MP3 128, MP3 320, FLAC. Automatic MP3 / FLAC tagging with cover art and lyrics.
- Side-effect-free programmatic API (`createSession`, `getTrackBuffer`, `downloadTrackToFile`, re-exported `gerdur-core` query functions).
- `gerdur.config.json` (project-local or `~/.config/gerdur/`), `GERDUR_ARL` / `GERDUR_EMAIL` / `GERDUR_PASSWORD` env vars, guided first-run arl setup.
