# Grava Nóis API

Backend da plataforma Grava Nóis para captura, organização e entrega de replays esportivos. Este serviço expõe endpoints para autenticação, gestão de clientes/instalações (quadras), ingestão de clipes (upload direto no S3 via URL assinada), consulta de biblioteca e notificações operacionais.

Este README é voltado para:
- Pessoas desenvolvedoras (onboarding e operação do serviço)
- Parceiros que precisam integrar dispositivos/softwares ao fluxo de ingestão e consumo de clipes

---

## Visão geral do fluxo

Em alto nível, o sistema funciona assim:

1) **Cadastro e configuração**
   - Um cliente (organização) é cadastrado.
   - Uma instalação de quadra é registrada e parametrizada (ex.: contrato, buffers, etc.).

2) **Ingestão de clipe (upload)**
   - O parceiro solicita à API uma **URL assinada de upload** informando `clientId`, `venueId` e metadados mínimos do clipe.
   - O upload do arquivo é feito **direto do dispositivo para o S3** (PUT na URL assinada).
   - Após o upload, o parceiro chama um endpoint de “finalização” para a API validar o objeto (S3 HEAD) e atualizar o status no banco.

3) **Biblioteca / consumo**
   - A listagem é feita **a partir do banco** (fonte de verdade) e, quando necessário, o servidor consulta metadados no S3 e retorna URLs assinadas de leitura.

---

## Arquitetura

Pontos principais:

- **Node.js + Express + TypeScript** (entrada em `src/index.ts`).
- **PostgreSQL (primário)** via **TypeORM** e migrations (entidades em `src/models`, DataSource em `src/config/database.ts`).
- **AWS S3 (SDK v3)** para URLs assinadas e validação de objetos (`src/config/s3Client.ts`, `src/services/video.service.ts`).
- **JWT** para autenticação (cookie HTTP-only e suporte a `Authorization: Bearer`) (`src/middlewares/auth.middleware.ts`).
- **Login Google** via validação de **Google ID Token** (`google-auth-library`) (`src/services/auth.service.ts`).
- **SMTP/Nodemailer** para contato e reporte de erro (`src/services/notification/*`).
- **RabbitMQ** preparado para fan-out de eventos (ex.: pipeline de processamento), com conexão em `src/rabbitmq`.

### Organização do código

```
src/
  config/          Carregamento de env, DataSource TypeORM, client S3, conexões
  controllers/     Camada HTTP: validação de inputs e formatação de respostas
  middlewares/     Auth (JWT) e error handler padronizado
  migrations/      Migrations do TypeORM
  models/          Entidades do domínio (TypeORM)
  rabbitmq/        Conexão e publisher (quando habilitado)
  routes/          Definição das rotas por contexto
  services/        Regras de negócio e integrações (DB/S3/Google)
  types/           Tipos compartilhados e erros
  utils/           Logger e helpers
  validation/      Schemas Zod de validação (quando aplicável)
```

---

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- Bucket S3 + credenciais (upload/download)
- SMTP para envio de e-mails (contato e reporte)
- (Opcional) RabbitMQ para integração com pipeline assíncrono

---

## Configuração de ambiente

O projeto carrega automaticamente:
- `.env` quando `NODE_ENV=development`
- `.env.production` quando `NODE_ENV!=development`

As variáveis abaixo são validadas no startup (falha rápida).

### Serviço (geral)

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `NODE_ENV` | não | `development` ou `production`. Define também qual arquivo `.env` é carregado. |
| `PORT` | não | Porta HTTP do Express (padrão: `3000`). |
| `BACKEND_PUBLIC_URL` | sim | Base pública do backend (útil para compor URLs em integrações). |
| `COOKIE_SAME_SITE` | sim | Política SameSite padrão do serviço (ex.: `lax`, `none`). |
| `JWT_SECRET` | sim | Segredo de assinatura do JWT. |
| `JWT_EXPIRES_IN` | sim | Expiração do JWT (ex.: `1h`). |
| `BCRYPT_SALT_ROUNDS` | não | Rounds do bcrypt (padrão: `12`). |
| `GOOGLE_CLIENT_ID` | sim | Audience esperada ao validar o Google ID Token. |
| `DEV_EMAIL` | não | Destinatário padrão dos e-mails de contato/reporte (fallback interno). |

