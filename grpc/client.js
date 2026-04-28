const path = require('path');

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { getOrderEmail, getOrderId, getOrderItems } = require('../utils/orderFields');

function loadOrderService(protoPath) {
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

  const descriptor = grpc.loadPackageDefinition(packageDefinition);

  if (descriptor?.OrderService) {
    return descriptor.OrderService;
  }

  if (descriptor?.order?.OrderService) {
    return descriptor.order.OrderService;
  }

  if (descriptor?.orderPackage?.OrderService) {
    return descriptor.orderPackage.OrderService;
  }

  if (descriptor?.order_service?.OrderService) {
    return descriptor.order_service.OrderService;
  }

  if (descriptor?.notification?.OrderService) {
    return descriptor.notification.OrderService;
  }

  if (descriptor?.proto?.OrderService) {
    return descriptor.proto.OrderService;
  }

  if (descriptor?.orderService) {
    return descriptor.orderService;
  }

  if (descriptor?.order?.orderService) {
    return descriptor.order.orderService;
  }

  if (descriptor?.Orderservice) {
    return descriptor.Orderservice;
  }

  if (descriptor?.order?.Orderservice) {
    return descriptor.order.Orderservice;
  }

  if (descriptor?.order?.service) {
    return descriptor.order.service;
  }

  if (descriptor?.service) {
    return descriptor.service;
  }

  if (descriptor?.order) {
    const candidateNames = Object.keys(descriptor.order);
    if (candidateNames.length === 1) {
      return descriptor.order[candidateNames[0]];
    }
  }

  const rootCandidates = Object.keys(descriptor);
  if (rootCandidates.length === 1) {
    return descriptor[rootCandidates[0]];
  }

  if (!descriptor?.OrderService && !descriptor?.order?.OrderService) {
    throw new Error(`OrderService definition not found in proto: ${protoPath}`);
  }
}

function createOrderClient({
  address,
  protoPath = path.join(__dirname, '..', 'proto', 'order.proto'),
  logger = console
}) {
  if (!address) {
    throw new Error('Order service address is required');
  }

  const OrderService = loadOrderService(protoPath);
  const client = new OrderService(address, grpc.credentials.createInsecure());

  function getOrderById(orderId) {
    return new Promise((resolve, reject) => {
      client.GetOrderById({ orderId }, (error, response) => {
        if (error) {
          const details = [error.message, error.code, error.details].filter(Boolean).join(' | ');
          logger.error(`[grpc] GetOrderById failed for order ${orderId}: ${details}`);
          reject(error);
          return;
        }

        const items = getOrderItems(response);
        const responseKeys = Object.keys(response || {});
        const summary = {
          orderId: getOrderId(response, orderId),
          email: getOrderEmail(response),
          itemsCount: items.length,
          keys: responseKeys
        };

        logger.info(
          `[grpc] GetOrderById succeeded for order ${orderId}: ${JSON.stringify(summary)}`
        );

        if (!summary.email) {
          logger.warn(
            `[grpc] GetOrderById response missing email for order ${summary.orderId}. Keys: ${responseKeys.join(', ')}`
          );
        }

        resolve(response);
      });
    });
  }

  return {
    getOrderById,
    close: () => client.close()
  };
}

module.exports = {
  createOrderClient
};
