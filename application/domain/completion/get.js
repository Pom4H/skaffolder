({ age }) => {
  const user = als.getStore();
  return { ...user, age };
};
