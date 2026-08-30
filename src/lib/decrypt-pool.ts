import {cpus} from 'os';
import {join} from 'path';
import {Worker} from 'worker_threads';

interface DecryptJob {
  id: number;
  tmpfile: string;
  trackId: string;
  resolve: (buffer: Buffer) => void;
  reject: (err: Error) => void;
}

interface DecryptWorkerResponse {
  id: number;
  outFile?: Uint8Array;
  error?: string;
  stack?: string;
}

interface WorkerState {
  worker: Worker;
  current?: DecryptJob;
  idleTimer?: NodeJS.Timeout;
}

const idleTimeoutMs = 5000;
const maxWorkers = Math.max(1, Math.min(4, cpus().length));
const workers = new Set<WorkerState>();
const queue: DecryptJob[] = [];
let nextJobId = 0;

const getWorkerOptions = () => {
  if (__filename.endsWith('.ts')) {
    return {
      path: join(__dirname, 'decrypt-worker.ts'),
      execArgv: ['-r', 'ts-node/register'],
    };
  }

  return {
    path: join(__dirname, 'decrypt-worker.js'),
    execArgv: process.execArgv,
  };
};

const toBuffer = (outFile: Uint8Array) => {
  if (Buffer.isBuffer(outFile)) {
    return outFile;
  }

  return Buffer.from(outFile.buffer, outFile.byteOffset, outFile.byteLength);
};

const disposeWorker = (state: WorkerState) => {
  if (state.idleTimer) {
    clearTimeout(state.idleTimer);
  }
  workers.delete(state);
  void state.worker.terminate();
};

const rejectCurrent = (state: WorkerState, err: Error) => {
  if (state.current) {
    state.current.reject(err);
    state.current = undefined;
  }
};

const scheduleIdleShutdown = (state: WorkerState) => {
  if (state.idleTimer) {
    clearTimeout(state.idleTimer);
  }

  state.idleTimer = setTimeout(() => disposeWorker(state), idleTimeoutMs);
};

const createWorker = () => {
  const {path, execArgv} = getWorkerOptions();
  const state: WorkerState = {worker: new Worker(path, {execArgv})};

  state.worker.on('message', ({outFile, error, stack}: DecryptWorkerResponse) => {
    const job = state.current;
    state.current = undefined;

    if (!job) {
      return;
    }

    if (error) {
      const err = new Error(error);
      err.stack = stack;
      job.reject(err);
    } else if (outFile) {
      job.resolve(toBuffer(outFile));
    } else {
      job.reject(new Error('Decrypt worker returned no output'));
    }

    runNextJob();
  });

  state.worker.on('error', (err) => {
    rejectCurrent(state, err);
    workers.delete(state);
    runNextJob();
  });

  state.worker.on('exit', (code) => {
    workers.delete(state);
    if (code !== 0) {
      rejectCurrent(state, new Error(`Decrypt worker exited with code ${code}`));
      runNextJob();
    }
  });

  workers.add(state);
  return state;
};

const getAvailableWorker = () => {
  for (const state of workers) {
    if (!state.current) {
      return state;
    }
  }

  if (workers.size < maxWorkers) {
    return createWorker();
  }
};

function runNextJob() {
  const job = queue.shift();
  if (!job) {
    for (const state of workers) {
      if (!state.current) {
        scheduleIdleShutdown(state);
      }
    }
    return;
  }

  const state = getAvailableWorker();
  if (!state) {
    queue.unshift(job);
    return;
  }

  if (state.idleTimer) {
    clearTimeout(state.idleTimer);
    state.idleTimer = undefined;
  }

  state.current = job;
  state.worker.postMessage({id: job.id, tmpfile: job.tmpfile, trackId: job.trackId});
}

export const decryptDownloadFile = (tmpfile: string, trackId: string) =>
  new Promise<Buffer>((resolve, reject) => {
    queue.push({id: nextJobId++, tmpfile, trackId, resolve, reject});
    runNextJob();
  });
