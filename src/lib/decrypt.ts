/**
 * Track decryption. As of gerdur-core@1.0.2 the core `decryptDownload` is a
 * correct, dependency-free Blowfish that works on every Node (it no longer
 * touches OpenSSL's removed `bf-cbc`), at ~290 MiB/s — so there is nothing left
 * to wrap or fall back to here.
 */
import stream from 'stream';
import {promisify} from 'util';
import {createReadStream, createWriteStream, readFileSync} from 'fs';
import {createDecryptStream, decryptDownload} from 'gerdur-core';

export {decryptDownload, createDecryptStream, TrackDecryptStream} from 'gerdur-core';

const pipeline = promisify(stream.pipeline);

/** Decrypt a track that was streamed to a temp file (buffered — reads the file into memory). */
export const decryptDownloadFile = (tmpfile: string, trackId: string): Buffer =>
  decryptDownload(readFileSync(tmpfile), trackId);

/**
 * Decrypt `src` → `dest` as a stream — peak memory is ~one 2048-byte stripe,
 * not the whole file twice. Use this over `decryptDownloadFile` for large FLACs.
 */
export const decryptFileToFile = (src: string, dest: string, trackId: string): Promise<void> =>
  pipeline(createReadStream(src), createDecryptStream(trackId), createWriteStream(dest));
