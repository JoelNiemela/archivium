require('dotenv').config();

const {
  PORT,
  DOMAIN,
  ADDR_PREFIX,
  DEV_MODE,
  SENDGRID_API_KEY,
  OPENAI_API_KEY,
  RECAPTCHA_KEY,
  ARCHIVIUM_DB_HOST,
  ARCHIVIUM_DB_USER,
  ARCHIVIUM_DB_PASSWORD,
  ARCHIVIUM_DB,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
} = process.env;

module.exports.PORT = Number(PORT);
module.exports.DOMAIN = DOMAIN;
module.exports.ADDR_PREFIX = ADDR_PREFIX;
module.exports.DEV_MODE = DEV_MODE === 'true';
module.exports.SENDGRID_API_KEY = SENDGRID_API_KEY;
module.exports.OPENAI_API_KEY = OPENAI_API_KEY;
module.exports.RECAPTCHA_KEY = RECAPTCHA_KEY;
module.exports.VAPID_PUBLIC_KEY = VAPID_PUBLIC_KEY;
module.exports.VAPID_PRIVATE_KEY = VAPID_PRIVATE_KEY;

module.exports.DB_CONFIG = {
  host: ARCHIVIUM_DB_HOST,
  user: ARCHIVIUM_DB_USER,
  password: ARCHIVIUM_DB_PASSWORD,
  database: ARCHIVIUM_DB,
};
