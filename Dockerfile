FROM node:12
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
EXPOSE 1883
CMD ["npm", "run", "start-docker"]