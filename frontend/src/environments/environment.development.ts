import packageInfo from '../../package.json';
export const environDev = {
  appVersion: packageInfo.version,
  production: true,
  urlServer: 'http://localhost:4000',
};
