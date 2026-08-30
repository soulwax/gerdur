import dotProp from 'dot-prop';
import chalk from 'chalk';
import path from 'path';

type saveLayoutProps = {
  track: {[key: string]: any};
  album: {[key: string]: any};
  path: string;
  minimumIntegerDigits: number;
  trackNumber: boolean;
};

export const sanitizeFilename = (input: string, replacement = '_'): string => {
  /* eslint-disable-next-line */
  const UNSAFE_CHARS = /[\/\?<>\\:\*\|"]/g;

  if (typeof input !== 'string') {
    return '';
  }

  if (process.platform === 'win32' && input.endsWith('.')) {
    return (input.slice(0, -1) + replacement).replace(UNSAFE_CHARS, replacement).trim();
  }

  return input.replace(UNSAFE_CHARS, replacement).trim();
};

export const formatSecondsReadable = (time: number) => {
  if (time < 60) {
    return time + 's';
  }
  const minutes = time >= 60 ? Math.floor(time / 60) : 0;
  const seconds = Math.floor(time - minutes * 60);
  return `${minutes >= 10 ? minutes : '0' + minutes}m ${seconds >= 10 ? seconds : '0' + seconds}s`;
};

export const saveLayout = ({track, album, path: filePath, minimumIntegerDigits, trackNumber}: saveLayoutProps) => {
  // Clone album info
  const albumInfo = {...album};

  // Use relative path
  if (filePath.startsWith('{')) {
    filePath = './' + filePath;
  }

  // Transform values
  /* eslint-disable-next-line */
  const file = filePath.match(/(?<=\{)[^\}]*/g);
  if (file) {
    if (
      track.DISK_NUMBER &&
      album.NUMBER_DISK &&
      album.ALB_TITLE &&
      Number(album.NUMBER_DISK) > 1 &&
      !album.ALB_TITLE.includes('Disc')
    ) {
      albumInfo.ALB_TITLE += ` (Disc ${Number(track.DISK_NUMBER).toLocaleString('en-US', {minimumIntegerDigits: 2})})`;
    }

    for (const key of file) {
      const value_album: string | undefined = dotProp.get(albumInfo, key);
      const value_track: string | undefined = value_album || dotProp.get(track, key);
      if (key === 'TRACK_NUMBER' || key === 'TRACK_POSITION' || key === 'NO_TRACK_NUMBER') {
        filePath = filePath.replace(
          `{${key}}`,
          value_track ? Number(value_track).toLocaleString('en-US', {minimumIntegerDigits}) : '',
        );
        trackNumber = false;
      } else {
        filePath = filePath.replace(`{${key}}`, value_track ? sanitizeFilename(value_track) : '');
      }
    }
  }

  if (trackNumber && (track.TRACK_NUMBER || track.TRACK_POSITION)) {
    const [dir, base] = [path.posix.dirname(filePath), path.posix.basename(filePath)];
    const position = track.TRACK_POSITION ? track.TRACK_POSITION : Number(track.TRACK_NUMBER);
    filePath = path.posix.join(dir, position.toLocaleString('en-US', {minimumIntegerDigits}) + ' - ' + base);
  } else {
    filePath = path.posix.join(filePath);
  }

  return filePath.replace(/[?%*|"<>]/g, '').trim();
};

export const progressBar = (total: number, width: number) => {
  const incomplete = Array(width).fill('█').join('');
  const complete = Array(width).fill('█').join('');
  const unit = total / width;

  // Force color output for consistent behavior across TTY/non-TTY environments
  const colorChalk = new chalk.Instance({level: 1});

  return (value: number) => {
    let chars = unit === 0 ? width : Math.floor(value / unit);
    if (value >= total) {
      chars = complete.length;
    }
    return colorChalk.cyanBright(complete.slice(0, chars)) + colorChalk.gray(incomplete.slice(chars));
  };
};

export const commonPath = (paths: string[]) => {
  const A = paths.concat().sort(),
    a1 = A[0],
    a2 = A[A.length - 1],
    L = a1.length;

  let i = 0;
  while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
};
