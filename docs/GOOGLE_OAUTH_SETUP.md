# Guia de Configuração do Google OAuth — JusLegis

Este documento fornece instruções detalhadas para o proprietário do projeto configurar e habilitar o login social com **Google OAuth** no projeto Supabase da plataforma **JusLegis** (`hbqlwwnnbvritknwwzos`).

---

## 1. Visão Geral do Fluxo OAuth no Supabase
O Supabase atua como o intermediário de autenticação OAuth 2.0. Quando o usuário clica em "Continuar com Google" na página de login do JusLegis (`/login`), a aplicação solicita ao cliente Supabase iniciar o fluxo OAuth (`supabase.auth.signInWithOAuth`). O Google valida as credenciais e redireciona o usuário de volta para a rota de callback do Supabase (`https://hbqlwwnnbvritknwwzos.supabase.co/auth/v1/callback`), que por sua vez estabelece a sessão segura e redireciona o usuário para `/auth/callback?next=/app`.

---

## 2. Configuração no Google Cloud Console

Para obter o **Client ID** e o **Client Secret** do Google:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. No seletor de projetos na barra superior, crie um novo projeto (ex: `JusLegis Auth`) ou selecione um existente.
3. No menu lateral esquerdo, navegue até **APIs e Serviços** > **Tela de consentimento OAuth** (*OAuth consent screen*):
   - Selecione o tipo de usuário **Externo** (*External*) e clique em **Criar**.
   - **Nome do aplicativo**: `JusLegis`
   - **E-mail de suporte ao usuário**: seu e-mail de contato.
   - **Dados de contato do desenvolvedor**: seu e-mail.
   - Clique em **Salvar e Continuar** até retornar ao painel principal.
4. No menu lateral, vá em **Credenciais** (*Credentials*) > **Criar credenciais** (*Create credentials*) > **ID do cliente OAuth** (*OAuth client ID*).
5. Em **Tipo de aplicativo** (*Application type*), selecione **Aplicativo da Web** (*Web application*).
6. Defina um nome para o cliente (ex: `JusLegis Web Client`).
7. Na seção **URIs de redirecionamento autorizados** (*Authorized redirect URIs*), clique em **Adicionar URI** e informe exatamente a URL de callback do seu projeto Supabase:
   ```text
   https://hbqlwwnnbvritknwwzos.supabase.co/auth/v1/callback
   ```
8. Clique em **Criar** (*Create*).
9. Uma janela exibirá o **Client ID** e o **Client Secret**. Copie ambos os valores com segurança (eles serão colados no painel do Supabase).

---

## 3. Configuração do Provedor Google no Painel do Supabase

1. Acesse o [Painel do Supabase](https://supabase.com/dashboard) e abra o projeto **`hbqlwwnnbvritknwwzos`**.
2. No menu lateral esquerdo, clique em **Authentication** (Autenticação) > **Providers** (Provedores).
3. Localize **Google** na lista de provedores e clique para expandir as opções.
4. Alterne a chave **Enable Sign in with Google** para **Ativado** (*Enabled*).
5. Preencha os campos obrigatórios:
   - **Client ID (for Web)**: Cole o ID do cliente obtido no Google Cloud Console.
   - **Client Secret (for Web)**: Cole a chave secreta do cliente obtida no Google Cloud Console.
6. Clique no botão **Save** (Salvar) na parte inferior.

---

## 4. Configuração de URLs de Redirecionamento (Redirect URLs)

Para que o JusLegis permita o retorno seguro dos usuários autenticados, configure as URLs de redirecionamento autorizadas no Supabase:

1. No painel do Supabase, vá em **Authentication** > **URL Configuration**.
2. No campo **Site URL**, informe a URL principal de produção do JusLegis:
   ```text
   https://seu-dominio-de-producao.com.br
   ```
3. No campo **Redirect URLs**, adicione todas as URLs de retorno autorizadas (uma por linha):
   ```text
   https://seu-dominio-de-producao.com.br/auth/callback
   https://ais-dev-trzrt6fqt6r6p4kw7ge5ca-11456040753.us-east5.run.app/auth/callback
   http://localhost:3000/auth/callback
   ```
4. Clique em **Save** (Salvar).

---

## 5. Validação e Teste

1. Acesse a página de login do JusLegis (`/login`).
2. Clique no botão **"Continuar com Google"**.
3. O sistema verificará se o provedor está ativo e redirecionará para a tela de login da conta Google.
4. Após a autorização, você será redirecionado de volta para `/auth/callback` e entrará automaticamente no workspace jurídico (`/app`).
