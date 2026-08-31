# Changelog

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
