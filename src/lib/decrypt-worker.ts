import {parentPort} from 'worker_threads';
import {decryptDownloadFile} from './decrypt';

interface DecryptWorkerRequest {
  id: number;
  tmpfile: string;
  trackId: string;
}

if (!parentPort) {
  throw new Error('decrypt-worker must run inside a worker thread');
}

parentPort.on('message', ({id, tmpfile, trackId}: DecryptWorkerRequest) => {
  try {
    const outFile = decryptDownloadFile(tmpfile, trackId);
    parentPort?.postMessage({id, outFile}, [outFile.buffer]);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    parentPort?.postMessage({id, error: error.message, stack: error.stack});
  }
});
