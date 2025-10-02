import '../config/dotenv';
import amqp from 'amqplib';
import { config } from '../config/dotenv';
import type { ChannelModel as AmqpChannelModel, Channel as AmqpChannel } from 'amqplib';

const EXCHANGE_NAME = 'grn.clips';
const EXCHANGE_TYPE: 'topic' = 'topic';

let connection: AmqpChannelModel | null = null;
let channel: AmqpChannel | null = null;
let connecting: Promise<void> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

function getRabbitUrl(): string {
  const url = config.rabbitmqUrl;
  if (!url || url.trim() === '') {
    console.warn('[rabbitmq] RABBITMQ_URL not set. Falling back to amqp://localhost');
    return 'amqp://localhost';
  }
  return url;
}

async function establish(): Promise<void> {
  const url = getRabbitUrl();
  const conn = await amqp.connect(url);

  conn.on('error', (err) => {
    console.error('[rabbitmq] Connection error:', err);
  });

  conn.on('close', () => {
    console.warn('[rabbitmq] Connection closed. Scheduling reconnect...');
    scheduleReconnect();
  });

  const ch = await conn.createChannel();

  ch.on('error', (err) => {
    console.error('[rabbitmq] Channel error:', err);
  });

  ch.on('close', () => {
    console.warn('[rabbitmq] Channel closed. Scheduling reconnect...');
    scheduleReconnect();
  });

  // Ensure exchange exists
  await ch.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });

  connection = conn;
  channel = ch;
  reconnectAttempts = 0;
  console.log(`[rabbitmq] Connected and channel ready. Exchange '${EXCHANGE_NAME}' asserted.`);
}

function scheduleReconnect() {
  connection = null;
  channel = null;

  if (reconnectTimer) return;

  const delay = Math.min(30000, 1000 * Math.max(1, reconnectAttempts));
  reconnectAttempts += 1;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    try {
      console.log(`[rabbitmq] Attempting reconnect (#${reconnectAttempts})...`);
      await establish();
    } catch (err) {
      console.error('[rabbitmq] Reconnect attempt failed:', err);
      scheduleReconnect();
    }
  }, delay);
}

export async function connectRabbit(): Promise<void> {
  if (channel && connection) return;
  if (!connecting) {
    connecting = (async () => {
      try {
        await establish();
      } finally {
        connecting = null;
      }
    })();
  }
  return connecting;
}

export async function getRabbitConnection(): Promise<AmqpChannelModel> {
  if (!connection) {
    await connectRabbit();
  }
  if (!connection) throw new Error('RabbitMQ connection is not available');
  return connection;
}

export async function getRabbitChannel(): Promise<AmqpChannel> {
  if (!channel) {
    await connectRabbit();
  }
  if (!channel) throw new Error('RabbitMQ channel is not available');
  return channel;
}

export const RabbitMQ = {
  connect: connectRabbit,
  getConnection: getRabbitConnection,
  getChannel: getRabbitChannel,
  exchange: EXCHANGE_NAME,
};

export default RabbitMQ;
