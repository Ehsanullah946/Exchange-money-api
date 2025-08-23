// channels/websocketChannel.js
class WebSocketChannel {
  constructor() {
    this.io = null;
  }

  setIO(ioInstance) {
    this.io = ioInstance;
    console.log('WebSocket channel initialized');
  }

  async send(recipientId, message, recipientType = 'customer') {
    if (!this.io) {
      console.error(
        'WebSocket not initialized - make sure to call setIO() first'
      );
      return {
        success: false,
        error: 'WebSocket not initialized',
        channel: 'websocket',
      };
    }

    try {
      const room =
        recipientType === 'customer'
          ? `customer_${recipientId}`
          : `branch_${recipientId}`;

      console.log(`Sending WebSocket message to room: ${room}`);
      this.io.to(room).emit('notification', message);

      return { success: true, channel: 'websocket', room };
    } catch (error) {
      console.error('WebSocket send error:', error.message);
      return { success: false, error: error.message, channel: 'websocket' };
    }
  }
}

module.exports = WebSocketChannel;
