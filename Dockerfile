FROM node:22-alpine
WORKDIR /app
COPY server.js index.html ./
COPY assets ./assets
COPY data ./data
ENV HOST=0.0.0.0 PORT=3088 SERVE_STATIC=1 NODE_ENV=production
USER node
EXPOSE 3088
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3088/api/combos >/dev/null || exit 1
CMD ["node", "server.js"]
