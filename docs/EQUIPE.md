# Usuários, permissões e exclusão lógica

## Ativar na base de dados (uma vez)

1. Abra o projeto no [Supabase](https://supabase.com/dashboard) → **SQL Editor** → **New query**.
2. Cole todo o arquivo `supabase/migrations/20261124_equipe_e_permissoes.sql` e clique em **Run**.
3. A última consulta do script lista as regras de acesso: elas devem mostrar `assistencia_dono()` no lugar de `auth.uid()`. Para ver quem é admin, abra **Table Editor → assistencia_usuarios** e olhe a coluna `admin`.

Pode rodar de novo sem problema. Antes disso, o app continua funcionando como antes. A única diferença é que o cadastro de usuários e a exclusão de produtos mostram um aviso pedindo o script.

## Tabela assistencia_usuarios

Um registro por pessoa que usa o app. O campo **`admin`** diz quem é administrador (`true`) e quem é usuário comum (`false`).

| Coluna | O que é |
|---|---|
| `email` | login da pessoa |
| `nome` | nome mostrado no app |
| `admin` | `true` = administrador, `false` = usuário |
| `ativo` | `false` = acesso desativado |
| `owner_id` | conta dona da loja |
| `user_id` | conta da pessoa (preenchido quando ela aceita o convite; igual a `owner_id` para o dono) |

O dono da loja ganha o próprio registro, com `admin = true`, no primeiro acesso depois do script. mapl11@hotmail.com é sempre admin. O dono e o administrador principal não podem ser rebaixados nem removidos.

## Como funciona

- **mapl11@hotmail.com é sempre administrador**, com acesso a tudo.
- Quem cria conta pela tela de login vira dono e administrador da própria loja.
- O administrador vai em **Menu → Usuários → Novo usuário** e informa nome, e-mail, senha inicial e a permissão (**Usuário** ou **Administrador**, que grava o campo `admin`).
- A pessoa entra no app com esse e-mail e essa senha e, no primeiro acesso, aceita o convite. A partir daí, ela vê e grava os dados da loja.
- Se o Supabase exigir confirmação de e-mail, a pessoa precisa clicar no link recebido antes de entrar.
- Para mudar a permissão, desativar ou remover alguém, toque na pessoa em **Usuários**.

| Ação | Administrador | Usuário |
|---|---|---|
| OS, clientes, agenda, vendas, documentos e etiquetas | ✔ | ✔ |
| Cadastrar e editar produtos | ✔ | ✔ (sem ver o custo) |
| Excluir produto (exclusão lógica) | ✔ | — |
| Cancelar venda | ✔ | — |
| Indicadores, custo e margem | ✔ | — |
| Empresa (nome e logo), modelos de etiqueta | ✔ | — |
| Usuários e dados de exemplo | ✔ | — |

As permissões da tabela são aplicadas pelo app. No banco, todos da equipe podem ler e gravar os dados da loja. Só o cadastro da equipe (`assistencia_usuarios`) é restrito a administradores.

## Exclusão lógica de produtos

Excluir um produto marca `excluido = true` (e `excluido_em`) em vez de apagar. O produto some das listas e não pode mais ser vendido, mas as vendas antigas continuam apontando para ele.

## Estoque

O app nunca coloca no carrinho nem registra uma venda com quantidade acima do estoque. A regra é conferida ao tocar no produto, nos botões de quantidade e de novo ao finalizar a venda. O item avulso, que permitia vender algo fora do estoque, foi removido: cadastre o produto antes de vendê-lo.
