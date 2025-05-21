#!/bin/bash
# Setup script for Agenda project
set -e

# Install Node.js if not present
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
fi

# Install yarn if not present
if ! command -v yarn >/dev/null 2>&1; then
  npm install -g yarn
fi

# Install MongoDB if not present
if ! command -v mongod >/dev/null 2>&1; then
  apt-get update
  apt-get install -y mongodb
fi

# Install project dependencies
yarn install --frozen-lockfile
