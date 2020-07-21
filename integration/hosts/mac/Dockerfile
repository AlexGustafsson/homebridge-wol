# This Dockerfile acts as a Mac device on the network.

FROM alpine:3

WORKDIR /etc/homebridge-wol

# Install dependencies and add a user "user" with the password "user"
RUN apk add --update --no-cache bash dropbear && \
  echo 'root:root' | chpasswd

# Copy application files
COPY . .

# Link the mock commands
RUN ln -s /etc/homebridge-wol/caffeinate.sh /bin/caffeinate && \
    ln -s /etc/homebridge-wol/pmset.sh /bin/pmset

EXPOSE 22

ENTRYPOINT ["./docker-entrypoint.sh"]
