import toast from 'react-hot-toast';

const TOAST_ID = 'app-update-notification';

const showUpdateToast = (source, newVersion) => {
    toast(
        (t) => (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-2 py-1">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Update available</p>
                    <p className="text-xs text-muted-foreground">A new version of UnitedMess is ready</p>
                </div>
                <button
                    onClick={async () => {
                        toast.dismiss(t.id);
                        
                        // Set the intent for versionChecker's cooldown
                        try {
                            sessionStorage.setItem(
                                '__um_update_intent',
                                JSON.stringify({ version: newVersion || '', time: Date.now() })
                            );
                        } catch { /* ignore */ }

                        // On mobile devices, browsers heavily cache assets. 
                        // We must clear CacheStorage manually before reloading.
                        if ('caches' in window) {
                            try {
                                const cacheNames = await caches.keys();
                                await Promise.all(cacheNames.map(name => caches.delete(name)));
                            } catch { /* ignore */ }
                        }

                        // Force a network reload by adding a cache-busting query parameter.
                        // We use location.replace so the reload doesn't add to the history stack.
                        window.location.replace(window.location.pathname + '?update=' + Date.now());
                    }}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2.5 sm:py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Update
                </button>
                <button
                    onClick={() => {
                        toast.dismiss(t.id);
                        if (newVersion) {
                            try {
                                localStorage.setItem('__um_ignored_version', newVersion);
                            } catch { /* quota exceeded */ }
                        }
                    }}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2.5 sm:py-1.5 text-xs font-semibold rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                    Later
                </button>
            </div>
        ),
        {
            id: TOAST_ID,
            duration: Infinity,
            position: 'bottom-right',
            style: {
                background: 'var(--toast-bg, hsl(var(--card)))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                maxWidth: 'calc(100vw - 32px)',
            },
        }
    );
};

export { showUpdateToast };
