const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/index');
const logger = require('../utils/logger/index');

let io;
// In-memory mapping of userId -> socket.id
// For multi-device support, we use a Set of socketIds per user.
const userSockets = new Map();

const setupSocketIO = (server) => {
    io = socketIO(server, {
        cors: {
            origin: config.cors.origin,
            credentials: true,
            methods: ["GET", "POST"]
        }
    });

    // Simple cookie parser helper
    const parseCookies = (cookieString) => {
        if (!cookieString) return {};
        return cookieString.split(';').reduce((res, c) => {
            const [key, val] = c.trim().split('=').map(decodeURIComponent);
            return Object.assign(res, { [key]: val });
        }, {});
    };

    // Authentication middleware
    io.use((socket, next) => {
        try {
            // Frontend might pass token in auth object or via httpOnly cookie
            let token = socket.handshake.auth?.token;

            if (!token && socket.handshake.headers.cookie) {
                const cookies = parseCookies(socket.handshake.headers.cookie);
                token = cookies.accessToken;
            }

            if (!token) {
                return next(new Error('Authentication error: Token missing'));
            }

            const decoded = jwt.verify(token, config.jwt.secret);
            socket.user = decoded; // { sub: userId, ... }
            next();
        } catch (error) {
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user.sub;
        
        // Handle multiple connections for same user
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);

        logger.info(`Socket connected for user ${userId} [${socket.id}]`);

        socket.on('disconnect', () => {
            const userSocketSet = userSockets.get(userId);
            if (userSocketSet) {
                userSocketSet.delete(socket.id);
                if (userSocketSet.size === 0) {
                    userSockets.delete(userId);
                }
            }
            logger.info(`Socket disconnected for user ${userId} [${socket.id}]`);
        });
    });

    return io;
};

/**
 * Emit an event to a specific user across all their connected devices.
 */
const emitToUser = (userId, event, payload) => {
    if (!io) return;
    const socketIds = userSockets.get(userId.toString());
    if (socketIds && socketIds.size > 0) {
        socketIds.forEach(socketId => {
            io.to(socketId).emit(event, payload);
        });
    }
};

/**
 * Emit an event to all connected users.
 */
const emitToAll = (event, payload) => {
    if (!io) return;
    io.emit(event, payload);
};

module.exports = { 
    setupSocketIO,
    emitToUser,
    emitToAll
};
