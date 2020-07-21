#!/usr/bin/env bash

# This script serves as the entrypoint for the container

# Allow for killing the container from the inside
trap "exit" SIGINT SIGTERM

# Generate keys
dropbearkey -t rsa -s 4096 -f key

# Start the server
dropbear -F -B -p 0.0.0.0:22 -r key
