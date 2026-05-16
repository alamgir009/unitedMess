import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { addRealTimeNotification } from '../store/notification.slice';
import { getAccessToken } from '@/services/api/client/apiClient';

export const STATUS = {
    CONNECTED: 'CONNECTED',
    CONNECTING: 'CONNECTING',
    DISCONNECTED: 'DISCONNECTED',
    ERROR: 'ERROR',
};

const getSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.unitedmess.uk/api/v1';
    return apiUrl.replace(/\/api\/v1\/?$/, '');
};

const useSocket = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const socketRef = useRef(null);
    const [status, setStatus] = useState(STATUS.DISCONNECTED);

    useEffect(() => {
        if (!user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setStatus(STATUS.DISCONNECTED);
            return;
        }

        setStatus(STATUS.CONNECTING);

        const connectSocket = () => {
            const token = getAccessToken();

            if (!socketRef.current) {
                socketRef.current = io(getSocketUrl(), {
                    auth: { token },
                    withCredentials: true,
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                });

                socketRef.current.on('receive_notification', (notification) => {
                    dispatch(addRealTimeNotification(notification));

                    try {
                        const audio = new Audio('/assets/audio/iPhonesmstone.ogg');
                        audio.volume = 0.5;
                        audio.play().catch((err) => {
                            if (import.meta.env.DEV) {
                                console.log('Audio autoplay blocked by browser:', err);
                            }
                        });
                    } catch (e) {
                        console.error('Failed to play notification sound', e);
                    }
                });

                socketRef.current.on('connect', () => {
                    setStatus(STATUS.CONNECTED);
                    if (import.meta.env.DEV) {
                        console.log('Socket reconnected, resubscribing...');
                    }
                });

                socketRef.current.on('disconnect', () => {
                    setStatus(STATUS.DISCONNECTED);
                });

                socketRef.current.on('connect_error', (error) => {
                    setStatus(STATUS.ERROR);
                    if (import.meta.env.DEV) {
                        console.error('Socket connection error:', error);
                    }
                });
            } else if (token && !socketRef.current.auth?.token) {
                socketRef.current.auth.token = token;
            }
        };

        connectSocket();

        const timer = setTimeout(() => {
            if (!socketRef.current?.auth?.token) {
                const token = getAccessToken();
                if (token && socketRef.current) {
                    socketRef.current.auth.token = token;
                    socketRef.current.disconnect().connect();
                }
            }
        }, 2000);

        return () => {
            clearTimeout(timer);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setStatus(STATUS.DISCONNECTED);
        };
    }, [user, dispatch]);

    return { status, socket: socketRef.current };
};

export default useSocket;
