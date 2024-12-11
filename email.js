const { SENDGRID_API_KEY } = require('./config');
const logger = require('./logger');

const templates = {
  VERIFY: 'd-04ac9be5b7fb430ba3e23b7d93115644',
};

const groups = {
  ACCOUNT_ALERTS: 29545,
  NOTIFICATIONS: 29552,
  NEWSLETTER: 29553,
};

// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs
const sgMail = require('@sendgrid/mail')
const sgClient = require('@sendgrid/client');
sgMail.setApiKey(SENDGRID_API_KEY)
sgClient.setApiKey(SENDGRID_API_KEY);

async function sendEmail(msg) {
  const { to } = msg;
  logger.info(`Sending email to ${to}...`);
  try {
    await sgMail.send(msg);
    logger.info('Email sent!');
  } catch (error) {
    logger.error(error);
  }
}

async function sendTemplateEmail(templateId, to, dynamicTemplateData, groupId, from='Archivium Team <contact@archivium.net>') {
  await sendEmail({
    to,
    from,
    templateId,
    dynamicTemplateData,
    asm: { groupId },
  });
}

async function unsubscribeUser(emails, groupId) {
  try {
    const [_, body] = await sgClient.request({
      method: 'POST',
      url: `/v3/asm/groups/${groupId}/suppressions`,
      body: {
        recipient_emails: emails
      },
    });
    logger.info(`User successfully unsubscribed from group: ${JSON.stringify(body)}`);
  } catch (error) {
    logger.error(`Error unsubscribing user: ${JSON.stringify(error.response ? error.response.body : error.message)}`);
  }
}

module.exports = {
  templates,
  groups,
  sendEmail,
  sendTemplateEmail,
  unsubscribeUser,
};
