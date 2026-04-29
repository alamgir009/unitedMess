import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { addRealTimeNotification } from '../store/notification.slice';
import { getAccessToken } from '@/services/api/client/apiClient';

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

                socketRef.current.on('connect', () => {
                    console.log('Socket connected:', socketRef.current.id);
                });

                socketRef.current.on('receive_notification', (notification) => {
                    dispatch(addRealTimeNotification(notification));
                });

                socketRef.current.on('disconnect', () => {
                    console.log('Socket disconnected');
                });
                
                socketRef.current.on('connect_error', (error) => {
                    console.error('Socket connection error:', error);
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
