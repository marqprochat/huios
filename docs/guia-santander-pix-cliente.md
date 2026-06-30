# Guia: o que coletar para ativar o Pix do Santander

Olá! Para ativarmos o recebimento de pagamentos via **Pix do Santander** no sistema,
precisamos que você colete **6 itens** dentro da sua conta Santander e do Portal do
Desenvolvedor do banco. Este passo a passo mostra exatamente onde encontrar cada um.

No final, é só nos enviar a **lista preenchida** + os **2 arquivos** do certificado.

---

## ✅ Checklist final (o que você vai nos entregar)

| # | Item | Exemplo / formato |
|---|------|-------------------|
| 1 | **Ambiente** | Produção (para cobrar de verdade) |
| 2 | **Chave Pix recebedora** | e-mail, CNPJ, telefone ou chave aleatória |
| 3 | **Client ID** | um código longo (texto) |
| 4 | **Client Secret** | um código longo (texto) — **secreto** |
| 5 | **Arquivo do certificado** | arquivo `.crt` (ou `.pem`) |
| 6 | **Arquivo da chave privada** | arquivo `.key` |

> ⚠️ Os itens 4, 5 e 6 são **sigilosos** (funcionam como senha da conta para o Pix).
> Envie por um canal seguro e **não compartilhe com mais ninguém**.

---

## Pré-requisitos (antes de começar)

1. Ter uma **conta Pessoa Jurídica (PJ) no Santander**.
2. O **Pix precisa estar ativado** nessa conta.
3. Ter pelo menos **uma chave Pix cadastrada** na conta (pode ser o CNPJ, um e-mail,
   um telefone ou uma chave aleatória). Essa será a chave que **recebe** os pagamentos.
   - Onde ver: app/internet banking Santander → **Pix** → **Minhas chaves**.

---

## Passo 1 — Anotar a chave Pix recebedora (item 2)

- Abra o app ou o internet banking do Santander.
- Vá em **Pix → Minhas chaves**.
- Escolha a chave que vai receber os pagamentos do seminário e **anote ela exatamente
  como aparece** (ex.: o CNPJ só com números, ou o e-mail completo).

---

## Passo 2 — Acessar o Portal do Desenvolvedor (Santander)

- Acesse: **https://developer.santander.com.br**
- Clique em **Entrar / Login** e use o acesso da sua conta Santander Empresarial
  (mesmo login do internet banking PJ).
  - Se for o primeiro acesso, o portal pode pedir um cadastro rápido vinculado ao CNPJ.

---

## Passo 3 — Criar a aplicação e assinar o produto "Pix"

- Dentro do portal, vá em **Meus Aplicativos** (ou "Minhas Aplicações").
- Clique em **Criar aplicação / Novo aplicativo**.
- Dê um nome fácil de reconhecer, por exemplo: **Sistema Huios**.
- Quando pedir para escolher o **produto/API**, selecione **Pix** (pode aparecer como
  *Cobrança Pix*, *API Pix* ou *Pix Recebimentos*) e **assine/ative** esse produto.

---

## Passo 4 — Copiar o Client ID e o Client Secret (itens 3 e 4)

- Ainda na aplicação que você acabou de criar, abra a aba de **Credenciais**
  (ou "Chaves de acesso").
- Você verá dois códigos:
  - **Client ID** → copie e cole no checklist (item 3).
  - **Client Secret** → clique em "mostrar/revelar", copie e guarde (item 4).
    - 👉 O Client Secret às vezes **só aparece uma vez**. Se sumir, é possível gerar
      um novo na mesma tela.

---

## Passo 5 — Gerar o certificado de transporte (itens 5 e 6)

O Santander exige um **certificado digital** para liberar o acesso ao Pix pela API.
Ele é formado por **dois arquivos**: o **certificado** (`.crt`) e a **chave privada** (`.key`).

- Na sua aplicação, procure a opção **Certificados** (ou "Certificado de transporte" / mTLS).
- Clique em **Gerar certificado** e siga as instruções do portal.
- Ao final, faça o **download dos dois arquivos**:
  - o **certificado** → termina em **`.crt`** (ou `.pem`);
  - a **chave privada** → termina em **`.key`**.
- **Guarde os dois arquivos juntos e em local seguro.** A chave `.key` não pode ser
  baixada novamente depois — se perder, será preciso gerar um certificado novo.

> 💡 Dependendo do navegador/portal, o download pode vir como **um único arquivo `.pem`**
> ou um `.zip` com os dois dentro. Se ficar em dúvida sobre qual é qual, pode nos enviar
> tudo que baixou que a gente identifica.

---

## Passo 6 — Nos enviar tudo

Envie para nós, por um canal seguro:

1. **Ambiente:** Produção
2. **Chave Pix recebedora:** _____________________
3. **Client ID:** _____________________
4. **Client Secret:** _____________________
5. **Arquivo `.crt`** (anexar)
6. **Arquivo `.key`** (anexar)

Com isso, cadastramos a integração no painel, testamos a conexão e ativamos o
recebimento por Pix. 🎉

---

### Dúvidas comuns

- **Precisa instalar algo no meu computador?** Não. É tudo feito pelo site do Santander.
- **O certificado tem validade?** Sim, normalmente **1 ano**. Perto de vencer, o portal
  avisa e basta gerar um novo e nos reenviar os 2 arquivos.
- **É seguro enviar esses dados?** São sigilosos como uma senha. Use um canal seguro e
  não os publique. Caso ache que vazaram, gere novas credenciais/certificado no portal.
- **Posso testar antes de cobrar de verdade?** Sim — existe o ambiente de **Sandbox**
  (testes). Se quiser testar primeiro, nos avise que orientamos.
