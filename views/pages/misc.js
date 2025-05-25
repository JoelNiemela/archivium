const api = require('../../api');
const { perms } = require('../../api/utils');
const fs = require('fs/promises');

module.exports = {
  /* Terms and Agreements */
  async privacyPolicy(_, res) {
    const content = (await fs.readFile('static/privacy_policy.md')).toString();
    res.prepareRender('docs', { content });
  },
  async termsOfService(_, res) {
    const content = (await fs.readFile('static/ToS.md')).toString();
    res.prepareRender('docs', { content });
  },
  async codeOfConduct(_, res) {
    const content = (await fs.readFile('static/code_of_conduct.md')).toString();
    res.prepareRender('docs', { content });
  },

  /* Help Pages */
  async markdownDemo(_, res) {
    const content = (await fs.readFile('static/markdown_demo.md')).toString();
    res.prepareRender('markdownDemo', { content });
  },

  /* Note pages */
  async notes(req, res) {
    const user = req.session.user;
    const [code, notes] = await api.note.getByUsername(user, user.username);
    const noteAuthors = { [user.id]: user };
    res.status(code);
    if (!notes) return;
    res.prepareRender('notes', {
      notes,
      noteAuthors,
      noteBaseRoute: `/api/users/${user.username}/notes`,
    });
  },

  /* Misc pages */
  async search(req, res) {
    const search = req.query.search;
    if (search) {
      const [code1, universes] = await api.universe.getMany(req.session.user, { strings: ['title LIKE ?'], values: [`%${search}%`] });
      res.status(code1);
      if (!universes) return;
      const [code2, itemsRaw] = await api.item.getMany(req.session.user, null, perms.READ, { search });
      res.status(code2);
      if (!itemsRaw) return;
      let notes, code3;
      if (req.session.user) {
        [code3, notes] = await api.note.getByUsername(req.session.user, req.session.user.username, null, { search });
        res.status(code3);
        if (!notes) return;
      }
      const matchedItems = {};
      for (const item of itemsRaw) {
        if (item.id in matchedItems) {
          matchedItems[item.id] = {...item, ...matchedItems[item.id]};
        } else {
          matchedItems[item.id] = item;
        }
      }
      const items = Object.values(matchedItems).sort((a, b) => a.updated_at < b.updated_at ? 1 : -1);
      res.prepareRender('search', {items, universes, notes: notes ?? [], search });
    } else {
      res.prepareRender('search', { items: [], universes: [], notes: [], search: '' });
    }
  },
};
