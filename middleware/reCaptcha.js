const Promise = require('bluebird');
const axios = require('axios');
const api = require('../api');
const { ADDR_PREFIX, RECAPTCHA_KEY } = require('../config');
const logger = require('../logger');

module.exports.verifyReCaptcha = async (req, res, next) => {
  const reCaptchaResponse = req.body && req.body['g-recaptcha-response'];
  const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
    params: {
      secret: RECAPTCHA_KEY,
      response: reCaptchaResponse,
      remoteip: req.clientIp,
    }
  });
  const score = response.data.success ? response.data.score : 0;
  logger.info(`reCAPTCHA SCORE: ${score}`);
  if (score > 0.5) {
    next();
  } else {
    logger.warn(`Likely bot detected! IP: ${req.clientIp}`);
    if (req.body && req.body.hp) {
      logger.warn('Bot also failed honeypot challenge.');
    }
    res.status(400);
    res.end('This request has been blocked by our anti-spam system. If you believe this is an error, please report it by sending an email to contact@archivium.net.');
  }
}
