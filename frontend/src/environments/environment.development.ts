import packageInfo from '../../package.json';
export const environDev = {
  appVersion: packageInfo.version,
  production: false,
  urlServer: 'http://localhost:4000',
};
