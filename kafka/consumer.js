const { Kafka, logLevel } = require('kafkajs');
const { getEventType, getOrderId, SUPPORTED_EVENT_TYPES } = require('../utils/eventParser');

function parseMessage(message) {
  const rawValue = message?.value?.toString();

  if (!rawValue) {
    return null;
  }

  return JSON.parse(rawValue);
}

async function startInventoryConsumer({
  brokers,
  groupId,
  topic,
  clientId,
  onInventoryEvent,
  logger = console
}) {
  if (!Array.isArray(brokers) || brokers.length === 0) {
    throw new Error('Kafka brokers are required');
  }

  if (typeof onInventoryEvent !== 'function') {
    throw new Error('onInventoryEvent callback is required');
  }

  if (!topic) {
    throw new Error('Kafka topic is required');
  }

  if (!clientId) {
    throw new Error('Kafka clientId is required');
  }

  const kafka = new Kafka({
    clientId,
    brokers,
    logLevel: logLevel.NOTHING
  });

  const consumer = kafka.consumer({ groupId });

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ partition, message }) => {
      let event;

      try {
        event = parseMessage(message);
      } catch (error) {
        logger.error(`[kafka] Invalid message payload: ${error.message}`);
        return;
      }

      if (!event) {
        logger.warn('[kafka] Ignoring empty message');
        return;
      }

      const eventType = getEventType(event);
      const orderId = getOrderId(event);

      logger.info(
        `[kafka] Event received: ${eventType || 'UNKNOWN'}${orderId ? ` for order ${orderId}` : ''}`
      );

      if (!SUPPORTED_EVENT_TYPES.has(eventType)) {
        logger.warn(
          `[kafka] Ignoring unsupported event type: ${eventType}. Payload: ${JSON.stringify(event)}`
        );
        return;
      }

      try {
        await onInventoryEvent(event);
      } catch (error) {
        logger.error(
          `[kafka] Failed to process partition ${partition} message: ${error.message}`
        );
      }
    }
  });

  return consumer;
}

module.exports = {
  startInventoryConsumer
};
