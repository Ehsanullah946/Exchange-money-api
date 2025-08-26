const WhatsAppChannelClass = require('../channels/whatsappChannel'); // your channel class
const EventEmitter = require('events');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.channel = new WhatsAppChannelClass(); // channel is an EventEmitter too
    this.queue = []; // in-memory queue: { phone, message, addedAt }
    this.flushing = false;

    // when channel is ready, flush queue
    this.channel.on('ready', async () => {
      console.log('whatsappService: channel ready — flushing queue');
      await this.flushQueue();
      this.emit('ready');
    });

    // when channel authenticated, also try flush
    this.channel.on('authenticated', async () => {
      console.log('whatsappService: channel authenticated — flushing queue');
      await this.flushQueue();
    });

    // forward QR event so other parts can show it
    this.channel.on('qr', (qr) => this.emit('qr', qr));
  }

  async send(phone, message) {
    // just proxy to channel.send()
    try {
      const res = await this.channel.send(String(phone), message);
      return res;
    } catch (err) {
      // wrap into consistent object
      return { success: false, error: err.message || String(err) };
    }
  }

  async sendWithRetry(phone, message, retries = 3, retryDelayMs = 1500) {
    phone = String(phone);
    // try immediate attempts
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await this.send(phone, message);
        // if channel reports queued (disconnected), push to queue and return queued
        if (res && res.queued) {
          console.log(
            `whatsappService: send returned queued (attempt ${attempt}). Queuing message.`
          );
          this.enqueue(phone, message);
          return {
            success: false,
            queued: true,
            note: 'queued because disconnected',
          };
        }
        if (res && res.success) {
          return res;
        }

        // If not success and not queued, retry after delay
        console.warn(
          `whatsappService: attempt ${attempt} failed for ${phone}: ${
            res && res.error
          }`
        );
      } catch (err) {
        console.error(
          `whatsappService: attempt ${attempt} exception:`,
          err.message || err
        );
      }

      // wait before next attempt
      if (attempt < retries) await sleep(retryDelayMs * attempt);
    }

    // After retries failed -> enqueue as a fallback and return failure + queued status
    console.warn(
      'whatsappService: all retries failed — enqueueing message for later delivery'
    );
    this.enqueue(phone, message);
    return {
      success: false,
      error: 'failed after retries, queued',
      queued: true,
    };
  }

  enqueue(phone, message) {
    this.queue.push({ phone, message, addedAt: new Date() });
    // attempt background flush in case the channel becomes available soon
    if (!this.flushing)
      this.flushQueue().catch((e) => console.error('flushQueue err', e));
  }

  async flushQueue() {
    if (this.flushing) return;
    if (!this.channel || !this.channel.connected) {
      // channel not ready
      console.log(
        'whatsappService: channel not connected — cannot flush queue yet'
      );
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    this.flushing = true;
    console.log(
      `whatsappService: flushing ${this.queue.length} queued messages...`
    );
    const queueCopy = this.queue.splice(0); // take all
    for (const item of queueCopy) {
      try {
        const r = await this.channel.send(item.phone, item.message);
        if (!r || !r.success) {
          // if send still fails, re-enqueue with backoff
          console.warn(
            'whatsappService: flushed message failed — re-enqueueing',
            item.phone,
            r && r.error
          );
          this.queue.push(item);
        } else {
          console.log('whatsappService: flushed message sent to', item.phone);
        }
      } catch (err) {
        console.error('whatsappService: flush send error', err.message || err);
        this.queue.push(item);
      }
    }
    this.flushing = false;
  }

  // optional helper to inspect queued messages
  getQueue() {
    return this.queue.slice();
  }
}

module.exports = new WhatsAppService();
