import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {homedir} from 'os';
import {dirname, join} from 'path';
import dotProp from 'dot-prop';
import signale from './signale';

/**
 * Default per-user (global) config location, so `gerdur` works from any directory
 * without needing a `gerdur.config.json` in the current folder.
 * Honors `XDG_CONFIG_HOME` on Linux/macOS, otherwise falls back to `~/.config`.
 */
export const globalConfigPath = (): string => {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(base, 'gerdur', 'gerdur.config.json');
};

/**
 * Resolve which config file to use when the user did not pass `--config-file`.
 * Preference order:
 *   1. `gerdur.config.json` in the current directory (project-local, legacy behavior)
 *   2. the global config file (if it already exists)
 *   3. the global config path (created on first write)
 */
export const resolveConfigFile = (configFile: string): string => {
  const isDefaultName = configFile === 'gerdur.config.json';
  if (!isDefaultName) {
    return configFile;
  }
  if (existsSync(configFile)) {
    return configFile;
  }
  const global = globalConfigPath();
  if (existsSync(global)) {
    return global;
  }
  return configFile;
};

type keysType =
  | 'concurrency'
  | 'saveLayout'
  | 'saveLayout.track'
  | 'saveLayout.album'
  | 'saveLayout.artist'
  | 'saveLayout.playlist'
  | 'playlist.resolveFullPath'
  | 'trackNumber'
  | 'fallbackTrack'
  | 'fallbackQuality'
  | 'overwrite'
  | 'coverSize'
  | 'coverSize.128'
  | 'coverSize.320'
  | 'coverSize.flac'
  | 'lyrics.lrcFile'
  | 'cookies.arl'
  | 'cookies.email'
  | 'cookies.password';

type configType = {
  concurrency: number;
  saveLayout: {
    track: string;
    album: string;
    artist: string;
    playlist: string;
  };
  playlist: {
    resolveFullPath: boolean;
  };
  trackNumber: boolean;
  fallbackTrack: boolean;
  fallbackQuality: boolean;
  overwrite: boolean;
  coverSize: {
    '128': number;
    '320': number;
    flac: number;
  };
  lyrics: {
    /** Write a `.lrc` sidecar next to the audio for tracks with time-synced lyrics. */
    lrcFile: boolean;
  };
  cookies: {
    arl: string;
    /** Optional. Plaintext on disk if set — prefer env vars or the prompt. */
    email?: string;
    /** Optional. Plaintext on disk if set — strongly discouraged. */
    password?: string;
  };
};

const old_arl =
  'c911a4ac9f44a52bf23720cc88588557d999b975094068d258e617bf3e9110a2626c2ff7f5d3cb471b435512e0f5a4de4d7d7e3becad4bf80b0a0e230d9001a814124f87833fe772fb6b1327d2be740f65bc5bcfc1de9171926b5ea9aae69db7';

const defaultConfig: configType = {
  concurrency: 4,
  saveLayout: {
    track: 'Music/{ALB_TITLE}/{SNG_TITLE}',
    album: 'Music/{ALB_TITLE}/{SNG_TITLE}',
    artist: 'Music/{ALB_TITLE}/{SNG_TITLE}',
    playlist: 'Playlist/{TITLE}/{SNG_TITLE}',
  },
  playlist: {
    resolveFullPath: false,
  },
  trackNumber: true,
  fallbackTrack: true,
  fallbackQuality: true,
  overwrite: false,
  coverSize: {
    '128': 500,
    '320': 500,
    flac: 1000,
  },
  lyrics: {
    lrcFile: true,
  },
  cookies: {
    arl: 'c973964816688562722418b5200c1515dffaad15a42643ebf87cc72824a54612ec51c2ad42d566743f9e424c774e98ccae7737770acff59251328e6cd598c7bcac38ca269adf78bfb88ec5bbad6cd800db3c0b88b2af645bb22b99e71de26416',
  },
};

class Config {
  public userConfigLocation: string | null;
  private configFile: string;
  private store: configType;

  constructor(configFile = 'gerdur.config.json') {
    this.userConfigLocation = null;
    this.configFile = resolveConfigFile(configFile);
    this.store = this.getConfig(this.configFile);

    // migrate data
    if (this.store.cookies.arl === old_arl) {
      this.set('cookies.arl', defaultConfig.cookies.arl);
    }
  }

  private getConfig(configFile: string): configType {
    if (!existsSync(configFile)) {
      return defaultConfig;
    }

    try {
      const userConfig: configType = JSON.parse(readFileSync(configFile, 'utf-8'));
      if (userConfig.saveLayout) {
        userConfig.saveLayout = {...defaultConfig.saveLayout, ...userConfig.saveLayout};
      }
      if (userConfig.playlist) {
        userConfig.playlist = {...defaultConfig.playlist, ...userConfig.playlist};
      }
      if (userConfig.coverSize) {
        userConfig.coverSize = {...defaultConfig.coverSize, ...userConfig.coverSize};
      }
      if (userConfig.lyrics) {
        userConfig.lyrics = {...defaultConfig.lyrics, ...userConfig.lyrics};
      }
      if (userConfig.cookies) {
        userConfig.cookies = {...defaultConfig.cookies, ...userConfig.cookies};
      }
      this.userConfigLocation = configFile;
      return {...defaultConfig, ...userConfig};
    } catch (err: any) {
      console.error(signale.error(`Unable to parse config: ${configFile}`));
      console.error(signale.note(err.message));
      console.warn(signale.warn('Falling back to default config'));
      return defaultConfig;
    }
  }

  /**
   * Get an item.
   * @param key - The key of the item to get.
   * @param defaultValue - The default value if the item does not exist.
   */
  get(key: keysType, defaultValue?: string | boolean | number) {
    return dotProp.get(this.store, key, defaultValue);
  }

  /**
   * Set an item or multiple items at once.
   * @param {key|object} - You can use [dot-notation](https://github.com/sindresorhus/dot-prop) in a key to access nested properties. Or a hashmap of items to set at once.
   * @param value - Must be JSON serializable. Trying to set the type `undefined`, `function`, or `symbol` will result in a `TypeError`.
   */
  set(key: keysType, value: string | boolean | number, persist = true) {
    dotProp.set(this.store, key, value);
    if (persist) {
      const dir = dirname(this.configFile);
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, {recursive: true});
      }
      writeFileSync(this.configFile, JSON.stringify(this.store, null, 2));
    }
    return this.configFile;
  }

  /**
   * Delete an item.
   * @param key - The key of the item to delete.
   */
  delete(key: keysType) {
    dotProp.delete(this.store, key);
  }

  /**
   * The arl to use for the session. The `GERDUR_ARL` environment variable takes
   * precedence over the stored config so it can be supplied without writing a
   * config file (useful for CI, containers, and quick one-offs).
   */
  getArl(): string {
    const env = (process.env.GERDUR_ARL || '').trim();
    if (env) {
      return env;
    }
    return dotProp.get(this.store, 'cookies.arl', '') as string;
  }

  /**
   * Whether a usable arl cookie has been provided by the user, via the
   * `GERDUR_ARL` environment variable or config. Returns `false` when the arl is
   * empty or still the bundled default (which is shared, rate-limited, and
   * expires) so callers can prompt for one.
   */
  hasUserArl(): boolean {
    const arl = this.getArl();
    return Boolean(arl) && arl !== defaultConfig.cookies.arl && arl !== old_arl;
  }
}

export default Config;
