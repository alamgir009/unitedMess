import { useRef, useState, useEffect, useMemo, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Camera, User, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Spinner } from '@/shared/components/ui';
import { updateAvatar } from '@/modules/auth/store/auth.slice';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const IMAGE_MAGIC_BYTES = [
    { bytes: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg' },
    { bytes: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' },
    { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' },
];

async function readMagicBytes(file) {
    const blob = file.slice(0, 12);
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
}

function matchMagic(bytes, header) {
    for (let i = 0; i < header.length; i++) {
        if (bytes[i] !== header[i]) return false;
    }
    return true;
}

function detectMimeFromMagic(bytes) {
    for (const entry of IMAGE_MAGIC_BYTES) {
        if (matchMagic(bytes, entry.bytes)) return entry.mime;
    }
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
    return null;
}

export const AvatarUpload = memo(({ className = '' }) => {
    const dispatch = useDispatch();
    const { user, isLoading } = useSelector((state) => state.auth);
    const fileInputRef = useRef(null);

    const [previewUrl, setPreviewUrl] = useState(user?.image || null);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setPreviewUrl(user?.image || null);
        setImageError(false);
    }, [user?.image]);

    // Compute user monogram initials (e.g., "Alamgir Islam" => "AI")
    const initials = useMemo(() => {
        const name = (user?.name || '').trim();
        if (!name) return 'U';
        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }, [user?.name]);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be under 5 MB');
            return;
        }

        const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
        const EXT_TO_MIME = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.jfif': 'image/jpeg',
        };

        let detectedType = file.type;
        if (!detectedType || detectedType === 'application/octet-stream' || detectedType === 'image/jpg') {
            detectedType = EXT_TO_MIME[ext] || '';
        }

        if (!ALLOWED_TYPES.includes(detectedType)) {
            toast.error('Supported formats: JPEG, PNG, or WEBP only.');
            return;
        }

        const magicBytes = await readMagicBytes(file).catch(() => null);
        if (magicBytes) {
            const detectedMime = detectMimeFromMagic(magicBytes);
            if (!detectedMime) {
                toast.error('File signature does not match a verified image type.');
                return;
            }
        }

        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setImageError(false);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const resultAction = await dispatch(updateAvatar(formData));

            if (updateAvatar.rejected.match(resultAction)) {
                setPreviewUrl(user?.image || null);
                toast.error('Failed to update avatar photo');
            } else {
                toast.success('Avatar updated successfully');
            }
        } catch (err) {
            setPreviewUrl(user?.image || null);
            toast.error('Upload failed. Please try again.');
        } finally {
            setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleTriggerClick = () => {
        if (isLoading) return;
        fileInputRef.current?.click();
    };

    const showImage = previewUrl && !imageError;

    return (
        <div className={`relative inline-flex flex-col items-center ${className}`}>
            <div
                className="relative group cursor-pointer select-none"
                onClick={handleTriggerClick}
                title="Tap or click to change photo"
            >
                {/* Concentric Outer Cradle */}
                <div className="p-1 rounded-full bg-card border border-border shadow-xs transition-colors duration-200 group-hover:border-primary/40">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-muted/40 border border-border flex items-center justify-center">
                        {showImage ? (
                            <img
                                src={previewUrl}
                                alt={user?.name || 'User avatar'}
                                onError={() => setImageError(true)}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xl sm:text-2xl tracking-tight">
                                {initials}
                            </div>
                        )}

                        {/* Desktop Hover Scrim */}
                        <div
                            className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-200 flex flex-col items-center justify-center text-white ${
                                isLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                        >
                            {isLoading ? (
                                <Spinner size="sm" color="white" />
                            ) : (
                                <div className="hidden sm:flex flex-col items-center gap-0.5">
                                    <Camera className="w-4 h-4" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                                        Change
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Touch-Friendly Camera Badge (Directly Accessible on Mobile) */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerClick();
                    }}
                    disabled={isLoading}
                    aria-label="Upload profile photograph"
                    className="absolute bottom-0 right-0 p-2 sm:p-2.5 rounded-full bg-card border border-border shadow-xs text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                    <Camera className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={isLoading}
                aria-hidden="true"
            />
        </div>
    );
});

AvatarUpload.displayName = 'AvatarUpload';
export default AvatarUpload;
