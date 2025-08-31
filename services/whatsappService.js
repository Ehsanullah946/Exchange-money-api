// const WhatsAppChannelClass = require('../channels/whatsappChannel'); // your channel class
// const EventEmitter = require('events');

// function sleep(ms) {
//   return new Promise((r) => setTimeout(r, ms));
// }

// class WhatsAppService extends EventEmitter {
//   constructor() {
//     super();
//     this.channel = new WhatsAppChannelClass(); // channel is an EventEmitter too
//     this.queue = []; // in-memory queue: { phone, message, addedAt }
//     this.flushing = false;

//     // when channel is ready, flush queue
//     this.channel.on('ready', async () => {
//       console.log('whatsappService: channel ready — flushing queue');
//       await this.flushQueue();
//       this.emit('ready');
//     });

//     // when channel authenticated, also try flush
//     this.channel.on('authenticated', async () => {
//       console.log('whatsappService: channel authenticated — flushing queue');
//       await this.flushQueue();
//     });

//     // forward QR event so other parts can show it
//     this.channel.on('qr', (qr) => this.emit('qr', qr));
//   }

//   async send(phone, message) {
//     // just proxy to channel.send()
//     try {
//       const res = await this.channel.send(String(phone), message);
//       return res;
//     } catch (err) {
//       // wrap into consistent object
//       return { success: false, error: err.message || String(err) };
//     }
//   }

//   async sendWithRetry(phone, message, retries = 3, retryDelayMs = 1500) {
//     phone = String(phone);
//     // try immediate attempts
//     for (let attempt = 1; attempt <= retries; attempt++) {
//       try {
//         const res = await this.send(phone, message);
//         // if channel reports queued (disconnected), push to queue and return queued
//         if (res && res.queued) {
//           console.log(
//             `whatsappService: send returned queued (attempt ${attempt}). Queuing message.`
//           );
//           this.enqueue(phone, message);
//           return {
//             success: false,
//             queued: true,
//             note: 'queued because disconnected',
//           };
//         }
//         if (res && res.success) {
//           return res;
//         }

//         // If not success and not queued, retry after delay
//         console.warn(
//           `whatsappService: attempt ${attempt} failed for ${phone}: ${
//             res && res.error
//           }`
//         );
//       } catch (err) {
//         console.error(
//           `whatsappService: attempt ${attempt} exception:`,
//           err.message || err
//         );
//       }

//       // wait before next attempt
//       if (attempt < retries) await sleep(retryDelayMs * attempt);
//     }

//     // After retries failed -> enqueue as a fallback and return failure + queued status
//     console.warn(
//       'whatsappService: all retries failed — enqueueing message for later delivery'
//     );
//     this.enqueue(phone, message);
//     return {
//       success: false,
//       error: 'failed after retries, queued',
//       queued: true,
//     };
//   }

//   enqueue(phone, message) {
//     this.queue.push({ phone, message, addedAt: new Date() });
//     // attempt background flush in case the channel becomes available soon
//     if (!this.flushing)
//       this.flushQueue().catch((e) => console.error('flushQueue err', e));
//   }

//   async flushQueue() {
//     if (this.flushing) return;
//     if (!this.channel || !this.channel.connected) {
//       // channel not ready
//       console.log(
//         'whatsappService: channel not connected — cannot flush queue yet'
//       );
//       return;
//     }

//     if (this.queue.length === 0) {
//       return;
//     }

//     this.flushing = true;
//     console.log(
//       `whatsappService: flushing ${this.queue.length} queued messages...`
//     );
//     const queueCopy = this.queue.splice(0); // take all
//     for (const item of queueCopy) {
//       try {
//         const r = await this.channel.send(item.phone, item.message);
//         if (!r || !r.success) {
//           // if send still fails, re-enqueue with backoff
//           console.warn(
//             'whatsappService: flushed message failed — re-enqueueing',
//             item.phone,
//             r && r.error
//           );
//           this.queue.push(item);
//         } else {
//           console.log('whatsappService: flushed message sent to', item.phone);
//         }
//       } catch (err) {
//         console.error('whatsappService: flush send error', err.message || err);
//         this.queue.push(item);
//       }
//     }
//     this.flushing = false;
//   }

//   // optional helper to inspect queued messages
//   getQueue() {
//     return this.queue.slice();
//   }
// }

// module.exports = new WhatsAppService();

