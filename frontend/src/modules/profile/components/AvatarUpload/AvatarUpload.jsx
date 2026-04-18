import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Camera, Loader2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateAvatar } from '@/modules/auth/store/auth.slice';

export const AvatarUpload = () => {
    const dispatch = useDispatch();
    const { user, isLoading } = useSelector((state) => state.auth);
    const fileInputRef = useRef(null);

    const [previewUrl, setPreviewUrl] = useState(user?.image || null);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const resultAction = await dispatch(updateAvatar(formData));

            if (updateAvatar.rejected.match(resultAction)) {
                setPreviewUrl(user?.image || null);
            }
        } catch (err) {
            setPreviewUrl(user?.image || null);
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

    return (
        <div className="relative group w-fit mx-auto">
            
            {/* Gradient ring wrapper */}
            <div className="p-[2px] rounded-full bg-gradient-to-tr from-indigo-500 via-teal-500 to-cyan-400 shadow-[0_10px_40px_rgba(0,0,0,0.25)] dark:shadow-[0_10px_50px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover:scale-[1.03]">
                
                {/* Glass container */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10">
                    
                    {/* Avatar */}
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <User className="w-12 h-12 text-zinc-400 dark:text-zinc-600" />
                        </div>
                    )}

                    {/* Overlay */}
                    <div
                        onClick={handleTriggerClick}
                        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 dark:bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-md"
                    >
                        {isLoading ? (
                            <Loader2 className="w-7 h-7 text-white animate-spin" />
                        ) : (
                            <div className="flex flex-col items-center text-white">
                                <Camera className="w-5 h-5 mb-1" />
                                <span className="text-[11px] font-medium tracking-wide">
                                    Change
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Subtle inner glow */}
                    <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />
                </div>
            </div>

            

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={isLoading}
            />
        </div>
    );
};

export default AvatarUpload;