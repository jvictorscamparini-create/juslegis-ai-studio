# Guia de Configuração do Google OAuth no Supabase

Este documento descreve o passo a passo necessário para o proprietário do projeto habilitar a autenticação via Google no painel do Supabase para o projeto **`hbqlwwnnbvritknwwzos`**.

---

## Passo 1: Obter Credenciais OAuth no Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto ou selecione um projeto existente.
3. No menu lateral, navegue até **APIs e Serviços** > **Tela de consentimento OAuth** (OAuth consent screen).
   - Escolha o tipo de usuário **Externo** (External) e clique em **Criar**.
   - Preencha o nome do aplicativo (ex: *JusLegis*), seu e-mail de suporte e o e-mail de contato do desenvolvedor. Salve e avance.
4. Navegue até **Credenciais** (Credentials) > **Criar credenciais** (Create credentials) > **ID do cliente OAuth** (OAuth client ID).
5. Selecione o tipo de aplicativo **Aplicativo da Web** (Web application).
6. Defina um nome para o cliente (ex: *JusLegis Supabase Auth*).
7. Em **URIs de redirecionamento autorizados** (Authorized redirect URIs), adicione:
   - `https://hbqlwwnnbvritknwwzos.supabase.co/auth/v1/callback`
8. Clique em **Criar** (Create).
9. Copie o **Client ID** (ID do cliente) e o **Client Secret** (Chave secreta do cliente).

---

## Passo 2: Configurar o Provedor Google no Painel do Supabase

1. Acesse o [Painel da Supabase](https://supabase.com/dashboard) e selecione o projeto **`hbqlwwnnbvritknwwzos`**.
2. No menu lateral esquerdo, clique em **Authentication** (Autenticação) > **Providers** (Provedores).
3. Localize **Google** na lista de provedores e clique para expandir.
4. Alterne o interruptor **Enable Sign in with Google** para **Ativado** (Enabled).
5. Insira os dados obtidos no Google Cloud Console:
   - **Client ID (for Web)**: Cole o ID do cliente copiado no Passo 1.
   - **Client Secret (for Web)**: Cole a chave secreta copiada no Passo 1.
6. Clique em **Save** (Salvar).

---

## Passo 3: Configurar as URLs de Redirecionamento (Redirect URLs)

Para garantir que o fluxo de login redirecione corretamente o usuário após a autenticação com o Google, adicione as URLs permitidas no Supabase:

1. No painel do Supabase, vá em **Authentication** > **URL Configuration**.
2. No campo **Site URL**, informe a URL principal de produção (ex: `https://juslegis.com.br` ou a URL do seu domínio).
3. No campo **Redirect URLs**, adicione todas as URLs de callback permitidas (uma por linha):
   - `https://<seu-dominio-de-producao.com>/auth/callback`
   - `https://ais-dev-trzrt6fqt6r6p4kw7ge5ca-11456040753.us-east5.run.app/auth/callback` *(URL atual de desenvolvimento/preview)*
   - `http://localhost:3000/auth/callback` *(Para testes locais)*
4. Clique em **Save** (Salvar).

---

## Conclusão

Após concluir estes passos, o botão **"Continuar com Google"** na página de login do JusLegis (`/login`) direcionará o usuário para a autenticação do Google e retornará autenticado com segurança para o workspace jurídico.
