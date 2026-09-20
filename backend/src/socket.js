const jwt = require('jsonwebtoken');
const riderModel = require('./models/rider.model');

let ioInstance = null;
const riderSockets = new Map();

function extractToken(cookieHeader) {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function initSocket(server) {
    const { Server } = require('socket.io');
    ioInstance = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            credentials: true
        }
    });

    ioInstance.on('connection', async socket => {
        console.log('Socket connection successfully connected:', socket.id);

        const token = extractToken(socket.handshake.headers.cookie);
        let decoded = null;
        if (token) {
            try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { decoded = null; }
        }

        if (decoded?.role === 'rider') {
            riderSockets.set(String(decoded.id), socket.id);
            socket.data.riderId = String(decoded.id);
            // Only online riders should receive new-order broadcasts.
            const rider = await riderModel.findById(decoded.id).select('isOnline').catch(() => null);
            if (rider?.isOnline) socket.join('riders_lobby');
        }

        socket.on('join_order', orderId => {
            if (orderId) socket.join(`order_${orderId}`);
        });

        socket.on('leave_order', orderId => {
            if (orderId) socket.leave(`order_${orderId}`);
        });

        socket.on('rider:location', ({ orderId, lat, lng }) => {
            if (!orderId || lat == null || lng == null) return;
            ioInstance.to(`order_${orderId}`).emit('rider:location', { lat, lng, updatedAt: new Date() });
        });

        socket.on('disconnect', () => {
            if (socket.data.riderId && riderSockets.get(socket.data.riderId) === socket.id) {
                riderSockets.delete(socket.data.riderId);
            }
        });
    });
}

function getIO() {
    return ioInstance;
}

function getRiderSocketId(riderId) {
    return riderSockets.get(String(riderId));
}

function setRiderOnline(riderId, isOnline) {
    if (!ioInstance) return;
    const socketId = riderSockets.get(String(riderId));
    if (!socketId) return;
    const socket = ioInstance.sockets.sockets.get(socketId);
    if (!socket) return;
    if (isOnline) socket.join('riders_lobby');
    else socket.leave('riders_lobby');
}

module.exports = { initSocket, getIO, getRiderSocketId, setRiderOnline };
