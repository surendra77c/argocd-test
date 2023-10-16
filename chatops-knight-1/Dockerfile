# Check out https://hub.docker.com/_/node to select a new base image
FROM node:10-alpine

RUN apk add --no-cache --update bash ca-certificates curl

# Set to a non-root built-in user `node`
USER node

# Create app directory (with user `node`)
RUN mkdir -p /home/node/app

WORKDIR /home/node/app

COPY --chown=node lib/msutils-1.0.0.tgz ./lib/

COPY --chown=node ssl/development/*.pem ./ssl/development/
COPY --chown=node ssl/production/*.pem ./ssl/production/


# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY --chown=node package*.json ./

RUN npm install

# Bundle app source code
COPY --chown=node . .

RUN npm run build

# Bind to all network interfaces so that it can be mapped to the host OS
ENV HOST=0.0.0.0 PORT=3000

EXPOSE ${PORT}
CMD [ "node", "." ]

HEALTHCHECK --interval=120s --timeout=10s --start-period=180s --retries=5 CMD ./healthcheck.sh || exit 1