import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { execSync } from 'node:child_process';

let buildInfo = { version: '0.0.0', commit: 'unknown', buildTime: new Date().toISOString() };
try {
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    buildInfo = {
        version: process.env.npm_package_version || '0.0.0',
        commit,
        buildTime: new Date().toISOString(),
    };
} catch {
    // Not a git repo or git unavailable — use defaults
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        __BUILD_INFO__: JSON.stringify(buildInfo),
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
