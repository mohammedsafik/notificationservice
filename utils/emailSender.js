const nodemailer = require('nodemailer');

const SUBJECT_BY_STATUS = {
  CONFIRMED: 'Order Successful',
  CANCELLED: 'Order Cancelled'
};

function formatItemsSummary(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'No items available.';
  }

  return items
    .map((item, index) => {
      const label = item.name || item.sku || `Item ${index + 1}`;
      const quantity = item.quantity || 0;
      return `- ${label} x ${quantity}`;
    })
    .join('\n');
}

function createEmailSender({
  user,
  pass,
  from = user,
  host,
  port = 465,
  logger = console
}) {
  if (!host) {
    throw new Error('SMTP host is required');
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: {
      user,
      pass
    }
  });

  async function sendOrderStatusEmail({ to, orderId, status, items }) {
    const subject = SUBJECT_BY_STATUS[status] || 'Order Update';
    const text = [
      'Hello,',
      '',
      'Your order status has been updated.',
      `Order ID: ${orderId}`,
      `Status: ${status}`,
      '',
      'Items summary:',
      formatItemsSummary(items)
    ].join('\n');

    await transporter.sendMail({
      from,
      to,
      subject,
      text
    });

    logger.info(`[email] Email sent to ${to} for order ${orderId}`);
  }

  return {
    sendOrderStatusEmail
  };
}

module.exports = {
  createEmailSender
};
