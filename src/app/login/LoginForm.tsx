"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authConfigurationError } from "@/lib/auth-errors";
import { isOAuthProviderEnabled, MIN_PASSWORD_LENGTH, passwordRecoveryRedirect, passwordSignInError, signUpError } from "@/lib/auth-flow";

type Step = "auth" | "code" | "signup-sent" | "recovery-sent" | "new-password";

const inputStyle: React.CSSProperties = {
  height: 44,
  border: "1px solid var(--field)",
  borderRadius: 11,
  padding: "0 14px",
  fontSize: 14,
  outline: 0,
  background: "#fff",
  width: "100%",
};

export default function LoginForm({ configured, initialError, next, recovery }: { configured: boolean; initialError: string | null; next: string; recovery: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [step, setStep] = useState<Step>(recovery ? "new-password" : "auth");
  const [emailMethod, setEmailMethod] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? (configured ? null : "Autenticação ainda não configurada no servidor."));
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const up = mode === "up";

  const supabase = configured ? createClient() : null;
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  function finishLogin(destination = next) {
    router.replace(destination);
    router.refresh();
  }

  function getCallbackUrl() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function google() {
    if (busy) return;
    if (!configured || !supabase) {
      setError("Autenticação ainda não configurada no servidor.");
      return;
    }
    setBusy(true);
    setBusyAction("google");
    setError(null);

    try {
      // Verifica com timeout de 3 segundos se o provedor está habilitado no Supabase
      const isEnabled = await isOAuthProviderEnabled("google", fetch, 3000);
      if (!isEnabled) {
        setError(authConfigurationError({ code: "provider_disabled", message: "provider is not enabled" }, "google"));
        return;
      }

      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getCallbackUrl() },
      });

      if (oauthErr) {
        setError(authConfigurationError(oauthErr, "google"));
        return;
      }

      // Se devolveu URL explícita para redirecionamento
      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch {
      setError("Não foi possível conectar ao serviço de autenticação. Verifique sua conexão e tente novamente.");
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function signInWithPassword() {
    if (busy) return;
    if (!validEmail || !password) {
      setError("Informe um e-mail e uma senha válidos.");
      return;
    }
    if (!configured || !supabase) {
      setError("Autenticação ainda não configurada no servidor.");
      return;
    }
    setBusy(true);
    setBusyAction("password");
    setError(null);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInErr) {
        setError(passwordSignInError(signInErr.status));
        return;
      }
      finishLogin();
    } catch {
      setError("Erro ao autenticar. Tente novamente em instantes.");
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function signUp() {
    if (busy) return;
    if (!validEmail) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (!configured || !supabase) {
      setError("Autenticação ainda não configurada no servidor.");
      return;
    }
    setBusy(true);
    setBusyAction("signup");
    setError(null);
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: getCallbackUrl() },
      });
      if (signUpErr) {
        setError(signUpError(signUpErr));
        return;
      }
      if (data.session) {
        finishLogin();
        return;
      }
      setStep("signup-sent");
    } catch {
      setError("Erro ao criar conta. Tente novamente em instantes.");
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function sendCode() {
    if (busy) return;
    if (!validEmail) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (!configured || !supabase) {
      setError("Autenticação ainda não configurada no servidor.");
      return;
    }
    setBusy(true);
    setBusyAction("code");
    setError(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: up, emailRedirectTo: `${origin}/auth/callback` },
      });
      if (otpErr) {
        const message = otpErr.code === "user_not_found" || /user not found/i.test(otpErr.message)
          ? "Não encontramos uma conta com este e-mail. Use “Criar conta”."
          : authConfigurationError(otpErr, "email");
        setError(message);
        return;
      }
      setCode("");
      setStep("code");
    } catch {
      setError("Erro ao enviar código. Tente novamente em instantes.");
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function sendPasswordRecovery() {
    if (busy) return;
    if (!validEmail) {
      setError("Informe o e-mail da sua conta.");
      return;
    }
    if (!configured || !supabase) {
      setError("Autenticação ainda não configurada no servidor.");
      return;
    }
    setBusy(true);
    setBusyAction("recovery");
    setError(null);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: passwordRecoveryRedirect(origin),
      });
      if (resetErr) {
        setError(resetErr.status === 429 ? "Muitas tentativas. Aguarde alguns instantes e tente de novo." : "Não foi possível enviar o link de recuperação. Tente novamente.");
        return;
      }
      setStep("recovery-sent");
    } catch {
      setError("Não foi possível enviar o link de recuperação. Tente novamente.");
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function updatePassword() {
    if (busy) return;
    if (newPassword.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (!configured || !supabase) {
      setError("Autenticação ainda não configurada no servidor.");
      return;
    }
    setBusy(true);
    setBusyAction("update-password");
    setError(null);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        setError("Não foi possível atualizar a senha. Solicite um novo link de recuperação.");
        return;
      }
      finishLogin("/app");
    } catch {
      setError("Não foi possível atualizar a senha. Tente novamente.");
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function verify() {
    if (busy) return;
    if (!configured || !supabase || code.length < 6) {
      setError("Informe o código de 6 dígitos.");
      return;
    }
    setBusy(true);
    setBusyAction("verify");
    setError(null);
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
      if (verifyErr) {
        setError("Código inválido ou expirado. Solicite um novo código.");
        return;
      }
      finishLogin();
    } catch {
      setError("Erro ao verificar código. Tente novamente.");
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  return (
    <div style={{ width: 400, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      {step === "auth" ? (
        <>
          <div>
            <h2 className="serif" style={{ margin: 0, fontSize: 36, fontWeight: 600 }}>
              {up ? "Criar conta" : "Entrar"}
            </h2>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
              {up ? "Comece um teste gratuito de 72 horas, sem cartão e sem cobrança automática." : "Acesse seu workspace jurídico."}
            </div>
          </div>
          <button
            type="button"
            onClick={google}
            disabled={!configured || busy}
            className="btn btn-outline"
            style={{ height: 46, borderRadius: 11, fontSize: 14, gap: 10, width: "100%" }}
            aria-busy={busyAction === "google"}
          >
            {busyAction === "google" ? (
              <>
                <span className="spinner" />
                <span>Entrando…</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#17191C" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
                <span>Continuar com Google</span>
              </>
            )}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--muted)" }}>
            <span style={{ flex: 1, height: 1, background: "#E3DFD6" }} />
            ou
            <span style={{ flex: 1, height: 1, background: "#E3DFD6" }} />
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
            E-mail
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && (up ? signUp() : emailMethod === "code" ? sendCode() : signInWithPassword())}
              placeholder="seu@email.com.br"
              type="email"
              autoComplete="email"
              style={inputStyle}
              disabled={busy}
            />
          </label>
          {(up || emailMethod === "password") && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
              Senha
              <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
                <input
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && (up ? signUp() : signInWithPassword())}
                  type={showPassword ? "text" : "password"}
                  autoComplete={up ? "new-password" : "current-password"}
                  placeholder={up ? `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres` : undefined}
                  style={{ ...inputStyle, paddingRight: 42 }}
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                  title={showPassword ? "Ocultar senha" : "Exibir senha"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--muted)",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>
          )}
          {error && <div style={{ fontSize: 12.5, color: "var(--red)", lineHeight: 1.5 }}>{error}</div>}
          <button
            type="button"
            onClick={up ? signUp : emailMethod === "code" ? sendCode : signInWithPassword}
            disabled={!configured || busy}
            className="btn btn-dark"
            style={{ height: 46, borderRadius: 11, fontSize: 14, width: "100%" }}
            aria-busy={busy && busyAction !== "google"}
          >
            {busy && busyAction !== "google" ? (
              <>
                <span className="spinner" />
                <span>Entrando…</span>
              </>
            ) : null}
            {!busy || busyAction === "google" ? (up ? "Criar conta" : emailMethod === "code" ? "Enviar código por e-mail" : "Entrar") : null}
          </button>
          {!up && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              {emailMethod === "password" ? (
                <button type="button" onClick={sendPasswordRecovery} disabled={!configured || busy} style={{ color: "var(--bronze)" }}>Esqueci minha senha</button>
              ) : <span />}
              <button
                type="button"
                onClick={() => { setEmailMethod(emailMethod === "password" ? "code" : "password"); setError(null); }}
                disabled={busy}
                style={{ color: "var(--bronze)" }}
              >
                {emailMethod === "password" ? "Entrar com código" : "Entrar com senha"}
              </button>
            </div>
          )}
          <div style={{ fontSize: 13, color: "var(--muted-2)", textAlign: "center" }}>
            {up ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(up ? "in" : "up");
                setEmailMethod("password");
                setError(configured ? null : error);
              }}
              style={{ color: "var(--bronze)", fontWeight: 600 }}
            >
              {up ? "Entrar" : "Criar conta"}
            </button>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
            Sem CPF, telefone ou endereço. Teste gratuito de 72 horas, sem cartão.
          </div>
        </>
      ) : step === "code" ? (
        <>
          <div>
            <h2 className="serif" style={{ margin: 0, fontSize: 34, fontWeight: 600 }}>
              Confirme seu e-mail
            </h2>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
              Informe o código de verificação enviado para <b style={{ color: "var(--ink)" }}>{email}</b>.
            </div>
          </div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && verify()}
            maxLength={6}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            style={{ ...inputStyle, height: 52, textAlign: "center", fontSize: 24, letterSpacing: ".4em" }}
            disabled={busy}
          />
          <button type="button" onClick={verify} disabled={busy} className="btn btn-dark" style={{ height: 46, borderRadius: 11, fontSize: 14, width: "100%" }}>
            {busy ? (
              <>
                <span className="spinner" />
                <span>Entrando…</span>
              </>
            ) : "Verificar código"}
          </button>
          {error && <div className="alert-err">{error}</div>}
          <button type="button" onClick={() => { setStep("auth"); setError(null); }} style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
            Usar outro e-mail
          </button>
        </>
      ) : step === "signup-sent" ? (
        <>
          <h2 className="serif" style={{ margin: 0, fontSize: 34, fontWeight: 600 }}>Confirme seu e-mail</h2>
          <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
            Enviamos um link de confirmação para <b style={{ color: "var(--ink)" }}>{email}</b>. Abra o e-mail e clique no link para ativar sua conta. Depois é só entrar com seu e-mail e senha.
          </div>
          <button
            type="button"
            onClick={() => { setMode("in"); setEmailMethod("password"); setStep("auth"); setError(null); }}
            className="btn btn-outline"
            style={{ height: 46, borderRadius: 11, width: "100%" }}
          >
            Voltar para entrar
          </button>
        </>
      ) : step === "recovery-sent" ? (
        <>
          <h2 className="serif" style={{ margin: 0, fontSize: 34, fontWeight: 600 }}>Confira seu e-mail</h2>
          <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
            Se houver uma conta para <b style={{ color: "var(--ink)" }}>{email}</b>, enviaremos um link para redefinir sua senha.
          </div>
          <button type="button" onClick={() => { setStep("auth"); setError(null); }} className="btn btn-outline" style={{ height: 46, borderRadius: 11, width: "100%" }}>Voltar ao login</button>
        </>
      ) : (
        <>
          <h2 className="serif" style={{ margin: 0, fontSize: 34, fontWeight: 600 }}>Crie uma nova senha</h2>
          <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>Use pelo menos 8 caracteres para proteger sua conta.</div>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
            Nova senha
            <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
              <input
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && updatePassword()}
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: 42 }}
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? "Ocultar nova senha" : "Exibir nova senha"}
                title={showNewPassword ? "Ocultar nova senha" : "Exibir nova senha"}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted)",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showNewPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          {error && <div className="alert-err">{error}</div>}
          <button type="button" onClick={updatePassword} disabled={!configured || busy} className="btn btn-dark" style={{ height: 46, borderRadius: 11, fontSize: 14, width: "100%" }}>
            {busy ? (
              <>
                <span className="spinner" />
                <span>Atualizando…</span>
              </>
            ) : "Atualizar senha"}
          </button>
        </>
      )}
    </div>
  );
}
