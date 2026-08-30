// Shared helper: build a logged-in session from environment credentials.
//
// Uses the local build (`../dist/src`). If you installed the package as a
// dependency, replace this require with: require('gerdur').
const {createSession} = require('../dist/src');

/**
 * Create a session from GERDUR_ARL, or GERDUR_EMAIL + GERDUR_PASSWORD.
 * Exits with a helpful message if neither is set.
 */
async function sessionFromEnv() {
  const {GERDUR_ARL, GERDUR_EMAIL, GERDUR_PASSWORD} = process.env;

  if (GERDUR_ARL) {
    return createSession({arl: GERDUR_ARL});
  }
  if (GERDUR_EMAIL && GERDUR_PASSWORD) {
    return createSession({email: GERDUR_EMAIL, password: GERDUR_PASSWORD});
  }

  console.error('Set GERDUR_ARL, or GERDUR_EMAIL and GERDUR_PASSWORD, in your environment.');
  process.exit(1);
}

module.exports = {sessionFromEnv};
