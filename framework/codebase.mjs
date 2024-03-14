import { access, readFile, readdir, watch } from 'node:fs/promises';

const encoding = 'utf8';

class Codebase {
  constructor({ logger } = { logger: console }) {
    this.logger = logger;
    this.code = new Map();
  }

  async read(path, signal) {
    const files = await readdir(path, { encoding, recursive: true });
    for (const filename of files) {
      if (filename.endsWith('.mjs') || filename.endsWith('.js') || filename.endsWith('.json')) {
        const source = await readFile(`${path}/${filename}`, { signal, encoding });
        if (source.length === 0) continue;
        this.code.set(filename, source);
      }
    }
  }

  async watch(path, callback, signal) {
    try {
      for await (const { eventType, filename } of watch(path, { signal, encoding, recursive: true, persistent: false })) {
        // this.logger.debug(`File ${filename} has been ${eventType}`);
        try {
          await access(`${path}/${filename}`);
        } catch (err) {
          // console.error(err?.message);
          this.code.delete(filename);
          continue;
        }
        try {
          const source = await readFile(`${path}/${filename}`, { signal, encoding });
          if (source.length === 0) continue;
          this.code.set(filename, source);
          callback(filename, source);
        } catch (error) {
          // console.error(error?.code);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.warn('Aborted watching for changes');
      } else {
        this.logger.error(error);
      }
    }
  }
}

export default Codebase;
