import crypto from 'crypto';
import {closeSync, openSync, readSync, statSync} from 'fs';
import {decryptDownload as decryptDownloadCore} from 'gerdur-core';
import {Blowfish} from 'egoroof-blowfish';

const md5 = (data: string, type: crypto.Encoding = 'ascii') => {
  const md5sum = crypto.createHash('md5');
  md5sum.update(data.toString(), type);
  return md5sum.digest('hex');
};

const getBlowfishKey = (trackId: string) => {
  const SECRET = 'g4el58wc0zvf9na1';
  const idMd5 = md5(trackId);
  let bfKey = '';
  for (let i = 0; i < 16; i++) {
    bfKey += String.fromCharCode(idMd5.charCodeAt(i) ^ idMd5.charCodeAt(i + 16) ^ SECRET.charCodeAt(i));
  }
  return bfKey;
};

const decryptChunkFallback = (chunk: Buffer, blowFishKey: string) => {
  const bf = new Blowfish(blowFishKey, Blowfish.MODE.CBC, Blowfish.PADDING.NULL);
  bf.setIv(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
  return Buffer.from(bf.decode(new Uint8Array(chunk)));
};

const decryptChunkNative = (chunk: Buffer, blowFishKey: string) => {
  const cipher = crypto.createDecipheriv('bf-cbc', blowFishKey, Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(chunk), cipher.final()]);
};

const decryptChunk = (chunk: Buffer, blowFishKey: string) => {
  try {
    return decryptChunkNative(chunk, blowFishKey);
  } catch (err) {
    if (!canFallback(err)) {
      throw err;
    }

    return decryptChunkFallback(chunk, blowFishKey);
  }
};

const decryptDownloadFallback = (source: Buffer, trackId: string) => {
  const chunkSize = 2048;
  const blowFishKey = getBlowfishKey(trackId);
  const destBuffer = Buffer.alloc(source.length);
  let chunkIndex = 0;
  let position = 0;

  while (position < source.length) {
    const currentChunkSize = Math.min(chunkSize, source.length - position);
    const sourceChunk = source.subarray(position, position + currentChunkSize);

    if (chunkIndex % 3 > 0 || currentChunkSize < chunkSize) {
      sourceChunk.copy(destBuffer, position);
    } else {
      decryptChunk(sourceChunk, blowFishKey).copy(destBuffer, position);
    }

    position += currentChunkSize;
    chunkIndex++;
  }

  return destBuffer;
};

const canFallback = (err: unknown) => {
  if (!(err instanceof Error)) {
    return false;
  }

  const code = (err as NodeJS.ErrnoException).code;
  return code === 'ERR_OSSL_EVP_UNSUPPORTED' || err.message.includes('digital envelope routines::unsupported');
};

export const decryptDownload = (source: Buffer, trackId: string) => {
  try {
    return decryptDownloadCore(source, trackId);
  } catch (err) {
    if (!canFallback(err)) {
      throw err;
    }

    return decryptDownloadFallback(source, trackId);
  }
};

export const decryptDownloadFile = (tmpfile: string, trackId: string) => {
  const chunkSize = 2048;
  const blowFishKey = getBlowfishKey(trackId);
  const sourceLength = statSync(tmpfile).size;
  const destBuffer = Buffer.alloc(sourceLength);
  const chunk = Buffer.alloc(chunkSize);
  const fd = openSync(tmpfile, 'r');
  let chunkIndex = 0;
  let position = 0;

  try {
    while (position < sourceLength) {
      const currentChunkSize = Math.min(chunkSize, sourceLength - position);
      const bytesRead = readSync(fd, chunk, 0, currentChunkSize, position);
      const sourceChunk = chunk.subarray(0, bytesRead);

      if (chunkIndex % 3 > 0 || bytesRead < chunkSize) {
        sourceChunk.copy(destBuffer, position);
      } else {
        decryptChunk(sourceChunk, blowFishKey).copy(destBuffer, position);
      }

      position += bytesRead;
      chunkIndex++;
    }
  } finally {
    closeSync(fd);
  }

  return destBuffer;
};
