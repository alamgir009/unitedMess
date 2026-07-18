/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

let buildInfo = { version: pkg.version, commit: 'unknown', buildTime: new Date().toISOString() };
try {
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    buildInfo = {
        version: pkg.version,
        commit,
        buildTime: new Date().toISOString(),
    };
} catch {
    // Not a git repo or git unavailable — use defaults
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        include: [
            'react-icons/hi2',
            'react-icons/fi',
            'react-icons/bi',
            'react-icons/bs',
            'react-icons/md',
            'react-icons/si',
            'react-icons/tb',
            'react-icons/ri',
            'react-icons/io5',
            'react-icons/pi',
            'react-icons/io',
        ],
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-state': ['react-redux', '@reduxjs/toolkit'],
                    'vendor-ui': ['framer-motion', 'lucide-react', 'react-icons'],
                    'vendor-pdf': ['html2canvas', 'jspdf'],
                    'vendor-firebase': ['firebase/app', 'firebase/messaging'],
                },
            },
        },
    },
    define: {
        __BUILD_INFO__: JSON.stringify(buildInfo),
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
        },
    },
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./tests/unit/setup.js'],
        css: true,
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
