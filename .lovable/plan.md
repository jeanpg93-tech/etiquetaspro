
# Etiquetas Pro — Fase 0 + Fase 1

Construir o núcleo do app na stack já configurada (TanStack Start + React + Supabase via Lovable Cloud), sem login de usuário. App single-tenant: o dashboard é aberto; a API REST é protegida por API Key.

Adaptações em relação ao spec original:
- Sem Next.js/Prisma — uso de rotas TanStack + `createServerFn` + cliente Supabase já presente.
- Sem Supabase externo — uso do Supabase já conectado.
- Sem Supabase Auth (single-tenant).

## Fase 0 — Setup

1. Instalar dependência faltando (`@supabase/supabase-js`) — está causando erro de build no preview.
2. Verificar variáveis `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (já presentes).
3. Smoke test do build.

## Fase 1 — Banco de dados (migração Supabase)

Criar tabelas no schema `public`:

- `products`
  - `sku` (único), `name`, `description`, `width_cm`, `height_cm`, `length_cm`, `weight_g`
- `api_keys`
  - `name`, `key_hash` (sha256), `key_prefix` (8 chars visíveis), `last_used_at`, `revoked_at`

Regras de acesso (single-tenant, sem login):
- `products`: leitura/escrita via `service_role` apenas (acessado por server functions). Sem políticas para `anon`/`authenticated` → app inteiro acessa via server functions com `supabaseAdmin`.
- `api_keys`: idem — somente `service_role`. Nunca exposto ao cliente.
- RLS habilitado em ambas; sem políticas para `anon`/`authenticated`.

Trigger `updated_at` padrão.

## Fase 1 — Server functions (`src/lib/*.functions.ts`)

Todas usam `supabaseAdmin` carregado dentro do `.handler()` (regra de import-graph).

Produtos:
- `listProducts({ search?, page?, pageSize? })`
- `createProduct(input)` — valida com Zod, checa SKU duplicado
- `updateProduct({ id, ...input })`
- `deleteProduct({ id })`

API Keys:
- `listApiKeys()` — devolve nome, prefixo, criada em, último uso, revogada
- `createApiKey({ name })` — gera 32 bytes random via `crypto`, retorna a chave em texto plano UMA vez + salva hash sha256
- `revokeApiKey({ id })`

Schemas Zod em `src/lib/validators.ts`.

## Fase 1 — UI do dashboard

Layout simples com sidebar:
- `/` redireciona para `/produtos`
- `/produtos` — DataTable shadcn com busca, paginação, botões Novo/Editar/Excluir (Dialog com Form)
- `/api-keys` — lista de chaves, botão "Gerar nova chave" (mostra a chave em modal com botão copiar e aviso "salve agora, não será exibida novamente"), botão revogar

Componentes shadcn já disponíveis no projeto. Toasts via `sonner`.

Sem header de login. Branding mínimo "Etiquetas Pro".

## Fase 1 — API REST pública (`/api/v1/*`)

Server routes em `src/routes/api/v1/`:

- `POST /api/v1/products`
- `GET /api/v1/products`
- `PUT /api/v1/products/$id`
- `DELETE /api/v1/products/$id`

Middleware de auth por API Key:
- Lê header `x-api-key`
- Hash sha256 da chave recebida → procura em `api_keys` onde `revoked_at IS NULL`
- Atualiza `last_used_at`
- 401 se ausente/inválida, JSON `{ error: "Unauthorized" }`

Validação de input com Zod, respostas JSON padronizadas `{ data }` / `{ error, details? }`, status apropriados (200/201/204/400/401/404/409).

## Critérios de aceitação

- Build verde, preview carrega sem erro do supabase-js.
- Dashboard permite CRUD completo de produtos com validação (SKU duplicado retorna mensagem clara).
- Gerar API Key mostra a chave uma única vez; revogar funciona.
- `curl -H "x-api-key: <chave>" /api/v1/products` retorna a lista; sem header retorna 401.
- Tabelas com RLS habilitado e sem políticas para roles públicos (defesa em profundidade — só server functions acessam via service role).

## Detalhes técnicos

- Stack: TanStack Start + React 19 + Tailwind v4 + shadcn/ui + Supabase (admin client server-side).
- Hash de API Key: `crypto.createHash("sha256").update(key).digest("hex")`. Chave em texto: `"ep_" + crypto.randomBytes(24).toString("base64url")`. Guardamos `key_prefix` = primeiros 11 chars para exibição.
- `supabaseAdmin` importado via `await import("@/integrations/supabase/client.server")` dentro de cada handler.
- Server routes públicos ficam em `src/routes/api/v1/` (não `api/public/` — queremos manter sob auth de API Key própria; o prefixo `public` apenas dispensa auth do site publicado, o que combina porque nós mesmos validamos a API Key). Vou usar `src/routes/api/public/v1/` para garantir que callers externos cheguem na rota mesmo no site publicado.
- Sem alteração no `__root.tsx` além de incluir sidebar opcionalmente; mantém `<Outlet />`.

## Fora de escopo (próximas fases)

Parser XML/Excel, geração de PDF, histórico, logs, dashboard de métricas — entregues nas Fases 2-4 conforme spec original.
