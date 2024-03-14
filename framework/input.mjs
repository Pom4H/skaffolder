import HttpInput from './inputs/http.mjs';
import WebSocketInput from './inputs/websocket.mjs';

class Input {
  constructor(config) {
    this.inputs = {};
    for (const key in config) {
      if (!this[key]) throw new Error(`Incompatible input: ${key}`);
      this.inputs[key] = new this[key](config[key]);
    }
  }

  get http() {
    return HttpInput;
  }

  get ws() {
    return WebSocketInput;
  }

  link(scripts = new Map()) {
    for (const type in this.inputs) {
      this.inputs[type].link(scripts);
    }
  }

  async start(asyncLocalStorage) {
    for (const type in this.inputs) {
      await this.inputs[type].start(asyncLocalStorage);
    }
  }

  async close() {
    for (const type in this.inputs) {
      await this.inputs[type].close();
    }
  }
}

export default Input;
