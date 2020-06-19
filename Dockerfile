FROM node:14

# Set the working directory to /ratio/backend
WORKDIR /ratio/backend

ENV NODE_ENV production
ENV PATH /ratio/backend/node_modules/.bin:$PATH

COPY ./db /ratio/backend/db
COPY ./routes /ratio/backend/routes
COPY ./scripts /ratio/backend/scripts
COPY ./views /ratio/backend/views
COPY ./app.js /ratio/backend/app.js
COPY ./config.js /ratio/backend/config.js
COPY ./package.json /ratio/backend/package.json
COPY ./package-lock.json /ratio/backend/package-lock.json
COPY ./utils.js /ratio/backend/utils.js

# Install all production-required node packages
RUN npm ci --only=production

# The backend runs on port 4444
EXPOSE 4444

# Start the development server
CMD ["npm", "run", "start"]
