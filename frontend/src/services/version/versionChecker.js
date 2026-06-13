import { io } from 'socket.io-client';
import { getAccessToken } from '@/services/api/client/apiClient';
import { showUpdateToast } from './UpdateNotification';

let currentVersion = '';
let currentCommit = '';
let hasNotified = false;

const DISMISSED_KEY = '__um_dismissed_commit';

const getApiBase = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.unitedmess.uk/api/v1';
    return apiUrl.replace(/\/api\/v1\/?$/, '');
};

const notify = (source) => {
    if (hasNotified) return;
    hasNotified = true;
    showUpdateToast(source, currentVersion, currentCommit);
};

// Layer 1: Service Worker lifecycle — the primary "new deploy" signal.
// Fires once per SW version (on activate).
const setupSWListener = () => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event) => {
        if (event.data?.type !== 'NEW_VERSION_READY') return;
        notify('service_worker');
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
};

// Layer 2: Socket.io version event — fallback.
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
            notify('socket');
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

// Layer 3: Periodic polling of version endpoint — fallback.
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
                notify('poll');
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
        if (info) {
            if (info.version) currentVersion = info.version;
            if (info.commit) currentCommit = info.commit;
        }
    } catch { /* not available */ }

    hasNotified = false;

    // If this build has already been dismissed ("Update" or "Later" was clicked
    // for its commit hash), suppress all notifications for the entire session.
    if (currentCommit) {
        try {
            const dismissed = localStorage.getItem(DISMISSED_KEY);
            if (dismissed === currentCommit) {
                hasNotified = true;
            }
        } catch { /* ignore */ }
    }

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
