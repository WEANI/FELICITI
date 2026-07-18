# FELICITI — hébergement statique sur Railway (Caddy)
FROM caddy:2-alpine

# Fichiers du site (voir .dockerignore pour les exclusions)
COPY . /usr/share/caddy

# Caddyfile minimal : écoute sur le $PORT fourni par Railway, sert le statique en gzip.
# Le $PORT est résolu au démarrage par Caddy (placeholder d'environnement).
RUN printf '%s\n' \
    ':{$PORT}' \
    'root * /usr/share/caddy' \
    'encode gzip zstd' \
    'header /public/* Cache-Control "public, max-age=2592000"' \
    'file_server' \
    > /etc/caddy/Caddyfile

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