### PostgreSQL (primário / TypeORM)

Em produção, estas variáveis passam a ser obrigatórias:

| Variável | Obrigatória em produção | Descrição |
| --- | --- | --- |
| `DB_HOST` | sim | Host do banco primário. |
| `DB_PORT` | sim | Porta do banco (normalmente `5432`). |
| `DB_USER` | sim | Usuário do banco. |
| `DB_PASSWORD` | sim | Senha do banco. |
| `DB_NAME` | sim | Nome do banco. |

### AWS S3

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `AWS_ACCESS_KEY_ID` | sim | Access key do bucket. |
| `AWS_SECRET_ACCESS_KEY` | sim | Secret. |
| `AWS_REGION` | sim | Região (ex.: `sa-east-1`). |
| `S3_BUCKET_NAME` | sim | Bucket que armazena os clipes. |

### SMTP / E-mail

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `EMAIL_HOST` | não | Host SMTP (padrão: `smtp.gmail.com`). |
| `EMAIL_USER` | sim | Usuário SMTP. |
| `EMAIL_PASS` | sim | Senha/app password. |

### RabbitMQ (opcional)

| Variável | Obrigatória em produção | Descrição |
| --- | --- | --- |
| `RABBITMQ_URL` | sim | URI do broker. |

### Perfil de usuário (consulta)

O endpoint `/users/:id` consulta dados em `grn_auth.profiles` via conexão SQL direta. Para usar esse endpoint, defina:

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `SUPABASE_DATABASE` | depende do uso | Connection string para a base que contém `grn_auth.profiles`. |

---

## Banco de dados e migrations

O banco primário é organizado por schemas `grn_*` (ex.: `grn_clients`, `grn_core`, `grn_videos`). As entidades TypeORM estão em `src/models` e as migrations em `src/migrations`.

Comandos principais:

- Instalar dependências: `npm install`
- Rodar em desenvolvimento (porta padrão 3000): `npm run dev`
- Build: `npm run build`
- Aplicar migrations: `npm run migration:run`
- Reverter última migration: `npm run migration:revert`
- Gerar migration: `npm run migration:generate -- <Nome>`

---

## Como rodar

### Local (desenvolvimento)

1. Crie `.env` com as variáveis necessárias.
2. Garanta acesso ao PostgreSQL e ao bucket S3.
3. Rode migrations: `npm run migration:run`
4. Suba a API: `npm run dev`

A API ficará disponível em `http://localhost:3000` (a menos que `PORT` seja definido).

### Docker (produção/local-prod)

O repositório inclui `Dockerfile` e `docker-compose.yml`. Para subir:

1. Crie `.env.production`.
2. Execute: `docker compose up --build`

Observação sobre porta:
- A aplicação **escuta** a porta definida em `PORT` (padrão `3000`).
- O `docker-compose.yml` atual mapeia `2399:2399`. Se você quiser manter a convenção `3000`, ajuste o compose para `3000:3000` e garanta `PORT=3000` no `.env.production`.

---

## Autenticação e segurança

### JWT

O serviço emite um JWT e grava em cookie HTTP-only `grn_access_token`. Rotas protegidas aceitam:
- Cookie `grn_access_token`
- Header `Authorization: Bearer <token>`

O middleware normaliza o payload para `req.user = { id, email, role }`.

### Login com Google

O endpoint de Google recebe `idToken` (Google ID Token) e valida com audience `GOOGLE_CLIENT_ID`. Em seguida, cria/vincula usuário no banco e emite o mesmo JWT.

### CORS e proxy

- CORS é por allowlist (origens explícitas) e com `credentials: true`.
- `trust proxy` está habilitado para compatibilidade em ambientes atrás de proxy/load balancer.

### Rate limiting

Os endpoints de autenticação aplicam rate limit para reduzir tentativas de brute-force.

---

## Padrões de resposta e erros

