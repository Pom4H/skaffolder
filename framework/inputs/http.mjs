import { createServer } from 'node:http';

class HttpInput {
  constructor({ endpoints, port, auth }) {
    this.auth = auth;
    this.port = port;
    this.endpoints = endpoints;
    this.cache = new Map();
    this.server = createServer();
  }

  link(scripts) {
    for (const endpoint of this.endpoints) {
      for (const script of scripts.keys()) {
        if (script.startsWith(endpoint)) {
          this.cache.set(`/${script}`, scripts.get(script));
        }
      }
    }
  }

  async start(asyncLocalStorage) {
    this.server.on('request', async (req, res) => {
      if (this.auth) {
        const user = await this.auth(req.headers.token);
        if (!user) {
          res.writeHead(403);
          res.write('Unauthorized\n');
          res.end();
          return;
        }
        asyncLocalStorage.enterWith(user);
      }
      if (!this.cache.has(req.url)) {
        res.writeHead(404);
        res.write('Not Found\n');
        res.end();
        return;
      }
      try {
        const script = this.cache.get(req.url);
        let body = '';
        for await (const chunk of req) body += chunk;
        const args = body ? JSON.parse(body) : {};
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(await script(args)));
      } catch (error) {
        console.error(error);
        res.writeHead(500);
        res.write(error.message);
      } finally {
        res.end();
      }
    }).listen(this.port);
  }

  async close() {
    this.server.close();
  }
}

export default HttpInput;
