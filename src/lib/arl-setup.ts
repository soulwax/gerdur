import chalk from 'chalk';
import prompts from 'prompts';
import signale from './signale';
import {loginWithEmail} from './email-login';
import type Config from './config';

/**
 * True when we are attached to an interactive terminal and not running in a
 * scripted / headless context. Only then is it safe to block on a prompt.
 */
export const isInteractive = (headless: boolean): boolean =>
  !headless && Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY);

/**
 * Print short, copy-pasteable instructions on where to obtain a Deezer arl cookie.
 */
export const printArlInstructions = (): void => {
  console.log(signale.info('An ' + chalk.yellow('arl') + ' cookie is required to log in to Deezer.'));
  console.log(signale.note('How to get it:'));
  console.log(signale.note('1. Open ' + chalk.cyan('https://www.deezer.com') + ' in your browser and log in.'));
  console.log(signale.note('2. Open DevTools (F12) → ' + chalk.cyan('Application') + ' → Cookies → deezer.com.'));
  console.log(signale.note('3. Copy the value of the ' + chalk.yellow('arl') + ' cookie (a long hex string).'));
  console.log(signale.note('You can also set it any time with: ' + chalk.cyan('gerdur --set-arl <arl>')));
  console.log(signale.note('Or without a config file: ' + chalk.cyan('GERDUR_ARL=<arl> gerdur ...')));
};

/**
 * Interactively ask the user to paste an arl cookie and persist it to config.
 *
 * Returns the entered arl, or `null` if the user aborted / gave nothing.
 * The caller is responsible for only invoking this in an interactive context.
 */
export const promptForArl = async (conf: Config): Promise<string | null> => {
  const {arl} = await prompts(
    [
      {
        type: 'password',
        name: 'arl',
        message: 'Paste your arl cookie:',
        validate: (value: string) => {
          const v = (value || '').trim();
          if (!v) {
            return 'arl cannot be empty';
          }
          if (!/^[a-f0-9]{16,}$/i.test(v)) {
            return 'That does not look like an arl (expected a long hex string)';
          }
          return true;
        },
      },
    ],
    {
      onCancel: () => {
        console.log(signale.note('Aborted.'));
        process.exit();
      },
    },
  );

  const value = (arl || '').trim();
  if (!value) {
    return null;
  }

  const configPath = conf.set('cookies.arl', value);
  console.log(signale.success('arl saved.'));
  console.log(signale.note(configPath));
  return value;
};

/**
 * Resolve email/password credentials from (in order): explicit config, then the
 * `GERDUR_EMAIL` / `GERDUR_PASSWORD` environment variables. Used for non-interactive
 * login attempts. Returns `null` if either half is missing.
 */
export const resolveCredentials = (conf: Config): {email: string; password: string} | null => {
  const email = ((conf.get('cookies.email') as string) || process.env.GERDUR_EMAIL || '').trim();
  const password = ((conf.get('cookies.password') as string) || process.env.GERDUR_PASSWORD || '').trim();
  if (email && password) {
    return {email, password};
  }
  return null;
};

/**
 * Attempt an email/password login and, on success, persist the fetched arl.
 * The password itself is never written to disk by this function.
 *
 * Returns the arl on success, or `null` on any failure (the caller should fall
 * back to pasting an arl).
 */
export const tryEmailLogin = async (
  conf: Config,
  email: string,
  password: string,
  {persistCredentials = false}: {persistCredentials?: boolean} = {},
): Promise<string | null> => {
  console.log(signale.pending('Logging in as ' + email + '...'));
  const result = await loginWithEmail(email, password);

  if (!result.ok) {
    console.log(signale.warn(result.message));
    return null;
  }

  if (persistCredentials) {
    conf.set('cookies.email', email);
    conf.set('cookies.password', password);
    console.log(
      signale.warn('Email and password saved in plaintext in your config file. Anyone with the file can read them.'),
    );
  }

  const configPath = conf.set('cookies.arl', result.arl);
  console.log(signale.success('Logged in and saved arl.'));
  console.log(signale.note(configPath));
  return result.arl;
};

/**
 * Interactively prompt for email + password (password masked), attempt login,
 * and persist the arl on success. Offers to save the credentials to config
 * (with a plaintext warning) if the login worked.
 *
 * Returns the arl on success, or `null` on failure/cancel so the caller can
 * fall back to pasting an arl.
 */
