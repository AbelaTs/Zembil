#!/bin/bash

# Update package-lock.json to sync with package.json
echo "Updating package-lock.json..."

# Use the local node binary
./node-v18.20.8-darwin-arm64/bin/node ./node_modules/.bin/npm install

echo "Lock file updated successfully!"
