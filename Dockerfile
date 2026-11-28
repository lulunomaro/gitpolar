FROM node:24-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends git git-lfs ca-certificates python3 python3-pil python3-yaml bubblewrap util-linux bash \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm install --global @larksuite/cli@1.0.100 && npm cache clean --force
COPY --chown=node:node server.mjs index.html app.js live.js demo.js styles.css ./
COPY --chown=node:node backend ./backend
COPY --chown=node:node admin ./admin
COPY --chown=node:node procurement ./procurement
COPY --chown=node:node login ./login
COPY --chown=node:node albums ./albums
COPY --chown=node:node ui ./ui
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node templates ./templates
COPY --chown=node:node assets ./assets
COPY --chown=node:node public ./public
COPY --chown=node:node tools ./tools
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4317 DATA_DIR=/data LARKSUITE_CLI_CONFIG_DIR=/data/lark-cli
USER node
EXPOSE 4317
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node --input-type=module -e "const r = await fetch('http://127.0.0.1:4317/api/health'); if (!r.ok) process.exit(1)"
CMD ["node", "server.mjs"]
