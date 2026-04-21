import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const API_TARGET = env.VITE_API_TARGET || 'http://localhost:3000';
  const API_TOKEN = env.API_TOKEN;

  const allowedHosts = (env.VITE_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

  const attachAuth = (proxy) => {
    if (!API_TOKEN) return;
    proxy.on('proxyReq', (proxyReq) => {
      proxyReq.setHeader('Authorization', `Bearer ${API_TOKEN}`);
    });
  };

  const proxy = {
    '/api': { target: API_TARGET, changeOrigin: true, configure: attachAuth },
    '/health': { target: API_TARGET, changeOrigin: true, configure: attachAuth },
  };

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts,
      proxy,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      allowedHosts,
      proxy,
    },
  };
});
