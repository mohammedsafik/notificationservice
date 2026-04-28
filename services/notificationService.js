const { getEventType, getOrderId } = require('../utils/eventParser');
const {
  getOrderEmail,
  getOrderId: getOrderIdFromPayload,
  getOrderItems: getItemsFromPayload,
  pickFirstText
} = require('../utils/orderFields');

const EVENT_STATUS_MAP = {
  INVENTORY_RESERVED: 'CONFIRMED',
  OUT_OF_STOCK: 'CANCELLED'
};

function getRecipientEmail(order, event, fallbackRecipientEmail, resolvedOrderId, logger) {
  const recipientEmail = pickFirstText(
    getOrderEmail(order),
    getOrderEmail(event),
    getOrderEmail(event?.data),
    getOrderEmail(event?.payload)
  );

  if (recipientEmail) {
    return recipientEmail;
  }

  if (fallbackRecipientEmail) {
    logger.warn(
      `[notification] Email missing for order ${resolvedOrderId}; using fallback test email ${fallbackRecipientEmail}`
    );
    return fallbackRecipientEmail;
  }

  return undefined;
}

function getResolvedOrderId(order, fallbackOrderId) {
  return getOrderIdFromPayload(order, fallbackOrderId);
}

function getOrderItems(order, event) {
  const orderItems = getItemsFromPayload(order);

  if (orderItems.length > 0) {
    return orderItems;
  }

  const eventItems = getItemsFromPayload(event);

  if (eventItems.length > 0) {
    return eventItems;
  }

  const eventDataItems = getItemsFromPayload(event?.data);

  if (eventDataItems.length > 0) {
    return eventDataItems;
  }

  const eventPayloadItems = getItemsFromPayload(event?.payload);

  if (eventPayloadItems.length > 0) {
    return eventPayloadItems;
  }

  return [];
}

function createNotificationService({
  orderClient,
  emailSender,
  fallbackRecipientEmail,
  logger = console
}) {
  async function handleInventoryEvent(event) {
    const eventType = getEventType(event);
    const status = EVENT_STATUS_MAP[eventType];
    const orderId = getOrderId(event);

    if (!status) {
      logger.warn(`[notification] No notification mapping for event type: ${eventType}`);
      return;
    }

    if (!orderId) {
      logger.error('[notification] Event missing orderId');
      return;
    }

    try {
      const order = await orderClient.getOrderById(orderId);
      const resolvedOrderId = getResolvedOrderId(order, orderId);
      const recipientEmail = getRecipientEmail(
        order,
        event,
        fallbackRecipientEmail,
        resolvedOrderId,
        logger
      );
      const items = getOrderItems(order, event);

      if (!recipientEmail) {
        logger.error(
          `[notification] No recipient email found for order ${resolvedOrderId}. Response keys: ${Object.keys(
            order || {}
          ).join(', ')}`
        );
        return;
      }

      await emailSender.sendOrderStatusEmail({
        to: recipientEmail,
        orderId: resolvedOrderId,
        status,
        items
      });
    } catch (error) {
      logger.error(`[notification] Failed to handle order ${orderId}: ${error.message}`);
    }
  }

  return {
    handleInventoryEvent
  };
}

module.exports = {
  createNotificationService
};
