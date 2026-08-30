/**
 * Track decryption. As of gerdur-core@1.0.2 the core `decryptDownload` is a
 * correct, dependency-free Blowfish that works on every Node (it no longer
 * touches OpenSSL's removed `bf-cbc`), at ~290 MiB/s — so there is nothing left
 * to wrap or fall back to here.
 */
import {readFileSync} from 'fs';
import {decryptDownload} from 'gerdur-core';

export {decryptDownload, TrackDecryptStream} from 'gerdur-core';

/** Decrypt a track that was streamed to a temp file. */
export const decryptDownloadFile = (tmpfile: string, trackId: string): Buffer =>
  decryptDownload(readFileSync(tmpfile), trackId);
