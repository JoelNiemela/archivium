const { ADDR_PREFIX, DEV_MODE } = require('../../config');
const Auth = require('../../middleware/auth');
const api = require('../../api');
const md5 = require('md5');
const { render, universeLink } = require('../../templates');
const { perms, Cond, getPfpUrl } = require('../../api/utils');
const fs = require('fs/promises');
const logger = require('../../logger');

module.exports = {
  async list(req, res) {
    const [code, universes] = await api.universe.getMany(req.session.user);
    res.status(code);
    if (!universes) return;
    res.prepareRender('universeList', { universes });
  },
  
  async create(_, res) {
    res.prepareRender('createUniverse');
  },
  
  async view(req, res) {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    res.status(code1);
    if (!universe) return;
    const [code2, authors] = await api.user.getByUniverseShortname(req.session.user, universe.shortname);
    res.status(code2);
    if (!authors) return;
    const authorMap = {};
    authors.forEach(author => {
      authorMap[author.id] = {
        ...author,
        pfpUrl: getPfpUrl(author),
      };
    });
    const [code3, threads] = await api.discussion.getThreads(req.session.user, { 'discussion.universe_id': universe.id }, false, true);
    if (!threads) return [code3];
    res.prepareRender('universe', { universe, authors: authorMap, threads });
  },

  async delete(req, res) {
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname }, perms.ADMIN);
    res.status(code);
    if (!universe) return res.redirect(`${ADDR_PREFIX}/universes`);
    res.prepareRender('deleteUniverse', { universe });
  },

  async edit(req, res) {
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname }, perms.WRITE);
    res.status(code);
    if (!universe) return;
    res.prepareRender('editUniverse', { universe });
  },
 
  async createDiscussionThread(req, res) {
    const [code, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname }, perms.READ);
    if (!universe) return res.status(code);
    if (!universe.discussion_enabled) return res.status(403);
    if (!universe.discussion_open && universe.author_permissions[req.session.user.id] < perms.COMMENT) return res.status(403);
    res.status(code);
    if (code !== 200) return;
    res.prepareRender('createUniverseThread', { universe });
  },
  
  async discussionThread(req, res) {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    res.status(code1);
    if (code1 !== 200) return;
    const [code2, threads] = await api.discussion.getThreads(req.session.user, {
      'discussion.id': req.params.threadId,
      'universe.id': universe.id,
    });
    res.status(code2);
    if (!threads) return;
    if (threads.length === 0) return res.status(404);
    const thread = threads[0];
    if (!thread) return;
    const [code3, comments, users] = await api.discussion.getCommentsByThread(req.session.user, thread.id, false, true);
    res.status(code3)
    if (!comments || !users) return;
    const commenters = {};
    for (const user of users) {
      user.pfpUrl = getPfpUrl(user);
      delete user.email;
      commenters[user.id] = user;
    }
    
    res.prepareRender('universeThread', { 
      universe, thread, comments, commenters,
      commentAction: `${universeLink(req, universe.shortname)}/discuss/${thread.id}/comment`,
    });
  },

  async itemList(req, res) {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname });
    const [code2, items] = await api.item.getByUniverseShortname(req.session.user, req.params.shortname, perms.READ, {
      sort: req.query.sort,
      sortDesc: req.query.sort_order === 'desc',
      limit: req.query.limit,
      type: req.query.type,
      tag: req.query.tag,
    });
    const code = code1 !== 200 ? code1 : code2;
    res.status(code);
    if (code !== 200) return;
    res.prepareRender('universeItemList', {
      items: items.map(item => ({ ...item, itemTypeName: ((universe.obj_data.cats ?? {})[item.item_type] ?? ['missing_cat'])[0] })),
      universe,
      type: req.query.type,
      tag: req.query.tag,
    });
  },

  async editPerms(req, res) {
    const [code1, universe] = await api.universe.getOne(req.session.user, { shortname: req.params.shortname }, perms.ADMIN);
    const [code2, users] = await api.user.getMany();
    const [code3, contacts] = await api.contact.getAll(req.session.user, false);
    const code = code1 !== 200 ? code1 : (code2 !== 200 ? code2 : code3);
    res.status(code);
    if (code !== 200) return;
    contacts.forEach(contact => {
      if (!(contact.id in universe.authors)) {
        universe.authors[contact.id] = contact.username;
        universe.author_permissions[contact.id] = perms.NONE;
      }
    });
    res.prepareRender('editUniversePerms', { universe, users });
  },
};
