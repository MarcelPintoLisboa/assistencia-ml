# Acessos, empresas, permissões e exclusão lógica

## Ativar na base de dados (uma vez)

1. Abra o projeto no [Supabase](https://supabase.com/dashboard) → **SQL Editor** → **New query**.
2. Cole todo o arquivo `supabase/migrations/20261124_equipe_e_permissoes.sql` e clique em **Run**.
3. A consulta final do script lista os usuários com a empresa (`owner_id`), o campo `admin` e `trocar_senha`. A tabela também aparece em **Table Editor → assistencia_usuarios**.

O script pode ser rodado de novo sem problema. Quem já usava o app e tinha dados vira automaticamente dono e administrador da própria empresa.

Antes de rodar o script, o app continua funcionando como antes (cada conta com os próprios dados), mas as telas de acesso mostram um aviso pedindo o script.

## Como o acesso funciona

- **Não existe mais "Criar conta" no app.** O login tem só e-mail e senha.
- O **administrador geral** (mapl11@hotmail.com) libera os acessos em **Menu → Acessos e empresas → Liberar novo acesso**. Ele informa:
  - a empresa: uma existente ou **+ Nova empresa** (nesse caso a pessoa vira dona e administradora dela);
  - nome, e-mail e uma **senha provisória** (o app sugere uma, que pode ser trocada);
  - a permissão: **Usuário** ou **Administrador**.
- No primeiro acesso, a pessoa entra com a senha provisória e o app **obriga a criar uma senha própria** antes de continuar. Depois ela pode trocar a senha em **Menu → Conta → Trocar senha**.
- O **administrador de uma empresa** vai em **Menu → Usuários da empresa** e adiciona ou remove usuários **somente da empresa dele**. Ele também pode tornar alguém administrador e desativar ou reativar acessos.
- O administrador geral abre qualquer empresa em **Acessos e empresas** e pode gerar uma **nova senha provisória** para quem esqueceu a senha.
- Quem entra com um e-mail sem acesso liberado vê a tela "Sem acesso liberado".
- Se o e-mail já tinha login em outro app da ML Softwares, o acesso é liberado e a pessoa entra com a senha que já usa.

A conta de login é criada direto pela base de dados, já confirmada, então não chega e-mail de confirmação. Como o app não usa mais o cadastro público, você pode desligar **Authentication → Sign In / Providers → Allow new users to sign up** no Supabase, se nenhum outro app da ML Softwares depender dele.

## Tabela assistencia_usuarios

| Coluna | O que é |
|---|---|
| `email` | login da pessoa |
| `nome` | nome mostrado no app |
| `admin` | `true` = administrador da empresa, `false` = usuário |
| `ativo` | `false` = acesso desativado |
| `trocar_senha` | `true` = ainda usa a senha provisória |
| `owner_id` | empresa (conta do dono) |
| `user_id` | conta de login da pessoa (igual a `owner_id` para o dono) |

O dono da empresa e o administrador geral não podem ser rebaixados nem removidos.

## Permissões

| Ação | Admin geral | Admin da empresa | Usuário |
|---|---|---|---|
| OS, clientes, agenda, vendas, documentos e etiquetas | ✔ | ✔ | ✔ |
| Cadastrar e editar produtos | ✔ | ✔ | ✔ (sem ver o custo) |
| Excluir produto (exclusão lógica), cancelar venda | ✔ | ✔ | — |
| Indicadores, custo e margem | ✔ | ✔ | — |
| Empresa (nome e logo), modelos de etiqueta | ✔ | ✔ | — |
| Adicionar e remover usuários da própria empresa | ✔ | ✔ | — |
| Criar empresas e liberar acesso em qualquer empresa | ✔ | — | — |
| Gerar nova senha provisória | ✔ | — | — |

No banco, o cadastro de acessos só acontece pela função `assistencia_criar_usuario`, que confere essas regras. O admin de uma empresa não consegue ver nem alterar usuários de outra empresa. As demais permissões da tabela acima são aplicadas pelo app.

## Exclusão lógica de produtos

Excluir um produto marca `excluido = true` (e `excluido_em`) em vez de apagar. O produto some das listas e não pode mais ser vendido, mas as vendas antigas continuam apontando para ele.

## Estoque

O app nunca coloca no carrinho nem registra uma venda com quantidade acima do estoque. A regra é conferida ao tocar no produto, nos botões de quantidade e de novo ao finalizar a venda. Cadastre o produto e o estoque antes de vender.
