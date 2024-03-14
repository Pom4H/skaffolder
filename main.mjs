import { connect, JSONCodec } from 'nats';
import Application from './framework/application.mjs';
import ai from './test/ai.mjs';

// await new Promise((resolve) => setTimeout(resolve, 2000));

const NatsConnection = await connect({ servers: ['nats://localhost:4222'] });
const JetStreamManager = await NatsConnection.jetstreamManager();
const JetStreamClient = JetStreamManager.jetstream();

const intervals = [];
const timeouts = [];

const patch = (original, patch) => (...args) => patch(original(...args));

const sandbox = {
  ai,
  nats: NatsConnection,
  js: JetStreamClient,
  jsm: JetStreamManager,
  json: JSONCodec(),
  setInterval: patch(setInterval, (interval) => intervals.push(interval)),
  setTimeout: patch(setTimeout, (timeout) => timeouts.push(timeout)),
};

const beforeHook = async (req, next) => {
  // console.log('before request', req);
  req.age *= 2;
  // console.log('before', this);
  // for (const interval of intervals) clearInterval(interval);
  const reply = await next(req);
  // console.log('before reply', reply);
  return reply;
};

const afterHook = async (res) => {
  // console.log('after request', res);
  res.afterHook = true;
  return res;
};

const before = [
  ['domain/completion', beforeHook]
];

const after = [
  ['domain/completion', afterHook]
];

const tokens = new Map([
  ['foo', { userId: 'foo' }],
  ['bar', { userId: 'bar' }],
  ['buz', { userId: 'buz' }],
]);

const input = {
  http: {
    port: 3000,
    endpoints: ['api'],
    auth: (token) => tokens.get(token),
  },
  ws: {
    port: 8000,
    endpoints: ['api'],
  },
  // nats: {
  //   streams: [],
  //   subjects: [],
  //   consumers: [],
  //   producers: [],
  // }
};

const app = new Application({ sandbox, before, after, input });

app.ac.signal.onabort = () => {
  for (const interval of intervals) clearInterval(interval);
  for (const timeout of timeouts) clearTimeout(timeout);
};

const graceful = async () => {
  app.logger.warn('Graceful shutdown');
  await app.close();
  await NatsConnection.close();
};

process.once('SIGINT', graceful);
process.once('SIGTERM', graceful);

await app.start();
