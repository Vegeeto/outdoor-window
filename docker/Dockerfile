# syntax=docker/dockerfile:1.4
# ========================
# ARG defaults
# ========================
# Vite 8 requires Node ^20.19 || >=22.12; Node 20 is end-of-life, so use the current LTS.
ARG NODE_VERSION=24-alpine

# =========================================
# Stage 1: Development
# =========================================
FROM node:${NODE_VERSION} AS development

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host=0.0.0.0", "--port=3000"]

# =========================================
# Stage 2: Build (static site for any static host, e.g. GitHub Pages)
# =========================================
FROM node:${NODE_VERSION} AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# The app needs no secrets or env vars: it calls public, keyless APIs from the browser.

RUN npm run build
