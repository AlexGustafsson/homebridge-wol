# This Dockerfile runs the integration environment using Homebridge,
# Homebridge Config UI X and the latest maintenance LTS version of node

# Use the latest maintenance LTS version
FROM node:18-alpine

WORKDIR /etc/homebridge-wol

# Install dependencies
RUN apk add --update --no-cache sshpass openssh

# Copy over project files
COPY . .

EXPOSE 8080

# Run Homebridge on start
CMD ["npm", "run", "test"]
