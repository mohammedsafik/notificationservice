const { createEmailSender } = require('../utils/emailSender');
const { loadAppConfig } = require('../utils/config');

async function main() {
  const config = loadAppConfig();
  const recipient = config.email.testRecipient || config.email.user;
  const emailSender = createEmailSender({
    host: config.email.host,
    port: config.email.port,
    user: config.email.user,
    pass: config.email.pass,
    from: config.email.from
  });

  const orderId = `TEST-${Date.now()}`;

  await emailSender.sendOrderStatusEmail({
    to: recipient,
    orderId,
    status: 'CONFIRMED',
    items: [
      { name: 'Test Item', quantity: 1 },
      { name: 'SMTP Check', quantity: 1 }
    ]
  });

  console.info(`[test-email] Test email completed for ${recipient} with order ${orderId}`);
}

main().catch((error) => {
  const details = [error.message, error.code, error.response].filter(Boolean).join(' | ');
  console.error(`[test-email] Failed to send test email: ${details}`);
  process.exitCode = 1;
});
