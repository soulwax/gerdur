// Fetch an arl from email/password, or verify an existing arl.
//
//   GERDUR_EMAIL=you@example.com GERDUR_PASSWORD=secret node examples/login.js
//   GERDUR_ARL=your_arl node examples/login.js
const {getArl, LoginError, createSession} = require('../dist/src');

async function main() {
  const {GERDUR_ARL, GERDUR_EMAIL, GERDUR_PASSWORD} = process.env;

  if (GERDUR_EMAIL && GERDUR_PASSWORD) {
    try {
      const arl = await getArl(GERDUR_EMAIL, GERDUR_PASSWORD);
      console.log('Fetched arl (length %d):', arl.length);
      console.log(arl);
    } catch (err) {
      if (err instanceof LoginError) {
        console.error(`Login failed [${err.reason}]: ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
    return;
  }

  if (GERDUR_ARL) {
    const session = await createSession({arl: GERDUR_ARL});
    const user = await session.getUser();
    console.log('arl is valid. Logged in as:', user.BLOG_NAME);
    return;
  }

  console.error('Set GERDUR_EMAIL + GERDUR_PASSWORD (to fetch an arl) or GERDUR_ARL (to verify one).');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
