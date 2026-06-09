import { useEffect, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { io } from 'socket.io-client';
import { addRealTimeNotification } from '../store/notification.slice';
import { getAccessToken } from '@/services/api/client/apiClient';
import toast from 'react-hot-toast';
import {
    fetchPayableAmount,
    fetchPayableGasBill,
} from '@/modules/auth/store/auth.slice';
import {
    fetchPayments,
} from '@/modules/payment/store/payment.slice';
import {
    fetchActiveInvoice,
} from '@/modules/payment/store/invoice.slice';
import {
    fetchBillingMonthStats,
    fetchUsers,
    fetchAdminUnpaidInvoices,
} from '@/modules/members/store/members.slice';
import {
    fetchAdminDashboardStats,
    fetchUserDashboardStats,
} from '@/modules/dashboard/store/dashboard.slice';

// Use standard API URL resolution for socket connection
const getSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.unitedmess.uk/api/v1';
    // Remove /api/v1 if present to get the base URL
    return apiUrl.replace(/\/api\/v1\/?$/, '');
};

const useSocket = () => {
    const dispatch = useDispatch();
    const store = useStore();
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

                socketRef.current.on('billing:updated', () => {
                    dispatch(fetchPayableAmount());
                    dispatch(fetchPayableGasBill());
                    dispatch(fetchUsers({ page: 1, limit: 100, isActive: true, userStatus: 'approved' }));
                    dispatch(fetchBillingMonthStats());
                    dispatch(fetchPayments({ page: 1, limit: 20 }));
                    dispatch(fetchActiveInvoice());
                    const date = new Date();
                    const day = date.getDate();
                    let month = date.getMonth() + 1;
                    let year = date.getFullYear();
                    if (day <= 10) {
                        if (month === 1) { month = 12; year--; }
                        else { month--; }
                    }
                    dispatch(fetchAdminUnpaidInvoices({ month, year }));
                    const state = store.getState();
                    if (state.auth.user?.role === 'admin') {
                        dispatch(fetchAdminDashboardStats());
                    } else if (state.auth.user) {
                        dispatch(fetchUserDashboardStats());
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
                    if (socketRef.current.connected) {
                        socketRef.current.disconnect();
                    }
                    socketRef.current.connect();
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
    }, [user, dispatch, store]);

    return socketRef.current;
};

export default useSocket;
