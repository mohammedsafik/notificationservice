function pickFirstText(...values) {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

function getOrderId(order, fallbackOrderId) {
  return (
    pickFirstText(
      order?.orderId,
      order?.order_id,
      order?.id,
      order?.data?.orderId,
      order?.data?.order_id,
      order?.payload?.orderId,
      order?.payload?.order_id
    ) || fallbackOrderId
  );
}

function getOrderEmail(order) {
  return pickFirstText(
    order?.customerEmail,
    order?.customer_email,
    order?.email,
    order?.userEmail,
    order?.user_email,
    order?.customer?.email,
    order?.customer?.customerEmail,
    order?.user?.email,
    order?.user?.userEmail,
    order?.recipient?.email,
    order?.contact?.email,
    order?.shippingAddress?.email
  );
}

function getOrderItems(order) {
  if (Array.isArray(order?.items)) {
    return order.items;
  }

  if (Array.isArray(order?.orderItems)) {
    return order.orderItems;
  }

  if (Array.isArray(order?.order_items)) {
    return order.order_items;
  }

  if (Array.isArray(order?.lineItems)) {
    return order.lineItems;
  }

  if (Array.isArray(order?.data?.items)) {
    return order.data.items;
  }

  if (Array.isArray(order?.payload?.items)) {
    return order.payload.items;
  }

  return [];
}

module.exports = {
  getOrderEmail,
  getOrderId,
  getOrderItems,
  pickFirstText
};