export const promptForEmailLogin = async (conf: Config): Promise<string | null> => {
  const {email, password} = await prompts(
    [
      {
        type: 'text',
        name: 'email',
        message: 'Deezer email:',
        validate: (v: string) => (v && v.includes('@') ? true : 'Enter a valid email'),
      },
      {
        type: 'password',
        name: 'password',
        message: 'Deezer password:',
        validate: (v: string) => (v ? true : 'Password cannot be empty'),
      },
    ],
    {
      onCancel: () => {
        console.log(signale.note('Aborted.'));
        process.exit();
      },
    },
  );

  if (!email || !password) {
    return null;
  }

  const arl = await tryEmailLogin(conf, email, password);
  if (!arl) {
    return null;
  }

  const {save} = await prompts([
    {
      type: 'confirm',
      name: 'save',
      message: 'Save email & password to config for future logins? (stored in plaintext)',
      initial: false,
    },
  ]);
  if (save) {
    conf.set('cookies.email', email);
    conf.set('cookies.password', password);
    console.log(signale.warn('Saved in plaintext. Delete them from your config to remove.'));
  }

  return arl;
};

/**
 * Interactive picker for how to configure an arl.
 *
 * Offers email/password login (which fetches the arl automatically via Deezer's
 * mobile OAuth flow) and pasting an arl. Email login falls back to arl paste if
 * it fails. The `_experimentalLogin` parameter is retained for backward
 * compatibility and no longer gates the email option.
 *
 * Returns the arl on success or `null` if nothing was configured.
 */
export const chooseAndConfigureArl = async (conf: Config, _experimentalLogin = false): Promise<string | null> => {
  const {method} = await prompts([
    {
      type: 'select',
      name: 'method',
      message: 'How would you like to log in?',
      choices: [
        {title: 'Email & password (fetches your arl automatically)', value: 'email'},
        {title: 'Paste an arl cookie', value: 'arl'},
      ],
      initial: 0,
    },
  ]);

  if (method === 'email') {
    const arl = await promptForEmailLogin(conf);
    if (arl) {
      return arl;
    }
    console.log(signale.note('Falling back to entering an arl manually.'));
  }

  printArlInstructions();
  console.log('');
  return promptForArl(conf);
};

/**
 * Ensure a usable arl is configured before attempting to log in.
 *
 * When no user-supplied arl exists (empty or still the bundled default) and we
 * are in an interactive terminal, print instructions and prompt for one.
 * In non-interactive / headless contexts this is a no-op so existing scripted
 * behavior is preserved.
 *
 * Returns the arl to use for the session.
 */
export const ensureArl = async (conf: Config, headless: boolean, experimentalLogin = false): Promise<string> => {
  if (conf.hasUserArl()) {
    return conf.getArl();
  }

  // Non-interactive: no prompting. If email/password are configured (env/config)
  // but no arl is set yet, attempt a login so scripted/headless runs can work
  // from credentials alone. Otherwise keep the existing (default arl) behavior.
  if (!isInteractive(headless)) {
    const creds = resolveCredentials(conf);
    if (creds) {
      const arl = await tryEmailLogin(conf, creds.email, creds.password);
      if (arl) {
        return arl;
      }
    }
    return conf.getArl();
  }

  console.log(signale.warn('No arl cookie configured yet (using the shared default).'));
  const arl = await chooseAndConfigureArl(conf, experimentalLogin);
  return arl ?? conf.getArl();
};

/**
 * On-demand guided setup, triggered by `gerdur setup` / `--setup`.
 *
 * Always prints instructions and prompts for an arl (even when one is already
 * configured), so users can (re)configure without hunting for the flag.
 * Requires an interactive terminal.
 */
export const runSetup = async (conf: Config, headless: boolean, experimentalLogin = false): Promise<void> => {
  if (!isInteractive(headless)) {
    console.error(signale.error('Setup requires an interactive terminal.'));
    console.error(signale.note('Use ' + chalk.cyan('gerdur --set-arl <arl>') + ' or the GERDUR_ARL env var instead.'));
    process.exit(1);
  }

  console.log(signale.info('gerdur guided setup'));
  if (conf.hasUserArl()) {
    console.log(signale.note('An arl is already configured; continuing will replace it.'));
  }
  await chooseAndConfigureArl(conf, experimentalLogin);
  console.log(signale.success('Setup complete. Run ' + chalk.cyan('gerdur') + ' to start downloading.'));
  process.exit();
};

/**
 * Handle a failed login by offering to enter a fresh arl and retrying.
 *
 * Returns the new arl if the user provided one, otherwise `null` (and the
 * original error should be surfaced by the caller).
 */
export const recoverFromLoginFailure = async (
  conf: Config,
  headless: boolean,
  err: Error,
  experimentalLogin = false,
): Promise<string | null> => {
  if (!isInteractive(headless)) {
    return null;
  }

  console.log(signale.error('Could not log in: ' + err.message));
  console.log(signale.note('Your arl cookie is likely missing, expired, or invalid.'));
  console.log('');

  const {retry} = await prompts([
    {
      type: 'confirm',
      name: 'retry',
      message: 'Set up a new login now?',
      initial: true,
    },
  ]);

  if (!retry) {
    return null;
  }

  return chooseAndConfigureArl(conf, experimentalLogin);
};
