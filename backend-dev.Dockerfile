FROM node:14

# Set the working directory to /app
WORKDIR /app

ENV NODE_ENV development
ENV PATH /app/node_modules/.bin:$PATH

# The backend runs on port 4444
EXPOSE 4444

# Start the development server
CMD ["npm", "run", "entrypoint-dev"]
