const setupSocketIO = (server) => {
    const io = require('socket.io')(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        // console.log('A user connected');

        socket.on('disconnect', () => {
            // console.log('User disconnected');
        });
    });

    return io;
};

module.exports = { setupSocketIO };
