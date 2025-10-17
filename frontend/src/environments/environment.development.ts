import packageInfo from '../../package.json';
export const environDev = {
  appVersion: packageInfo.version,
  production: true,
  urlServer: 'https://api.fpbg.singcloud.ga',
};
