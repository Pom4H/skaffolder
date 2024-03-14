import Codebase from './codebase.mjs';
import Runtime from './runtime.mjs';
import Input from './input.mjs';


class Application {
  constructor({ sandbox, before, after, input } = {}) {
    this.path = './application';
    const logger = console;
    this.sandbox = sandbox;
    this.logger = logger;
    this.ac = new AbortController();
    this.codebase = new Codebase({ logger });
    this.input = new Input(input);
    this.runtime = new Runtime({ logger, sandbox });
    this.before = before || [];
    this.after = after || [];
  }

  async start() {
    await this.codebase.read(this.path, this.ac.signal);

    this.runtime.load(this.codebase.code);
    await this.runtime.start();

    this.input.link(this.runtime.scripts);
    await this.input.start(this.runtime.als);

    for (const [hook, fn] of this.before) {
      for (const name of this.runtime.scripts.keys()) {
        if (name.startsWith(hook)) {
          const target = this.runtime.context[name];
          this.runtime.context[name] = (args) => fn(args, target);
        }
      }
    }

    for (const [hook, fn] of this.after) {
      for (const name of this.runtime.scripts.keys()) {
        if (name.startsWith(hook)) {
          const target = this.runtime.context[name];
          this.runtime.context[name] = async (args) => fn(await target(args));
        }
      }
    }

    this.logger.info('Application started');

    return await this.codebase.watch(
      this.path,
      (filename, source) => {
        this.runtime.reload(filename, source);
        this.input.link(this.runtime.scripts);
      },
      this.ac.signal
    );
  }

  async close() {
    await this.input.close();
    this.ac.abort();
  }
}

export default Application;
