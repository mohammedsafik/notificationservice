const express = require('express');

const { startInventoryConsumer } = require('./kafka/consumer');
const { createOrderClient } = require('./grpc/client');
const { createNotificationService } = require('./services/notificationService');
const { createEmailSender } = require('./utils/emailSender');
const { loadAppConfig } = require('./utils/config');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startConsumerWithRetry(options, retryDelayMs) {
  while (true) {
    try {
      const consumer = await startInventoryConsumer(options);
      console.info('[app] Kafka consumer started');
      return consumer;
    } catch (error) {
      console.error(
        `[app] Kafka startup failed: ${error.message}. Retrying in ${retryDelayMs}ms`
      );
      await wait(retryDelayMs);
    }
  }
}

async function main() {
  const config = loadAppConfig();

  // 🔹 gRPC client
  const orderClient = createOrderClient({
    address: config.order.serviceUrl,
    protoPath: config.order.protoPath
  });

  // 🔹 Email sender
  const emailSender = createEmailSender({
    host: config.email.host,
    port: config.email.port,
    user: config.email.user,
    pass: config.email.pass,
    from: config.email.from
  });

  // 🔹 Notification service
  const notificationService = createNotificationService({
    orderClient,
    emailSender,
    fallbackRecipientEmail: config.email.testRecipient
  });

  // 🔥 Start Kafka consumer
  const consumer = await startConsumerWithRetry(
    {
      brokers: config.kafka.brokers,
      clientId: config.kafka.clientId,
      groupId: config.kafka.groupId,
      topic: config.kafka.topic,
      onInventoryEvent: notificationService.handleInventoryEvent
    },
    config.kafka.retryDelayMs
  );

  console.info('[app] Notification service is running');

  // ✅ Health server (keeps process alive + useful for DevOps)
  const app = express();

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const server = app.listen(3000, () => {
    console.info('[app] Health server running on port 3000');
  });

  // ✅ Graceful shutdown
  const shutdown = async (signal) => {
    console.info(`[app] Received ${signal}, shutting down`);

    try {
      await consumer.disconnect();
      console.info('[app] Kafka consumer disconnected');
    } catch (error) {
      console.error(`[app] Kafka disconnect failed: ${error.message}`);
    }

    try {
      orderClient.close();
      console.info('[app] gRPC client closed');
    } catch (error) {
      console.error(`[app] gRPC client close failed: ${error.message}`);
    }

    try {
      server.close(() => {
        console.info('[app] HTTP server closed');
        process.exit(0);
      });
    } catch (error) {
      console.error(`[app] Server close failed: ${error.message}`);
      process.exit(1);
    }
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(`[app] Failed to start service: ${error.message}`);
  process.exit(1);
});