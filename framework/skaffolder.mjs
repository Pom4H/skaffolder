const skaffold = (scripts, target, proxy, prop) => {
  if (target[prop]) {
    return target[prop];
  } else if (scripts.has(prop)) {
    return scripts.get(prop);
  } else if ([...scripts.keys()].some((key) => key.startsWith(prop))) {
    return proxy(scripts, Object.fromEntries([...scripts.entries()]
      .filter(([key]) => key.startsWith(prop))
      .map(([key, value]) => [key.split('/').slice(1).join('/'), value])), prop);
  } else {
    throw new Error(`Unable to resolve dependency: ${prop}`);
  }
};

const proxy = (scripts, target = {}, path) => new Proxy(target, {
  get(target, prop) {
    if (prop === Symbol.iterator) {
      return function* () {
        for (const [key, value] of scripts.entries()) {
          if (key.startsWith(path)) yield value;
        }
      };
    }
    if (!path) return skaffold(scripts, target, proxy, prop);
    return skaffold(scripts, target, proxy, `${path}/${prop}`);
  },
  set(target, prop, value) {
    if (path) {
      scripts.set(`${path}/${prop}`, value);
    } else {
      scripts.set(prop, value);
    }
    return true;
  }
});

export default proxy;
