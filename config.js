require('dotenv').config();

const { PORT, DOMAIN, ADDR_PREFIX, DEV_MODE, SENDGRID_API_KEY, OPENAI_API_KEY } = process.env;

module.exports.PORT = Number(PORT);
module.exports.DOMAIN = DOMAIN;
module.exports.ADDR_PREFIX = ADDR_PREFIX;
module.exports.DEV_MODE = Boolean(DEV_MODE);
module.exports.SENDGRID_API_KEY = SENDGRID_API_KEY;
module.exports.OPENAI_API_KEY = OPENAI_API_KEY;
