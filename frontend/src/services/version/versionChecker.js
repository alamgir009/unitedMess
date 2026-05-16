import { io } from 'socket.io-client';
import { getAccessToken } from '@/services/api/client/apiClient';
import { showUpdateToast } from './UpdateNotification';

let currentVersion = '';
let hasNotified = false;

const getApiBase = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.unitedmess.uk/api/v1';
    return apiUrl.replace(/\/api\/v1\/?$/, '');
};

const notify = (source, newVersion) => {
    // Prevent duplicate notifications until the user reloads the app
    if (hasNotified) return;

    // If user clicked "Later" for this specific version, don't bother them again
    if (newVersion) {
        const ignored = localStorage.getItem('ignoredUpdateVersion');
        if (ignored === newVersion) return;
    }

    hasNotified = true;
    showUpdateToast(source, newVersion);
};

// Layer 1: Service Worker messages
const setupSWListener = () => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event) => {
        if (event.data?.type === 'NEW_VERSION_READY') {
            notify('service_worker', event.data?.version);
        }
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

    socketInstance.on('connect_error', () => {
        // Socket failed — polling and SW will cover us
    });

    return () => {
        socketInstance.disconnect();
    };
};

// Layer 3: Periodic polling of version endpoint
const setupPolling = () => {
    const check = async () => {
        try {
            // Guarantee we hit /api/v1/version regardless of how VITE_API_URL is configured
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
        } catch (error) {
            // Ignore network errors during polling (e.g., if the user is offline or server is temporarily down)
        }
    };
    
    // Initial check delayed to not block main app load
    setTimeout(check, 5000);
    const pollingTimer = setInterval(check, 5 * 60 * 1000); // Poll every 5 minutes
    
    return () => clearInterval(pollingTimer);
};

// Layer 4: Vite dynamic import failure recovery
const setupVitePreloadListener = () => {
    const handler = (event) => {
        console.warn('Vite preload error detected. Reloading to fetch new chunks...', event);
        window.location.href = window.location.pathname + '?v=' + Date.now(); 
    };
    window.addEventListener('vite:preloadError', handler);
    return () => window.removeEventListener('vite:preloadError', handler);
};

export const initVersionChecker = () => {
    // Read the build-time injected version from Vite config
    try {
        const info = typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : null;
        if (info && info.version) currentVersion = info.version;
    } catch { /* not available */ }

    // Reset notification state if component re-mounts
    hasNotified = false;

    const cleanups = [
        setupSWListener(),
        setupPolling(),
        setupVitePreloadListener()
    ];

    // Delayed socket setup (wait for token to be available and not block render)
    const socketTimer = setTimeout(() => {
        const socketCleanup = setupSocket();
        if (socketCleanup) {
            cleanups.push(socketCleanup);
        }
    }, 2000);

    return () => {
        clearTimeout(socketTimer);
        cleanups.forEach((fn) => { if (typeof fn === 'function') fn(); });
    };
};
