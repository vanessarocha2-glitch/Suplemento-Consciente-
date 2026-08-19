# Suplemento Consciente

Plataforma web que permite a qualquer pessoa consultar informações confiáveis sobre suplementos alimentares — **sem precisar criar conta**. Um único administrador cadastra e mantém todo o conteúdo através de um painel próprio.

> Projeto desenvolvido como trabalho de TCC.

## O problema

Suplementos alimentares (whey protein, creatina, vitaminas, etc.) são vendidos em grande quantidade, mas informações claras sobre **o que cada produto contém, para que serve, se está regularizado na Anvisa e se as alegações do rótulo são permitidas por lei** costumam estar dispersas ou de difícil acesso — principalmente para adolescentes e consumidores sem orientação profissional.

## A proposta

O visitante busca um suplemento pelo nome (ou filtra por marca) e encontra, em uma única página:

- **Ingredientes** — explicados de forma simples, o que são e para que servem, com a dosagem daquele produto específico
- **Finalidade e modo de uso**
- **Situação na Anvisa** — regularizado, em análise ou não localizado
- **Conformidade legislativa** — quais alegações do rótulo são ou não permitidas pela legislação vigente (ex.: RDC 243/2018), com a justificativa
- **Alertas de uso** — avisos sobre uso inadequado, com ênfase em restrição para adolescentes e necessidade de orientação profissional

Além da consulta, o site oferece conteúdo educativo:

- **Vídeos curtos** sobre suplementos, usos e cuidados (com associação opcional a um produto específico)
- **Quiz** de múltipla escolha, com pontuação calculada no servidor e um **ranking dos 10 melhores resultados**

## Como o conteúdo é mantido

Não existe cadastro de usuário comum. Um único administrador loga em `/admin` e, por um painel próprio, cadastra marcas, ingredientes, alertas, suplementos, vídeos e perguntas do quiz. Essa é uma escolha deliberada: como só existe um administrador, não há tela pública de criação de conta — a conta desse administrador é provisionada diretamente no Supabase.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| UI | ShadCN/UI + Tailwind CSS |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth (email/senha) |
| Validação | Zod |
| Testes | Vitest + Testing Library |
| Gerenciador de pacotes | pnpm |

A autorização é resolvida com **Row Level Security** do Postgres: qualquer visitante lê os dados livremente (`anon`), e só o administrador autenticado escreve. A única exceção é a pontuação do quiz — gravada por visitantes sem login através de uma função `security definer` que recalcula a nota no próprio banco, para que ela nunca possa ser forjada pelo cliente.
