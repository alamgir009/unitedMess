import { io } from 'socket.io-client';
import { getAccessToken } from '@/services/api/client/apiClient';
import { showUpdateToast } from './UpdateNotification';

let currentVersion = '';
let pollingTimer = null;
let socketTimer = null;
let socketInstance = null;
let debounceTimer = null;
const DEBOUNCE_MS = 30000;
const POLL_INTERVAL = 300000;

const getApiBase = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.unitedmess.uk/api/v1';
    return apiUrl.replace(/\/api\/v1\/?$/, '');
};

const notify = (source) => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => { debounceTimer = null; }, DEBOUNCE_MS);
    showUpdateToast(source);
};

// Layer 1: Service Worker messages
const setupSWListener = () => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event) => {
        if (event.data?.type === 'NEW_VERSION_READY') {
            notify('service_worker');
        }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
};

// Layer 2: Socket.io connection for version events
const setupSocket = () => {
    const token = getAccessToken();
    if (!token) return;

    socketInstance = io(getApiBase(), {
        auth: { token },
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 5000,
    });

    socketInstance.on('server:version', (data) => {
        if (currentVersion && data.version !== currentVersion) {
            notify('socket');
        }
        currentVersion = data.version;
    });

    socketInstance.on('connect_error', () => {
        // Socket failed — polling and SW will cover us
    });

    return () => {
        if (socketInstance) {
            socketInstance.disconnect();
            socketInstance = null;
        }
    };
};

// Layer 3: Periodic polling of version endpoint
const setupPolling = () => {
    const check = () => {
        fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/version`, { cache: 'no-store' })
            .then((r) => r.json())
            .then((data) => {
                if (currentVersion && data.version !== currentVersion) {
                    notify('poll');
                }
                currentVersion = data.version;
            })
            .catch(() => {});
    };
    check();
    pollingTimer = setInterval(check, POLL_INTERVAL);
    return () => {
        if (pollingTimer) clearInterval(pollingTimer);
    };
};

export const initVersionChecker = () => {
    // Read the build-time injected version
    try {
        const info = typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : null;
        if (info) currentVersion = info.version;
    } catch { /* not available */ }

    const cleanups = [
        setupSWListener(),
        setupPolling(),
    ];

    // Delayed socket setup (wait for token to be available)
    socketTimer = setTimeout(() => {
        cleanups.push(setupSocket());
    }, 2000);

    return () => {
        cleanups.forEach((fn) => { if (typeof fn === 'function') fn(); });
        if (socketTimer) clearTimeout(socketTimer);
        if (debounceTimer) clearTimeout(debounceTimer);
    };
};
