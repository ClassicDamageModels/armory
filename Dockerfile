FROM node:8.14.1-alpine

RUN mkdir -p /usr/src/app
RUN mkdir /usr/src/app/upload
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install -g yarn
RUN npm install -g babel-cli
RUN yarn install
COPY ./src /usr/src/app/src

COPY ./.babelrc /usr/src/app
COPY ./.env /usr/src/app

EXPOSE 4444

CMD ["npm", "start"]
