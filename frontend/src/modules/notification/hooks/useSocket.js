import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { addRealTimeNotification } from '../store/notification.slice';
import { getAccessToken } from '@/services/api/client/apiClient';
import toast from 'react-hot-toast';

// Use standard API URL resolution for socket connection
const getSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.unitedmess.uk/api/v1';
    // Remove /api/v1 if present to get the base URL
    return apiUrl.replace(/\/api\/v1\/?$/, '');
};

const useSocket = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const socketRef = useRef(null);
    const processedNotifications = useRef(new Set());

    useEffect(() => {
        if (!user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        const connectSocket = () => {
            const token = getAccessToken();
            
            if (!socketRef.current) {
                socketRef.current = io(getSocketUrl(), {
                    auth: { token }, // We'll also rely on cookie fallback in the backend
                    withCredentials: true,
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                });



                socketRef.current.on('receive_notification', (notification) => {
                    const notifId = notification._id || notification.id;
                    
                    // Strict local deduplication
                    if (notifId) {
                        if (processedNotifications.current.has(notifId)) return;
                        processedNotifications.current.add(notifId);
                        
                        // Prevent set from growing indefinitely
                        if (processedNotifications.current.size > 100) {
                            const firstItem = processedNotifications.current.values().next().value;
                            processedNotifications.current.delete(firstItem);
                        }
                    }

                    dispatch(addRealTimeNotification(notification));
                    
                    // Display instant visual feedback
                    toast.success(notification.title || 'New Notification', {
                        icon: '🔔',
                        duration: 4000,
                    });
                    
                    // Play notification sound if the browser allows it
                    try {
                        const playSound = () => {
                            const audio = new Audio('/assets/audio/iPhonesmstone.ogg');
                            audio.volume = 0.5;
                            audio.play().catch((err) => {
                                if (import.meta.env.DEV) {
                                    console.log('Audio autoplay blocked by browser:', err);
                                }
                            });
                        };
                        playSound();
                    } catch (e) {
                        console.error('Failed to play notification sound', e);
                    }
                });

                socketRef.current.on('connect', () => {
                    if (import.meta.env.DEV) {
                        console.log('Socket reconnected, resubscribing...');
                    }
                });
                
                socketRef.current.on('connect_error', (error) => {
                    if (import.meta.env.DEV) {
                        console.error('Socket connection error:', error);
                    }
                });
            } else if (token && !socketRef.current.auth?.token) {
                socketRef.current.auth.token = token;
            }
        };

        connectSocket();
        
        // Since token might be refreshed shortly after mount, check again after 2s if it was missing
        const timer = setTimeout(() => {
            if (!socketRef.current?.auth?.token) {
                const token = getAccessToken();
                if (token && socketRef.current) {
                    socketRef.current.auth.token = token;
                    socketRef.current.disconnect().connect(); // Force reconnect with new token
                }
            }
        }, 2000);

        return () => {
            clearTimeout(timer);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [user, dispatch]);

    return socketRef.current;
};

export default useSocket;
