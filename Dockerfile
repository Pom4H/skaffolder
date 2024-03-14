FROM node:21-alpine AS modules

WORKDIR /app

RUN chown -R node:node /app

USER node

COPY --chown=node:node *.json ./

RUN npm ci --omit=dev

FROM modules AS application

COPY --from=modules --chown=node:node /app/node_modules node_modules
COPY --from=modules --chown=node:node *.json ./

COPY --chown=node:node application application
COPY --chown=node:node framework framework
COPY --chown=node:node *.mjs ./

ENV NODE_ENV production

CMD ["node", "--experimental-vm-modules", "main.mjs"]
