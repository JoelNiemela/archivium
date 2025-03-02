const { executeQuery, parseData } = require('../utils');
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = require('../../config');
const userapi = require('./user');
const logger = require('../../logger');
const md5 = require('md5');
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:contact@archivium.net',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

async function getOne(user, endpoint) {
  const endpointHash = md5(endpoint);

  try {
    const subscription = (await executeQuery('SELECT * FROM notificationsubscription WHERE user_id = ? AND endpoint_hash = ?', [user.id, endpointHash]))[0];
    return [200, subscription];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function getByEndpoint(endpoint) {
  const endpointHash = md5(endpoint);

  try {
    const subscription = (await executeQuery('SELECT * FROM notificationsubscription WHERE endpoint_hash = ?', [endpointHash]))[0];
    return [200, subscription];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function getByUser(user) {
  try {
    const subscriptions = await executeQuery('SELECT * FROM notificationsubscription WHERE user_id = ?', [user.id]);
    return [200, subscriptions];
  } catch (err) {
    logger.error(err);
    return [500];
  }
}

async function isSubscribed(user, subscriptionData) {
  const { endpoint } = subscriptionData;
  if (!endpoint || !user) return [200, false];
  const [_, subscription] = await getByEndpoint(endpoint);
  return [200, Boolean(subscription && subscription.user_id === user.id)];
}

async function subscribe(user, subscriptionData) {
  if (!user) return [401];
  const { endpoint, keys } = subscriptionData;
  if (!endpoint || !keys) return [400];
  const [code, subscription] = await getByEndpoint(endpoint);
  if (code !== 200) return [code, subscription];
  const endpointHash = md5(endpoint);
  if (!subscription) {
    await executeQuery('INSERT INTO notificationsubscription (user_id, endpoint_hash, push_endpoint, push_keys) VALUES (?, ?, ?, ?)', [
      user.id,
      endpointHash,
      endpoint,
      keys,
    ]);
    logger.info(`New subscription added for ${user.username}`);
  } else if (subscription.user_id !== user.id) {
    await executeQuery('UPDATE notificationsubscription SET user_id = ? WHERE endpoint_hash = ?', [user.id, endpointHash]);
    logger.info(`Subscription user changed to ${user.username}`);
  } else {
    logger.info(`Duplicate subscription ignored for ${user.username}`);
  }
  return [201, endpointHash];
}

async function unsubscribe(user, subscriptionData) {
  if (!user) return [401];
  const { endpoint, keys } = subscriptionData;
  if (!endpoint || !keys) return [400];
  const [code, subscription] = await getByEndpoint(endpoint);
  if (code !== 200) return [code, subscription];
  if (subscription && subscription.user_id === user.id) {
    const endpointHash = md5(endpoint);
    await executeQuery('DELETE FROM notificationsubscription WHERE user_id = ? AND endpoint_hash = ?', [user.id, endpointHash]);
    logger.info(`Unsubscribed ${user.username}`);
    return [200];
  } else {
    return [404];
  }
}

async function notify(target, message) {
  const { title, body, icon, actions } = message;
  if (!title || !body) return [400];

  const payload = JSON.stringify({ title, body, icon, actions });
  const [code, subscriptions] = await getByUser(target);
  if (!subscriptions) return [code];
  for (const { push_endpoint, push_keys } of subscriptions) {
    webpush.sendNotification({ endpoint: push_endpoint, keys: push_keys }, payload).catch(err => {
      logger.error('Push error:', err);
      // subscriptions.splice(index, 1); // Remove invalid subscriptions
    });
  }

  return [200, true];
}

module.exports = {
  isSubscribed,
  subscribe,
  unsubscribe,
  notify,
};