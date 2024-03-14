import { AsyncLocalStorage } from 'node:async_hooks';
import { createContext, Script, SourceTextModule } from 'node:vm';

import skaffolder from './skaffolder.mjs';


class Runtime {
  constructor({ logger, sandbox } = { sandbox: {} }) {
    this.als = new AsyncLocalStorage();
    sandbox.als = this.als;
    this.scripts = new Map();
    this.modules = new Map();
    this.context = createContext(skaffolder(this.scripts, Object.assign(global, sandbox)));
    this.logger = logger;
  }

  load(code) {
    for (const [name, source] of code.entries()) {
      this.logger.debug(`Loading ${name}`);
      if (name.endsWith('.mjs')) {
        this.#loadModule(name.replace('.mjs', ''), source);
      } else if (name.endsWith('.js')) {
        this.#loadScript(name.replace('.js', ''), source);
      } else if (name.endsWith('.json')) {
        this.#loadJson(name.replace('.json', ''), source);
      }
    }
  }

  reload(filename, code) {
    // this.logger.debug(`Reloading ${filename}`);
    if (filename.endsWith('.mjs')) {
      const identifier = filename.replace('.mjs', '');
      this.#loadModule(identifier, code);
      this.#runModule(this.modules.get(identifier));
    } else if (filename.endsWith('.js')) {
      const identifier = filename.replace('.js', '');
      this.#loadScript(identifier, code);
      this.#runScript(identifier, this.scripts.get(identifier));
    } else if (filename.endsWith('.json')) {
      this.#loadJson(filename.replace('.json', ''), code);
    }
  }

  #loadModule(identifier, code, context = this.context) {
    this.modules.set(identifier, new SourceTextModule(code, { identifier, context }));
  }

  #loadScript(filename, code) {
    this.scripts.set(filename, new Script(code, { filename }));
  }

  #loadJson(filename, code) {
    this.scripts.set(filename, JSON.parse(code));
  }

  async start() {
    for (const [name, script] of this.scripts.entries()) this.#runScript(name, script);
    for (const module of this.modules.values()) await this.#runModule(module);
  }

  #linkModule(specifier) {
    if (this.modules.has(specifier)) {
      return this.modules.get(specifier);
    }
    throw new Error(`Unable to resolve dependency: ${specifier}`);
  }

  /** @param {SourceTextModule} module */
  async #runModule(module) {
    await module.link(this.#linkModule);
    module.evaluate();
  }

  /** @param {Script} script */
  #runScript(name, script) {
    this.scripts.set(name, script.runInContext(this.context));
  }
}

export default Runtime;
