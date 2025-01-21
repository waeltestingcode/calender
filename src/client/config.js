const isProd = process.env.NODE_ENV === 'production';
export const API_BASE_URL = isProd 
  ? 'https://calenderautomation.vercel.app' 
  : 'http://localhost:3001'; 