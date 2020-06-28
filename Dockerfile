# This Dockerfile runs the integration environment using Homebridge,
# Homebridge Config UI X and the latest maintaince LTS version of node
# Run with: docker run --rm -it -p 8080:8080 $(docker build -q .)

# Use the latest maintainance LTS version
FROM node:10

WORKDIR /etc/homebridge-wol

# Install dependencies
COPY package* ./
RUN npm install

# Copy application files
COPY . .

EXPOSE 8080

# Run Homebridge on start
CMD ["npm", "run", "test"]
