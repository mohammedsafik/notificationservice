const SUPPORTED_EVENT_TYPES = new Set(['INVENTORY_RESERVED', 'OUT_OF_STOCK']);

const EVENT_TYPE_ALIASES = {
  INVENTORY_RESERVED: 'INVENTORY_RESERVED',
  RESERVED: 'INVENTORY_RESERVED',
  CONFIRMED: 'INVENTORY_RESERVED',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  OUTOFSTOCK: 'OUT_OF_STOCK',
  CANCELLED: 'OUT_OF_STOCK',
  CANCELED: 'OUT_OF_STOCK'
};

function normalizeCandidate(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return String(value).trim().replace(/[\s-]+/g, '_').toUpperCase();
}

function getEventType(event) {
  const candidates = [
    event?.type,
    event?.eventType,
    event?.event,
    event?.status,
    event?.inventoryStatus,
    event?.data?.type,
    event?.data?.eventType,
    event?.data?.event,
    event?.data?.status,
    event?.data?.inventoryStatus,
    event?.payload?.type,
    event?.payload?.eventType,
    event?.payload?.event,
    event?.payload?.status,
    event?.payload?.inventoryStatus
  ];

  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate);

    if (!normalized) {
      continue;
    }

    if (EVENT_TYPE_ALIASES[normalized]) {
      return EVENT_TYPE_ALIASES[normalized];
    }

    if (SUPPORTED_EVENT_TYPES.has(normalized)) {
      return normalized;
    }
  }

  return undefined;
}

function getOrderId(event) {
  return (
    event?.orderId ||
    event?.orderID ||
    event?.data?.orderId ||
    event?.data?.orderID ||
    event?.payload?.orderId ||
    event?.payload?.orderID
  );
}

module.exports = {
  getEventType,
  getOrderId,
  SUPPORTED_EVENT_TYPES
};
