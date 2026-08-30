# Changelog

## 1.0.0 - 2026-08-30

Initial public release.

- CLI for downloading tracks, albums, artists and playlists from Deezer, with Spotify and Tidal links resolved via ISRC / UPC matching.
- Quality selection: MP3 128, MP3 320, FLAC. Automatic MP3 / FLAC tagging with cover art and lyrics.
- Side-effect-free programmatic API (`createSession`, `getTrackBuffer`, `downloadTrackToFile`, re-exported `gerdur-core` query functions).
- `gerdur.config.json` (project-local or `~/.config/gerdur/`), `GERDUR_ARL` / `GERDUR_EMAIL` / `GERDUR_PASSWORD` env vars, guided first-run arl setup.
