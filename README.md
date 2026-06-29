# Etiquetas Pro

Sistema de geração de etiquetas de envio para e-commerce, com importação de pedidos via NF-e (XML) e planilhas Excel, geração de PDF em folhas de etiquetas e uma API REST pública para integração.

**Status:** Implementado no Lovable
**Banco de dados:** Supabase **externo** (não Lovable Cloud)
**Repositório:** https://github.com/jeanpg93-tech/etiquetaspro

---

## ⚠️ Importante — Supabase externo

Este projeto usa um **projeto Supabase próprio (externo)**, e **não** o Supabase nativo do Lovable (Lovable Cloud). Toda a persistência (produtos, pedidos, API keys, histórico) vive nesse Supabase externo.

- As credenciais ficam nas variáveis de ambiente (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e, no servidor, `SUPABASE_SERVICE_ROLE_KEY`).
- Mensagens automáticas do tipo "Connect Supabase in Lovable Cloud" vêm dos clientes gerados pelo Lovable; aqui elas significam apenas que falta uma variável de ambiente — **não** que se deva migrar para o Lovable Cloud.

---

## 🧱 Stack real

O projeto foi gerado pelo Lovable na stack atual dele, que **não** é Next.js:

| Camada | Tecnologia |
| --- | --- |
| Framework | TanStack Start (SSR + server functions) |
| Build / dev | Vite 8 |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui (Radix) |
| Roteamento | TanStack Router (file-based em `src/routes/`) |
| Dados | TanStack Query |
| Banco | Supabase (PostgreSQL) externo |
| PDF | jsPDF |
| Parsers | `fast-xml-parser` (NF-e), `xlsx` (Excel) |
| Validação | Zod |
| Gerenciador de pacotes | Bun (`bun.lock`) |

> Histórico: o sistema nasceu como um projeto Next.js (exportado do Abacus). Ao ser recriado no Lovable, a stack passou a ser TanStack Start. A lógica de negócio (parsers, geração de PDF, modelo de dados) foi preservada.

---

## 📁 Estrutura

```
src/
├── routes/                      # Rotas (file-based, TanStack Router)
│   ├── __root.tsx               # App shell
│   ├── index.tsx                # Redireciona para /produtos
│   ├── produtos.tsx             # CRUD de produtos
│   ├── pedidos.tsx              # Importação de pedidos + geração de etiquetas
│   ├── historico.tsx            # Histórico de impressões
│   ├── configuracoes.tsx        # Configurações de layout das etiquetas
│   ├── api-keys.tsx             # Gerenciamento de API keys
│   └── api/public/v1/           # API REST pública (autenticada por API key)
│       ├── products.ts
│       └── products.$id.ts
├── lib/
│   ├── products.functions.ts    # Server functions de produtos
│   ├── orders.functions.ts      # Server functions de pedidos
│   ├── print-logs.functions.ts  # Server functions do histórico
│   ├── api-keys.functions.ts    # Server functions de API keys
│   ├── api-auth.server.ts       # Autenticação da API pública (x-api-key)
│   ├── parsers/
│   │   ├── nfe.ts               # Parser de NF-e (XML)
│   │   └── excel-orders.ts      # Parser de pedidos via Excel
│   ├── labels/
│   │   ├── pdf.ts               # Geração do PDF de etiquetas
│   │   └── settings.ts          # Presets e configurações de layout
│   └── validators.ts            # Schemas Zod
├── integrations/supabase/
│   ├── server-client.ts         # Cliente servidor (chave publishable/anon)
│   ├── client.server.ts         # Cliente servidor admin (service_role) — bypassa RLS
│   ├── client.ts                # Cliente browser
│   └── types.ts                 # Tipos gerados do banco
└── components/ui/               # Componentes shadcn/ui

supabase/
├── config.toml
└── migrations/                  # Migrations SQL (schema + RLS)
```

---

## 🗃️ Modelo de dados (Supabase)

