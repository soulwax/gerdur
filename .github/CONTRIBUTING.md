# Contributing to gerdur

Contributions are welcome. Here's what you need to know.

## Prerequisites

- Node.js >= 18
- Yarn (preferred) or npm
- A Deezer ARL token for integration testing

## Getting Started

```bash
git clone https://github.com/soulwax/gerdur.git
cd gerdur
yarn install
yarn build
```

Copy or create a `gerdur.config.json` with your `cookies.arl` before running the
tool. See the README for the full config schema.

## Development

```bash
yarn dev          # Run via ts-node (no build step)
yarn build        # Compile TypeScript → dist/
yarn lint         # ESLint check
yarn test         # AVA tests (SIMULATE=true, no real network calls)
```

To run a single test file:

```bash
SIMULATE=true npx ava __tests__/lib/util.ts
```

On Windows:

```bash
set SIMULATE=true && npx ava __tests__/lib/util.ts
```

## Making Changes

1. Fork the repo and create a branch off `main`.
2. Make your changes. If you're touching download or decryption logic, add or
   update tests in `__tests__/lib/`.
3. Run `yarn lint && yarn test` — both must pass.
4. Open a pull request with a clear description of what changed and why.

## Project Layout

| Path | Purpose |
|------|---------|
| `src/gerdur.ts` | CLI entry point (Commander.js) |
| `src/lib/download-track.ts` | Core download + decryption orchestration |
| `src/lib/decrypt.ts` | Pure-JS Blowfish decryption |
| `src/lib/config.ts` | Config file management |
| `src/lib/util.ts` | Path template rendering, filename sanitisation |
| `__tests__/lib/` | AVA test suite |

Heavy lifting (API calls, track resolution) lives in the
[`gerdur-core`](https://github.com/soulwax/gerdur-core) package. If a
bug is in there, please open the issue or PR in that repo.

## Commit Style

Prefer clear, imperative commit messages (`Fix ARL expiry handling`) over vague
ones (`update stuff`). No strict convention enforced.

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
