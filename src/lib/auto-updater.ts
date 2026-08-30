import {existsSync, writeFileSync} from 'fs';
import got from 'got';
import AdmZip from 'adm-zip';
import chalk from 'chalk';
import logUpdate from 'log-update';
import signale from './signale';
import {progressBar} from './util';

interface assetsType {
  url: string;
  id: number;
  node_id: string;
  name: string;
  label: string | null;
  content_type: string;
  state: string;
  size: number;
  download_count: number;
  created_at: Date;
  updated_at: Date;
  browser_download_url: string;
}

interface apiData {
  url: string;
  assets_url: string;
  upload_url: string;
  html_url: string;
  id: number;
  node_id: string;
  tag_name: string;
  target_commitish: string;
  name: string;
  draft: false;
  prerelease: false;
  created_at: Date;
  published_at: Date;
  assets: assetsType[];
  tarball_url: string;
  zipball_url: string;
  body: string;
}

const updateCheck = async (pkg: any) => {
  const beta = pkg.version.includes('beta');
  const releases: apiData[] = await got('https://api.github.com/repos/soulwax/gerdur/releases').json();
  const data = releases.filter((r) => r.prerelease === beta)[0];

  if (data.tag_name > pkg.version) {
    return data;
  }
  logUpdate.clear();
  console.info(signale.info(`gerdur is up-to-date (${data.tag_name})`));
};

const updateBinary = async (pkg: any) => {
  logUpdate(signale.info('Checking for new updates...'));
  const data = await updateCheck(pkg);
  logUpdate.clear();

  if (data) {
    let platform = '';
    switch (process.platform) {
      case 'linux':
      case 'cygwin':
        platform = 'linux';
        break;
      case 'darwin':
        platform = 'macos';
        break;
      case 'win32':
        platform = 'win';
        break;
      default:
        throw new Error('Unknown platform: ' + process.platform);
    }

    const bin = `gerdur-${data.tag_name}${platform === 'win' ? '.exe' : ''}`;
    if (existsSync(bin)) {
      throw new Error(`${bin} already exists`);
    }

    const asset = data.assets.find((a) => a.name.includes(platform));
    if (asset) {
      console.log(signale.info('Changelog:'));
      console.log(data.body + '\n');

      console.log(`  Downloading ${asset.browser_download_url}`);
      const bar = progressBar(asset.size, 40);
      const humanSizeTotal = (asset.size / 1024 / 1024).toFixed(2);

      const {body} = await got(asset.browser_download_url, {responseType: 'buffer'}).on(
        'downloadProgress',
        ({transferred}) => {
          logUpdate(`  ${bar(transferred)} | ${humanSizeTotal}MiB`);
        },
      );
      logUpdate.done();

      logUpdate(signale.info('Extracting archive...'));
      const zip = new AdmZip(body).getEntries()[0].getData();
      logUpdate.clear();

      console.log(signale.info('Writing to ' + bin));
      writeFileSync(bin, zip, {mode: '755'});

      console.log(signale.info(`Updated. Run ${chalk.yellow(bin)} to use the new version.`));
    } else {
      throw new Error(`Unable to find asset for ${platform}`);
    }
  }
};

export default updateBinary;
