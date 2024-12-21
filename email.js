const { DOMAIN, ADDR_PREFIX, DEV_MODE, SENDGRID_API_KEY } = require('./config');
const logger = require('./logger');
const api = require('./api');
const { executeQuery } = require('./api/utils');

const templates = {
  VERIFY: ['d-04ac9be5b7fb430ba3e23b7d93115644', 'verify'],
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

async function sendEmail(topic, msg) {
  const { to } = msg;
  logger.info(`Sending email to ${to}...`);
  if (DEV_MODE) {
    logger.warn('Email sending is disabled in test env.');
  }
  try {
    await sgMail.send(msg);
    logger.info('Email sent!');
    await executeQuery('INSERT INTO sentemail (recipient, topic, sent_at) VALUES (?, ?, ?);', [to, topic, new Date()]);
  } catch (error) {
    logger.error(error);
  }
}

async function sendTemplateEmail(template, to, dynamicTemplateData, groupId, from='Archivium Team <contact@archivium.net>') {
  const [templateId, topic] = template;
  await sendEmail(topic, {
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

async function sendVerifyLink({ id, username, email }) {
  await executeQuery('DELETE FROM userverification WHERE user_id = ?;', [id]);
  
  const verificationKey = await api.user.prepareVerification(id);
  if (DEV_MODE) {
    // Can't send emails in dev mode, just auto-verify them instead.
    await api.user.verifyUser(verificationKey);
    return true;
  }
  
  const verifyEmailLink = `https://${DOMAIN}${ADDR_PREFIX}/verify/${verificationKey}`;
  await sendTemplateEmail(templates.VERIFY, email, { username, verifyEmailLink }, groups.ACCOUNT_ALERTS);
  return false;
}

async function trySendVerifyLink(sessionUser, username) {
  if (!sessionUser) return [401];
  if (sessionUser.username != username) return [403];
  if (sessionUser.verified) return [200, { alreadyVerified: true }];

  const now = new Date();
  const timeout = 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - timeout);
  const recentEmails = await executeQuery(
    'SELECT * FROM sentemail WHERE recipient = ? AND topic = ? AND sent_at >= ? ORDER BY sent_at DESC;',
    [sessionUser.email, 'verify', cutoff],
  );
  if (recentEmails.length > 0) return [429, new Date(recentEmails[0].sent_at.getTime() + timeout)];

  const alreadyVerified = await sendVerifyLink(sessionUser);

  return [200, { alreadyVerified }];
}

module.exports = {
  templates,
  groups,
  sendEmail,
  sendTemplateEmail,
  unsubscribeUser,
  sendVerifyLink,
  trySendVerifyLink,
};
