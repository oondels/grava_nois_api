import { getRabbitChannel, RabbitMQ } from './connection';

/**
 * Publica um evento de domínio relacionado a clips no exchange `grn.clips`.
 *
 * @param event - chave de roteamento (ex: 'clip.created')
 * @param message - payload para ser convertido em JSON e publicado
 * @returns boolean indicando se o buffer de escrita aceitou a mensagem
 */
export async function publishClipEvent(event: string, message: any): Promise<boolean> {
  try {
    const channel = await getRabbitChannel();
    const payload = Buffer.from(JSON.stringify(message));

    const ok = channel.publish(
      RabbitMQ.exchange,
      event,
      payload,
      {
        contentType: 'application/json',
        persistent: true,
        timestamp: Date.now(),
      }
    );

    if (ok) {
      console.log(`[rabbitmq] Published event '${event}' (${payload.length} bytes).`);
    } else {
      console.warn(`[rabbitmq] Publish returned false (buffer full) for event '${event}'.`);
    }
    return ok;
  } catch (err) {
    console.error(`[rabbitmq] Failed to publish event '${event}':`, err);
    return false;
  }
}

export default publishClipEvent;

