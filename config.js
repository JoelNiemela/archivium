require('dotenv').config();

const {
  PORT,
  DOMAIN,
  ADDR_PREFIX,
  DEV_MODE,
  SENDGRID_API_KEY,
  OPENAI_API_KEY,
  ARCHIVIUM_DB_HOST,
  ARCHIVIUM_DB_USER,
  ARCHIVIUM_DB_PASSWORD,
  ARCHIVIUM_DB,
} = process.env;

module.exports.PORT = Number(PORT);
module.exports.DOMAIN = DOMAIN;
module.exports.ADDR_PREFIX = ADDR_PREFIX;
module.exports.DEV_MODE = Boolean(DEV_MODE);
module.exports.SENDGRID_API_KEY = SENDGRID_API_KEY;
module.exports.OPENAI_API_KEY = OPENAI_API_KEY;

module.exports.DB_CONFIG = {
  host: ARCHIVIUM_DB_HOST,
  user: ARCHIVIUM_DB_USER,
  password: ARCHIVIUM_DB_PASSWORD,
  database: ARCHIVIUM_DB,
};
