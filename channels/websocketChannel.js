class WebSocketChannel {
  constructor() {
    this.io = null;
  }

  setIO(ioInstance) {
    this.io = ioInstance;
  }

  async send(recipientId, message, recipientType = 'customer') {
    if (!this.io) {
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

      this.io.to(room).emit('notification', message);
      return { success: true, channel: 'websocket' };
    } catch (error) {
      console.error('WebSocket send error:', error.message);
      return { success: false, error: error.message, channel: 'websocket' };
    }
  }
}

module.exports = WebSocketChannel;
