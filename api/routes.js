const { ADDR_PREFIX } = require('../config');
const Auth = require('../middleware/auth');
const api = require('./');

module.exports = function(app) {
  class APIRoute {
    constructor(path, methodFuncs, children) {
      this.path = path;
      this.methodFuncs = methodFuncs ?? {};
      this.children = children ?? [];
    }
  
    setup(parentPath) {
      const path = parentPath + this.path;
      app.options(path, async (req, res) => {
        res.setHeader('Access-Control-Allow-Methods', Object.keys(this.methodFuncs).join(','));
        return res.end();
      });
      app.all(path, Auth.verifySession, async (req, res) => {
        const method = req.method.toUpperCase();
        if (method in this.methodFuncs) {
          const [status, data] = await this.methodFuncs[method](req);
          if (data !== undefined) return res.json(data);
        } else {
          return res.sendStatus(405);
        }
        return res.end();
      })
      for (const child of this.children) {
        child.setup(path);
      }
    }
  }
  
  async function frmtData(promise, callback) {
    const [status, data] = await promise;
    return [status, callback(data)];
  }

  const apiRoutes = new APIRoute('/api', {}, [
    new APIRoute('/users', { GET: (req) => api.user.getMany() }, []),
    new APIRoute('/universes', { GET: (req) => api.universe.getMany(req.session.user) }, []),
  ]);

  apiRoutes.setup(ADDR_PREFIX);
}