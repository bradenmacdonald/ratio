# Production Dockerfile that hosts the compiled frontend

# First, create a build environment for transpilation
FROM node:14 AS build
ENV NODE_ENV production
# Set the working directory to /ratio/frontend
WORKDIR /ratio/frontend
# Copy the source files into the container
COPY . /ratio/frontend
# Install node modules (all / development mode)
RUN npm ci
# Transpile and build the app
RUN npm run build-public


# Now, build a container to serve the transpiled files
FROM nginx:stable-alpine
COPY --from=build /ratio/frontend/dist /usr/share/nginx/html
COPY nginx-prod.conf /etc/nginx/conf.d/default.conf
