import { io } from 'socket.io-client';
import { getAccessToken } from '@/services/api/client/apiClient';
import { showUpdateToast } from './UpdateNotification';

let currentVersion = '';
let hasNotified = false;
let canNotify = false;

const COOLDOWN_MS = 15000;
const INTENT_COOLDOWN_MS = 30000;
const INTENT_EXPIRY_MS = 60000;

// Detect if this page load was triggered by clicking "Update" — extend cooldown
let cooldownMs = COOLDOWN_MS;
try {
    const raw = sessionStorage.getItem('__um_update_intent');
    if (raw) {
        sessionStorage.removeItem('__um_update_intent');
        const intent = JSON.parse(raw);
        if (intent && Date.now() - intent.time < INTENT_EXPIRY_MS) {
            cooldownMs = INTENT_COOLDOWN_MS;
        }
    }
} catch { /* ignore */ }

setTimeout(() => { canNotify = true; }, cooldownMs);

const getApiBase = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.unitedmess.uk/api/v1';
    return apiUrl.replace(/\/api\/v1\/?$/, '');
};

const notify = (source, newVersion) => {
    if (!canNotify) return;
    if (hasNotified) return;

    if (newVersion) {
        try {
            const ignored = localStorage.getItem('__um_ignored_version');
            if (ignored === newVersion) return;
        } catch { /* ignore */ }
    }

    hasNotified = true;
    showUpdateToast(source, newVersion);
};

// Layer 1: Service Worker messages
const setupSWListener = () => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event) => {
        if (event.data?.type !== 'NEW_VERSION_READY') return;
        const swVersion = event.data?.version;
        if (swVersion && swVersion === currentVersion) return;
        notify('service_worker', swVersion);
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
};

// Layer 2: Socket.io connection for version events
const setupSocket = () => {
    const token = getAccessToken();
    if (!token) return null;

    const socketInstance = io(getApiBase(), {
        auth: { token },
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
    });

    socketInstance.on('server:version', (data) => {
        if (currentVersion && data.version && data.version !== currentVersion) {
            notify('socket', data.version);
        }
        if (!currentVersion && data.version) {
            currentVersion = data.version;
        }
    });

    socketInstance.on('connect_error', () => {});

    return () => {
        socketInstance.disconnect();
    };
};

// Layer 3: Periodic polling of version endpoint
const setupPolling = () => {
    const check = async () => {
        try {
            const endpoint = `${getApiBase()}/api/v1/version?t=${Date.now()}`;
            const res = await fetch(endpoint, {
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            });
            if (!res.ok) return;
            const data = await res.json();
            if (currentVersion && data.version && data.version !== currentVersion) {
                notify('poll', data.version);
            }
            if (!currentVersion && data.version) {
                currentVersion = data.version;
            }
        } catch { /* ignore */ }
    };
    setTimeout(check, 5000);
    const pollingTimer = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(pollingTimer);
};

// Layer 4: Vite chunk load failure recovery
const setupVitePreloadListener = () => {
    const handler = () => { window.location.reload(); };
    window.addEventListener('vite:preloadError', handler);
    return () => window.removeEventListener('vite:preloadError', handler);
};

export const initVersionChecker = () => {
    try {
        const info = typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : null;
        if (info && info.version) currentVersion = info.version;
    } catch { /* not available */ }

    hasNotified = false;

    const cleanups = [
        setupSWListener(),
        setupPolling(),
        setupVitePreloadListener()
    ];

    const socketTimer = setTimeout(() => {
        const socketCleanup = setupSocket();
        if (socketCleanup) cleanups.push(socketCleanup);
    }, 2000);

    return () => {
        clearTimeout(socketTimer);
        cleanups.forEach((fn) => { if (typeof fn === 'function') fn(); });
    };
};
