const socketIO = require('socket.io');

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Customer joins their room
    socket.on('join-customer', (customerId) => {
      socket.join(`customer_${customerId}`);
      console.log(
        `👤 Customer ${customerId} joined room: customer_${customerId}`
      );
    });

    // Branch joins their room
    socket.on('join-branch', (branchId) => {
      socket.join(`branch_${branchId}`);
      console.log(`🏢 Branch ${branchId} joined room: branch_${branchId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✅ WebSocket server initialized');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error(
      'WebSocket server not initialized. Call initSocket() first.'
    );
  }
  return io;
};

// Helper function to check if a room has connections
const getRoomConnections = (room) => {
  if (!io) return 0;
  const roomSockets = io.sockets.adapter.rooms.get(room);
  return roomSockets ? roomSockets.size : 0;
};

// Helper function to send test notification
const sendTestNotification = (room, message) => {
  if (!io) {
    console.error('WebSocket not initialized');
    return false;
  }

  io.to(room).emit('notification', {
    type: 'test',
    message: message,
    timestamp: new Date(),
  });

  return true;
};

module.exports = {
  initSocket,
  getIO,
  getRoomConnections,
  sendTestNotification,
};
