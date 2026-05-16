import { io } from 'socket.io-client';
import { getAccessToken } from '@/services/api/client/apiClient';
import { showUpdateToast } from './UpdateNotification';

let currentVersion = '';
let hasNotified = false;

const getApiBase = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.unitedmess.uk/api/v1';
    return apiUrl.replace(/\/api\/v1\/?$/, '');
};

const notify = (source) => {
    // Prevent duplicate notifications until the user reloads the app
    if (hasNotified) return;
    hasNotified = true;
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
            const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
            // Add cache-busting timestamp to prevent intermediate caches from serving stale version data
            const res = await fetch(`${baseUrl}/version?t=${Date.now()}`, { 
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
// If a user navigates to a new route after a deployment, Vite will fail to fetch the old chunk.
// We catch this specific error and automatically force a reload to get the new version.
const setupVitePreloadListener = () => {
    const handler = (event) => {
        console.warn('Vite preload error detected. Reloading to fetch new chunks...', event);
        window.location.href = window.location.href; // Force hard reload
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
