# Deploy (sony)

Mesmo padrão dos outros apps do sony (ver `~/github/williampilger/infrastructure/sony`): PM2 + nginx + Cloudflare Tunnel.

| Item | Valor |
|---|---|
| Domínio | `filtradores.pilger.dev.br` |
| Porta web | **26006** |
| PM2 | `filtradores-web`, `filtradores-worker` |
| Banco | container compartilhado `mysql-dev` (3306): `filtradores` + `filtradores-shadow` |
| Redis | `filt-redis` (`127.0.0.1:6393`, `docker-compose.yml` do repo) |
| Arquivos enviados | `.storage/` na raiz do repo (incluir no backup) |
| Repo irmão | `~/github/williampilger/payment-gateways` (dependência `file:` - clonar lado a lado) |

## 1. Banco no `mysql-dev` (uma vez)

```bash
docker exec -it mysql-dev mysql -uroot -p     # senha: docker exec mysql-dev printenv MYSQL_ROOT_PASSWORD
```
```sql
CREATE DATABASE `filtradores` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE `filtradores-shadow` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'userfiltradores'@'%' IDENTIFIED BY '<senha-forte>';
GRANT ALL PRIVILEGES ON `filtradores`.* TO 'userfiltradores'@'%';
GRANT ALL PRIVILEGES ON `filtradores-shadow`.* TO 'userfiltradores'@'%';
FLUSH PRIVILEGES;
```

## 2. Primeira instalação

```bash
cd ~/github/williampilger
git clone git@github.com:williampilger/payment-gateways.git      # dependência file: (até virar pacote versionado)
git clone git@github.com:williampilger/filtradores-sistema.git
(cd payment-gateways && npm ci && npm run build)
cd filtradores-sistema
cp .env.sample .env && nano .env
```

`.env` de produção - ajustar no mínimo:
```
APP_URL=https://filtradores.pilger.dev.br
PORT=26006
DATABASE_URL=mysql://userfiltradores:<senha>@localhost:3306/filtradores
SHADOW_DATABASE_URL=mysql://userfiltradores:<senha>@localhost:3306/filtradores-shadow
REDIS_URL=redis://localhost:6393
COOKIE_SECURE=true
SUPPRESS_RESPONSE_ERROR_MESSAGES=true
LOG_LEVEL=info
LOG_PRETTY=false
ENCRYPTION_KEY=<gerar>            # node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
QR_SIGNING_SECRET=<gerar>         # idem
MASTER_EMAIL=<email do master>
MASTER_PASSWORD=<senha inicial forte>
GOOGLE_CHAT_WEBHOOK=<webhook>
DEMO_MODE=false                   # true só para apresentação (ver docs/demonstracao.md)
EXPO_PUBLIC_DEMO_MODE=false
```
⚠️ `ENCRYPTION_KEY` e `QR_SIGNING_SECRET` **nunca** mudam depois de em uso:
- trocar a `ENCRYPTION_KEY` invalida as credenciais dos gateways e o 2FA;
- trocar o `QR_SIGNING_SECRET` invalida todas as carteirinhas.

```bash
npm run deploy:sony     # npm ci, redis, prisma generate + migrate deploy + seed, build, pm2 start, pm2 save
```

Depois:
1. Entrar com o master. O 2FA será exigido no primeiro acesso.
2. Ajustar os dados do clube e o logo em **Admin > Configurações**.
3. Configurar os gateways em **Admin > Gateways**. Os webhooks vão em `https://filtradores.pilger.dev.br/api/v1/webhooks/payments/<gateway>`.

## 3. nginx + túnel

Adicionar em `/etc/nginx/sites-available/pilgerdev`:
```nginx
server {
  listen 80;
  server_name filtradores.pilger.dev.br;
  client_max_body_size 25M;
  location / {
    proxy_pass http://127.0.0.1:26006;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $http_cf_connecting_ip;
    proxy_set_header X-Forwarded-For $http_cf_connecting_ip;
    proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
  }
}
```
```bash
sudo nginx -t && sudo systemctl reload nginx
cloudflared tunnel route dns pilgerdev filtradores.pilger.dev.br
```

## 4. Atualizações

```bash
cd ~/github/williampilger/payment-gateways && git pull && npm ci && npm run build   # se o pacote mudou
cd ~/github/williampilger/filtradores-sistema && npm run redeploy:sony
```

## 5. Backup

- Banco: o `backup.sh` do sony já faz dump de todos os bancos do `mysql-dev`, exceto os `*-shadow`.
- Adicionar `filtradores-sistema` em `BACKUP_APPS`, para levar o `.env` e o `.storage/` (fotos e imagens).

## App mobile

Builds via EAS: ver [mobile.md](mobile.md) e `apps/mobile/README.md`. A URL da API de produção é `https://filtradores.pilger.dev.br`.

---

By: **will.i.am** | github.com/williampilger
