() => {
  const info = {};
  for (const endpoint of Object.keys(api)) {
    info[endpoint] = api[endpoint].toString();
  }
  return info;
};