const WhatsAppChannelClass = require('../channels/whatsappChannel');
const EventEmitter = require('events');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.channel = new WhatsAppChannelClass();
    this.queue = [];
    this.flushing = false;
    this.maxQueueSize = 100;
    this.flushDelay = 2000; // Delay between flush attempts

    this.setupChannelListeners();
  }

  setupChannelListeners() {
    this.channel.on('ready', async () => {
      console.log('📱 WhatsApp channel ready — attempting queue flush');
      await this.safeFlushQueue();
    });

    this.channel.on('authenticated', async () => {
      console.log('📱 WhatsApp authenticated — attempting queue flush');
      await this.safeFlushQueue();
    });

    this.channel.on('qr', (qr) => {
      this.emit('qr', qr);
    });
  }

  async send(phone, message) {
    try {
      const res = await this.channel.send(String(phone), message);
      return res;
    } catch (err) {
      console.error('WhatsApp send error:', err.message);
      return {
        success: false,
        error: err.message || String(err),
        channel: 'whatsapp',
        queued: true,
      };
    }
  }

  async sendWithRetry(phone, message, retries = 2, retryDelayMs = 1000) {
    phone = String(phone);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await this.send(phone, message);

        if (res && res.success) {
          return res;
        }

        if (res && res.queued) {
          console.log(`📱 Message queued (attempt ${attempt})`);
          this.enqueue(phone, message);
          return res;
        }

        console.warn(`📱 Attempt ${attempt} failed:`, res?.error);
      } catch (err) {
        console.error(`📱 Attempt ${attempt} exception:`, err.message);
      }

      if (attempt < retries) await sleep(retryDelayMs * attempt);
    }

    // Final fallback: enqueue
    this.enqueue(phone, message);
    return {
      success: false,
      error: 'Failed after all retries, message queued',
      queued: true,
    };
  }

  enqueue(phone, message) {
    // Prevent duplicate messages in queue
    const existingIndex = this.queue.findIndex(
      (item) => item.phone === phone && item.message === message
    );

    if (existingIndex !== -1) {
      console.log('📱 Message already in queue, updating timestamp');
      this.queue[existingIndex].addedAt = new Date();
      this.queue[existingIndex].attempts = 0;
      return;
    }

    // Prevent queue from growing too large
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('📱 Queue full, dropping oldest message');
      this.queue.shift();
    }

    this.queue.push({
      phone,
      message,
      addedAt: new Date(),
      attempts: 0,
      lastAttempt: null,
    });

    // Schedule flush with delay
    this.scheduleFlush();
  }

  scheduleFlush() {
    if (!this.flushing) {
      setTimeout(() => this.safeFlushQueue().catch(() => {}), this.flushDelay);
    }
  }

  async safeFlushQueue() {
    if (this.flushing || this.queue.length === 0) return;

    // Check if channel is actually ready
    if (!this.channel.connected) {
      console.log('📱 Channel not connected — skipping flush');
      return;
    }

    this.flushing = true;

    try {
      await this.flushQueue();
    } catch (error) {
      console.error('📱 Queue flush error:', error.message);
    } finally {
      this.flushing = false;
    }
  }

  async flushQueue() {
    const queueSize = this.queue.length;
    if (queueSize === 0) return;

    console.log(`📱 Flushing ${queueSize} queued messages...`);

    const failedMessages = [];
    const now = new Date();

    for (const item of this.queue) {
      // Skip if attempted recently (within 30 seconds)
      if (item.lastAttempt && now - item.lastAttempt < 30000) {
        failedMessages.push(item);
        continue;
      }

      try {
        item.attempts = (item.attempts || 0) + 1;
        item.lastAttempt = now;

        const result = await this.channel.send(item.phone, item.message);

        if (result && result.success) {
          console.log('✅ Flushed message sent to', item.phone);
          // Successfully sent, don't re-add to queue
          await sleep(1000); // Rate limiting
          continue;
        }

        // If failed but can retry
        if (item.attempts < 3) {
          failedMessages.push(item);
          console.warn(
            `📱 Flush failed (attempt ${item.attempts}) for`,
            item.phone
          );
        } else {
          console.error('📱 Giving up on message after 3 attempts');
        }
      } catch (error) {
        console.error('📱 Flush error for', item.phone, error.message);
        if (item.attempts < 3) {
          failedMessages.push(item);
        }
      }

      await sleep(500); // Small delay between messages
    }

    // Update queue with failed messages only
    this.queue = failedMessages;

    if (failedMessages.length > 0) {
      console.log(`📱 ${failedMessages.length} messages remain in queue`);
      // Schedule next flush attempt
      this.scheduleFlush();
    }
  }

  getQueue() {
    return this.queue.slice();
  }

  clearQueue() {
    this.queue = [];
  }

  getStatus() {
    return {
      queueLength: this.queue.length,
      flushing: this.flushing,
      channelConnected: this.channel.connected,
    };
  }
}

module.exports = new WhatsAppService();
