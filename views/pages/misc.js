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
      const [code2, items] = await api.item.getMany(req.session.user, null, perms.READ, { search });
      const code = code1 !== 200 ? code1 : code2;
      res.status(code);
      if (code !== 200) return;
      res.prepareRender('search', { items, universes, search });
    } else {
      res.prepareRender('search', { items: [], universes: [], search: '' });
    }
  },
};