Erros são padronizados pelo middleware global e incluem `requestId` (correlation id):

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Erro interno no servidor."
  },
  "requestId": "..."
}
```

O servidor adiciona `X-Request-Id` na resposta (gerado ou reaproveitado do header de entrada).

---

## Endpoints (resumo)

### Health

- `GET /` – Health check.

### Auth (`/auth`)

- `POST /auth/sign-in` – Login com email/senha.
- `POST /auth/sign-up` – Registro com email/senha.
- `POST /auth/sign-out` – Logout (limpa cookies).
- `POST /auth/google` – Login com Google (via ID token).
- `GET /auth/me` – Retorna o usuário autenticado (requer JWT).

### Vídeos

- `POST /api/videos/metadados/client/:clientId/venue/:venueId`
  - Cria registro do clipe e retorna `upload_url` (S3 PUT).
  - Body mínimo validado hoje:
    - `venue_id` (UUID)
    - `captured_at` (string)
    - `sha256` (hex SHA-256)

- `POST /api/videos/:videoId/uploaded`
  - Valida o objeto no S3 (tamanho e ETag opcional) e atualiza status.
  - Body:
    - `size_bytes` (number)
    - `sha256` (hex SHA-256)
    - `etag` (opcional)

- `GET /api/videos/list?venueId=...&limit=...&token=...&includeSignedUrl=...&ttl=...`
  - Lista clipes a partir do banco (ordenado por `capturedAt DESC`).
  - Opcionalmente inclui URL assinada de leitura por item.

- `GET /api/videos/sign?path=...&kind=preview|download&ttl=...`
  - Gera URL assinada de leitura sob demanda.

- `GET /videos-clips?venueId=...`
  - Retorna clipes de uma instalação com URL assinada curta (preview).

### Clientes e instalações (`/api/clients`)

- `POST /api/clients/` – Cria cliente.
- `POST /api/clients/venue-installations/:clientId` – Cria instalação (quadra) para um cliente.

### Quadras filiadas (`/api/quadras-filiadas`)

- `GET /api/quadras-filiadas/` – Lista instalações ativas (uso operacional).

### Notificações (`/notifications`)

- `POST /notifications/contact` – Formulário de contato.
- `POST /notifications/report` – Reporte de erro.

### Perfil de usuário (`/users`)

- `GET /users/:id` – Busca perfil (tabela `grn_auth.profiles`).
- `PATCH /users/:id` – Atualiza campos mutáveis no perfil.

---

## Integração para parceiros (ingestão de clipes)

### 1) Solicitar URL de upload

Chame `POST /api/videos/metadados/client/:clientId/venue/:venueId` com os dados do clipe. A resposta retorna:

- `clip_id`: identificador do clipe (chave natural do pipeline)
- `storage_path`: caminho final no bucket
- `upload_url`: URL assinada para PUT no S3

O destino (`storage_path`) é derivado automaticamente do contrato configurado na instalação (`VenueInstallation.contractMethod`):

- `monthly_subscription` → `main/clients/{clientId}/venues/{venueId}/{MM}/{DD}/{clip_id}.mp4`
- `per_video` → `temp/{clientId}/{venueId}/{clip_id}.mp4`

### 2) Fazer upload direto no S3

Execute um HTTP PUT no `upload_url`. O backend não “proxyfaza” o arquivo.

### 3) Finalizar upload

Depois do PUT concluir, chame `POST /api/videos/:videoId/uploaded` para o backend:

- Verificar existência e integridade via `HeadObject`.
- Atualizar `videos.status` para `uploaded` (mensal) ou `uploaded_temp` (avulso).

### 4) Consultar a biblioteca

Use `GET /api/videos/list` com `venueId`. Quando precisar de URL de leitura, utilize `includeSignedUrl=true` (ou `GET /api/videos/sign` sob demanda).

---

## Observações operacionais

- A listagem consulta o banco como fonte de verdade e valida no S3 item a item; itens sem objeto no bucket retornam `missing=true`.
- Em produção, o serviço falha no startup se variáveis obrigatórias estiverem ausentes.
- Logs incluem um `requestId` para rastreio ponta a ponta.

