const { ADDR_PREFIX } = require('./config');
const api = require('./api');
const { render } = require('./templates');

module.exports = function(app) {
  app.get(`${ADDR_PREFIX}/`, (req, res) => {
    const html = render(req, 'home', {});
    res.end(html);
  });

  
}