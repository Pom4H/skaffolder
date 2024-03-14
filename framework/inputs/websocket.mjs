class WebSocketInput {
  constructor({ endpoints, port }) {
    this.port = port;
    this.endpoints = endpoints;
    this.cache = new Map();
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

  start() {}

  close() {}
}

export default WebSocketInput;
