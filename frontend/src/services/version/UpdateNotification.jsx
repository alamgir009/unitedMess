import toast from 'react-hot-toast';

const TOAST_ID = 'app-update-notification';

const showUpdateToast = (source, newVersion) => {
    toast(
        (t) => (
            <div className="flex items-center gap-4 px-2 py-1">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Update available</p>
                    <p className="text-xs text-muted-foreground">A new version of UnitedMess is ready</p>
                </div>
                <button
                    onClick={() => {
                        toast.dismiss(t.id);
                        // Force a cache-busting hard reload by navigating with a unique query param
                        const cacheBuster = newVersion || Date.now();
                        window.location.href = window.location.pathname + '?v=' + cacheBuster;
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Update
                </button>
                <button
                    onClick={() => {
                        toast.dismiss(t.id);
                        if (newVersion) {
                            // Remember that the user ignored this specific version so we don't nag them again
                            localStorage.setItem('ignoredUpdateVersion', newVersion);
                        }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                    Later
                </button>
            </div>
        ),
        {
            id: TOAST_ID,
            duration: Infinity, // Important: Don't auto-dismiss this critical notification
            position: 'bottom-right',
            style: {
                background: 'var(--toast-bg, hsl(var(--card)))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            },
        }
    );
};

export { showUpdateToast };
