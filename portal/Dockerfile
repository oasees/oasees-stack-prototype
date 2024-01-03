FROM node:21-alpine
WORKDIR /oasees_portal
COPY public/ /oasees_portal/public
COPY src/ /oasees_portal/src
COPY package.json /oasees_portal/package.json
COPY tsconfig.json /oasees_portal/tsconfig.json
COPY codux.config.json /oasees_portal/condux.config.json
RUN yarn install
