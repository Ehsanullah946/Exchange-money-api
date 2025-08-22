// services/socketService.js
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
    console.log('Client connected:', socket.id);

    // Customer joins their room
    socket.on('join-customer', (customerId) => {
      socket.join(`customer_${customerId}`);
      console.log(`Customer ${customerId} connected`);
    });

    // Branch joins their room (uses customer ID since branch is a customer)
    socket.on('join-branch', (branchId) => {
      socket.join(`branch_${branchId}`);
      console.log(`Branch ${branchId} connected`);

      // Also join the customer room if needed
      // This would require fetching the customerId from branchId
    });

    // Join both customer and branch rooms based on user type
    socket.on('join-user', async (userData) => {
      if (userData.type === 'customer') {
        socket.join(`customer_${userData.id}`);
      } else if (userData.type === 'branch') {
        socket.join(`branch_${userData.id}`);
        // If branch has customer association, join that room too
        if (userData.customerId) {
          socket.join(`customer_${userData.customerId}`);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  const notificationService = require('./notificationService');
  notificationService.setWebSocketIO(io);

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initSocket, getIO };