| Tabela | Função |
| --- | --- |
| `products` | Catálogo de produtos (SKU único, nome, dimensões, peso) |
| `orders` | Pedidos importados (NF-e / Excel / manual) com dados do destinatário |
| `order_items` | Itens de cada pedido (liga por SKU ao `products`) |
| `api_keys` | API keys da API pública (armazena só o hash SHA-256 + prefixo) |
| `print_logs` | Histórico de gerações de etiquetas |

Migrations ficam em `supabase/migrations/` e são a fonte de verdade do schema.

---

## 🚀 Rodando localmente

Pré-requisitos: **Bun** (o projeto usa `bun.lock`) e um projeto Supabase externo.

```bash
# 1. Instalar dependências (respeita o bun.lock)
bun install

# 2. Configurar variáveis de ambiente
#    Crie um .env na raiz com as chaves do seu Supabase (ver abaixo)

# 3. Subir o ambiente de desenvolvimento
bun dev
```

### Variáveis de ambiente

```env
# Públicas (expostas no browser via Vite) — usadas pelo cliente
VITE_SUPABASE_URL="https://<seu-projeto>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon/publishable key>"
VITE_SUPABASE_PROJECT_ID="<project-id>"

# Servidor
SUPABASE_URL="https://<seu-projeto>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<anon/publishable key>"

# Servidor (admin) — NUNCA versionar / nunca expor no browser
SUPABASE_SERVICE_ROLE_KEY="<service role key>"
```

> A `service_role` key bypassa o RLS e só pode ser usada no servidor. Não a coloque em variáveis `VITE_*` nem a comite no Git.

---

## 🔌 API pública (v1)

Endpoints REST para integração externa, autenticados por API key.

**Autenticação:** envie o header `x-api-key: <sua-chave>` em toda requisição. Requisições sem chave válida recebem `401`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/public/v1/products` | Lista produtos (paginado: `?page=&pageSize=`) |
| `POST` | `/api/public/v1/products` | Cria produto |
| `GET` | `/api/public/v1/products/:id` | Detalha produto |
| `PUT` | `/api/public/v1/products/:id` | Atualiza produto |
| `DELETE` | `/api/public/v1/products/:id` | Remove produto |

As API keys são geradas na tela **API Keys**. A chave em texto puro é exibida **uma única vez** na criação; o banco guarda apenas o hash SHA-256.

---

## 🏷️ Geração de etiquetas

- Importe pedidos em **Pedidos** (upload de XML de NF-e ou planilha Excel).
- Os campos do destinatário (nome, endereço, cidade/UF, CEP) e o número do pedido são extraídos automaticamente.
- Selecione os pedidos e gere o PDF; o layout segue presets de folha de etiquetas (ex.: Pimaco) configuráveis em **Configurações** (bordas, campos exibidos, escala de fonte).
- Cada geração é registrada em `print_logs`.

---

## 🔄 Sincronização com Lovable / GitHub

- Este repositório está conectado ao Lovable. **Commits enviados ao branch conectado sincronizam de volta para o editor do Lovable.**
- **Não** reescreva histórico já publicado (sem `force push`, `rebase`, `amend` ou `squash` de commits já enviados) — isso corrompe o histórico do lado do Lovable.
- Mantenha o branch sempre em estado funcional.

---

## 📌 Notas de segurança

- O repositório é **público**: a chave `publishable`/`anon` é, por design, pública, mas a `service_role` **jamais** deve ser commitada.
- O acesso das tabelas via RLS e a separação entre cliente anon e cliente admin (`service_role`) estão descritos nas migrations em `supabase/migrations/`.
- **Estado atual do RLS:** as tabelas `products`, `api_keys`, `orders`, `order_items` e `print_logs` têm policy `anon USING(true)`, ou seja, a chave publishable tem acesso total via API REST direta do Supabase. Em um app single-tenant interno esse nível de abertura é aceitável; se os dados de clientes (nomes, endereços, CEPs) precisarem de proteção adicional, a correção é: (1) trocar `getSupabaseServer()` por `supabaseAdmin` nas server functions, (2) configurar a variável `SUPABASE_SERVICE_ROLE_KEY` no ambiente, e (3) remover ou restringir as policies anon nas tabelas. O Lovable já deixou o cliente `supabaseAdmin` pronto em `src/integrations/supabase/client.server.ts`.
