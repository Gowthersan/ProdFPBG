import axios from 'axios';
import { environDev } from '../../../environments/environment.development';

const instance = axios.create({
  baseURL: environDev.urlServer,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default instance;
