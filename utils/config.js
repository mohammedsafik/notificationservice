const path = require('path');

const { loadEnvFile } = require('./envLoader');

function readEnvValue(name) {
  const value = process.env[name];

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function getEnv(names, fallback) {
  for (const name of names) {
    const value = readEnvValue(name);

    if (value !== undefined) {
      return value;
    }
  }

  return fallback;
}

function getRequiredEnv(names, label = names[0]) {
  const value = getEnv(names);

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${label}`);
  }

  return value;
}

function getNumberEnv(names, fallback, label = names[0]) {
  const rawValue = getEnv(names);

  if (rawValue === undefined) {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${label}`);
  }

  return parsed;
}

function getCsvEnv(names, label = names[0]) {
  const rawValue = getRequiredEnv(names, label);
  const values = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new Error(`Environment variable ${label} must contain at least one value`);
  }

  return values;
}

function loadAppConfig() {
  loadEnvFile();

  const rootDir = path.join(__dirname, '..');
  const smtpUser = getRequiredEnv(['SMTP_USER', 'GMAIL_USER'], 'SMTP_USER');

  return {
    order: {
      serviceUrl: getRequiredEnv(['ORDER_SERVICE_URL']),
      protoPath: getEnv(
        ['ORDER_PROTO_PATH'],
        path.join(rootDir, 'proto', 'order.proto')
      )
    },
    kafka: {
      brokers: getCsvEnv(['KAFKA_BROKERS']),
      clientId: getRequiredEnv(['KAFKA_CLIENT_ID']),
      groupId: getRequiredEnv(['KAFKA_GROUP_ID']),
      topic: getRequiredEnv(['KAFKA_TOPIC']),
      retryDelayMs: getNumberEnv(['KAFKA_RETRY_DELAY_MS'], 5000)
    },
    email: {
      host: getRequiredEnv(['SMTP_HOST']),
      port: getNumberEnv(['SMTP_PORT', 'GMAIL_PORT'], 465, 'SMTP_PORT'),
      user: smtpUser,
      pass: getRequiredEnv(['SMTP_PASS', 'GMAIL_PASS'], 'SMTP_PASS'),
      from: getEnv(['EMAIL_FROM'], smtpUser),
      testRecipient: getEnv(['EMAIL_TEST_TO'])
    }
  };
}

module.exports = {
  loadAppConfig
};
