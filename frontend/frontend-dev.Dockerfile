FROM node:14

# Set the working directory to /frontend
WORKDIR /frontend

ENV NODE_ENV development
ENV PATH /frontend/node_modules/.bin:$PATH

# Start a shell
CMD ["/bin/sh"]
