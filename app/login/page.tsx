"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { AppShell } from "@/components/layout/AppShell";
import { Button, Card, Field, inputClass } from "@/components/ritual-ui";
import {
  getCurrentDesigner,
  isSupabaseConfigured,
  resendDesignerEmailConfirmation,
  requestDesignerPasswordReset,
  signInDesigner,
  signUpDesigner,
  updateDesignerPassword
} from "@/lib/auth/designerAuth";
import { mapSignInError, mapSignUpError } from "@/lib/auth/authErrorMessages";
import { useLocale } from "@/lib/i18n/useLocale";

const PASSWORD_MIN_LENGTH = 12;
const USERNAME_MIN_LENGTH = 2;
const USERNAME_MAX_LENGTH = 60;

type FieldErrors = {
  email?: string;
  password?: string;
  username?: string;
};

type AuthMode = "sign-in" | "sign-up" | "reset-request" | "new-password" | "verification-pending";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasSecurePassword(value: string) {
  return value.length >= PASSWORD_MIN_LENGTH && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { messages, href } = useLocale();
  const passwordReset = searchParams.get("reset") === "1";
  const emailConfirmed = searchParams.get("confirmed") === "1";
  const requestedMode = searchParams.get("mode");
  const next = searchParams.get("next") || "/dashboard";
  const [mode, setMode] = useState<AuthMode>(() => passwordReset ? "new-password" : requestedMode === "sign-up" ? "sign-up" : "sign-in");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() => emailConfirmed ? messages.auth.emailConfirmed : null);
  const [pending, setPending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendChallengeOpen, setResendChallengeOpen] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(0);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const requiresCaptcha = Boolean(turnstileSiteKey) && (
    mode === "sign-in" || mode === "sign-up" || mode === "reset-request" || (mode === "verification-pending" && resendChallengeOpen)
  );

  const resendSeconds = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));

  useEffect(() => {
    if (!resendAvailableAt) return;
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= resendAvailableAt) window.clearInterval(timer);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [resendAvailableAt]);

  useEffect(() => {
    if (passwordReset) return;
    void getCurrentDesigner().then((designer) => {
      if (designer) router.replace(href(next));
    });
  }, [href, next, passwordReset, router]);

  function validate() {
    const nextErrors: FieldErrors = {};
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    if (mode !== "new-password" && !trimmedEmail) {
      nextErrors.email = messages.auth.enterEmail;
    } else if (mode !== "new-password" && !isValidEmail(trimmedEmail)) {
      nextErrors.email = messages.auth.validEmail;
    }

    if (mode === "sign-up" && (!trimmedUsername || trimmedUsername.length < USERNAME_MIN_LENGTH || trimmedUsername.length > USERNAME_MAX_LENGTH)) {
      nextErrors.username = messages.auth.usernameInvalid;
    }

    if (mode !== "reset-request" && mode !== "verification-pending" && !password) {
      nextErrors.password = mode === "sign-in" ? messages.auth.enterPassword : messages.auth.createPassword;
    } else if ((mode === "sign-up" || mode === "new-password") && !hasSecurePassword(password)) {
      nextErrors.password = messages.auth.passwordRequirements.replace("{min}", String(PASSWORD_MIN_LENGTH));
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit() {
    if (pending) return;
    if (!validate()) return;
    if (requiresCaptcha && !captchaToken) {
      setFormError(messages.auth.captchaRequired);
      return;
    }

    try {
      setPending(true);
      setFormError(null);
      setNotice(null);
      if (mode === "reset-request") {
        await requestDesignerPasswordReset(email.trim(), captchaToken ?? undefined);
        setNotice(messages.auth.resetPasswordSuccess);
        setMode("sign-in");
        return;
      }
      if (mode === "new-password") {
        await updateDesignerPassword(password);
        setNotice(messages.auth.passwordUpdated);
        router.replace(href(next));
        return;
      }
      if (mode === "sign-in") {
        await signInDesigner(email.trim(), password, captchaToken ?? undefined);
        router.replace(href(next));
      } else {
        const result = await signUpDesigner(email.trim(), password, username.trim(), captchaToken ?? undefined);
        if (result.requiresEmailConfirmation) {
          setPassword("");
          setPendingVerificationEmail(email.trim());
          setResendChallengeOpen(false);
          setMode("verification-pending");
          return;
        }
        router.replace(href(next));
      }
    } catch (authError) {
      setFormError(
        mode === "sign-in"
          ? mapSignInError(authError, messages)
          : mapSignUpError(authError, messages, PASSWORD_MIN_LENGTH)
      );
    } finally {
      setPending(false);
      if (requiresCaptcha) {
        setCaptchaToken(null);
        turnstileRef.current?.reset();
      }
    }
  }

  async function resendConfirmation() {
    if (!pendingVerificationEmail || pending || resendSeconds > 0) return;
    if (requiresCaptcha && !captchaToken) {
      setFormError(messages.auth.captchaRequired);
      return;
    }
    try {
      setPending(true);
      setFormError(null);
      await resendDesignerEmailConfirmation(pendingVerificationEmail, captchaToken ?? undefined);
      setResendAvailableAt(Date.now() + 60_000);
      setNow(Date.now());
      setResendChallengeOpen(false);
      setNotice(messages.auth.resendSuccess);
    } catch (authError) {
      setFormError(mapSignUpError(authError, messages, PASSWORD_MIN_LENGTH));
    } finally {
      setPending(false);
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    }
  }

  return (
    <AppShell compact>
      <Card>
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-mint/25 bg-mint/10 text-mint">
            <Lock size={19} />
          </span>
          <div>
            <h1 className="font-heading text-4xl font-semibold leading-tight text-bone">
              {mode === "sign-up" ? messages.auth.signUpTitle : mode === "verification-pending" ? messages.auth.verificationTitle : messages.auth.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-bone/58">
              {mode === "sign-up" ? messages.auth.signUpBody : mode === "verification-pending" ? messages.auth.verificationBody : messages.auth.body}
            </p>
          </div>
        </div>
        {!isSupabaseConfigured ? (
          <p className="mt-7 rounded-md border border-orange/30 bg-orange/10 p-4 text-sm leading-6 text-bone/72">{messages.auth.supabaseRequired}</p>
        ) : mode === "verification-pending" ? (
          <div className="mt-7 space-y-5">
            <div className="rounded-md border border-mint/20 bg-mint/5 p-4">
              <p className="text-sm font-semibold text-bone">{messages.auth.verificationSentTo}</p>
              <p className="mt-1 break-all text-sm text-mint">{pendingVerificationEmail}</p>
            </div>
            <p className="text-sm leading-6 text-bone/68">{messages.auth.verificationSpamNote}</p>
            {formError ? <p className="text-sm text-orange">{formError}</p> : null}
            {notice ? <p className="text-sm text-mint">{notice}</p> : null}
            {resendChallengeOpen && requiresCaptcha && turnstileSiteKey ? (
              <div className="flex justify-center pt-1">
                <Turnstile
                  key="resend-confirmation"
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  options={{ theme: "dark", language: "auto", size: "flexible" }}
                  onSuccess={(token) => {
                    setCaptchaToken(token);
                    setFormError(null);
                  }}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                />
              </div>
            ) : null}
            {!resendChallengeOpen ? (
              <Button type="button" className="w-full min-h-12" disabled={pending || resendSeconds > 0} onClick={() => {
                setNotice(null);
                setFormError(null);
                if (requiresCaptcha) {
                  setResendChallengeOpen(true);
                  return;
                }
                void resendConfirmation();
              }}>
                {resendSeconds > 0
                  ? messages.auth.resendCooldown.replace("{seconds}", String(resendSeconds))
                  : messages.auth.resendEmail}
              </Button>
            ) : (
              <Button type="button" className="w-full min-h-12" disabled={pending || !captchaToken} onClick={() => void resendConfirmation()}>
                {pending ? messages.app.loading : messages.auth.resendEmail}
              </Button>
            )}
            <button
              type="button"
              disabled={pending}
              className="w-full text-sm font-medium text-bone/62 transition hover:text-bone"
              onClick={() => {
                setCaptchaToken(null);
                setResendChallengeOpen(false);
                setFormError(null);
                setNotice(null);
                setMode("sign-in");
              }}
            >
              {messages.auth.backToSignIn}
            </button>
          </div>
        ) : (
          <form
            className="mt-7 space-y-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {formError ? <p className="text-sm text-orange">{formError}</p> : null}
            {mode === "sign-up" ? <Field label={messages.auth.username}>
              <>
                <input
                  className={inputClass}
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setFieldErrors((current) => ({ ...current, username: undefined }));
                    setFormError(null);
                  }}
                  required
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                  autoComplete="nickname"
                  aria-invalid={Boolean(fieldErrors.username)}
                />
                {fieldErrors.username ? <p className="mt-2 text-sm text-orange">{fieldErrors.username}</p> : null}
              </>
            </Field> : null}
            {mode !== "new-password" ? <Field label={messages.auth.email}>
              <>
                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                    setFormError(null);
                    setNotice(null);
                  }}
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email ? <p className="mt-2 text-sm text-orange">{fieldErrors.email}</p> : null}
              </>
            </Field> : null}
            {mode !== "reset-request" ? <Field label={mode === "new-password" ? messages.auth.newPassword : messages.auth.password}>
              <>
                <input
                  className={inputClass}
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                    setFormError(null);
                    setNotice(null);
                  }}
                  required
                  minLength={mode === "sign-up" || mode === "new-password" ? PASSWORD_MIN_LENGTH : 1}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                {(mode === "sign-up" || mode === "new-password") ? <p className="mt-2 text-xs leading-5 text-bone/52">{messages.auth.passwordRequirements.replace("{min}", String(PASSWORD_MIN_LENGTH))}</p> : null}
                {fieldErrors.password ? <p className="mt-2 text-sm text-orange">{fieldErrors.password}</p> : null}
              </>
            </Field> : null}
            {requiresCaptcha && turnstileSiteKey ? <div className="flex justify-center pt-1">
              <Turnstile
                key={mode}
                ref={turnstileRef}
                siteKey={turnstileSiteKey}
                options={{ theme: "dark", language: "auto", size: "flexible" }}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                  setFormError(null);
                }}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />
            </div> : null}
            {notice ? <p className="text-sm text-mint">{notice}</p> : null}
            <Button className="w-full min-h-12" disabled={pending}>
              {pending
                ? mode === "sign-in"
                  ? messages.auth.signInLoading
                  : mode === "sign-up"
                    ? messages.auth.signUpLoading
                    : messages.app.loading
                : mode === "sign-in"
                  ? messages.auth.signIn
                  : mode === "sign-up"
                    ? messages.auth.signUp
                    : messages.auth.resetPassword}
            </Button>
            {mode === "sign-in" ? <button
              type="button"
              disabled={pending}
              className="w-full text-sm font-medium text-bone/62 transition hover:text-bone"
              onClick={() => {
                setFieldErrors({});
                setFormError(null);
                setNotice(null);
                setPassword("");
                setMode("reset-request");
              }}
            >
              {messages.auth.forgotPassword}
            </button> : null}
            {mode === "sign-in" || mode === "sign-up" ? <button
              type="button"
              disabled={pending}
              className="w-full text-sm font-medium text-bone/62 transition hover:text-bone"
              onClick={() => {
                setFieldErrors({});
                setFormError(null);
                setNotice(null);
                setMode((current) => current === "sign-in" ? "sign-up" : "sign-in");
              }}
            >
              {mode === "sign-in" ? messages.auth.switchToSignUp : messages.auth.switchToSignIn}
            </button> : null}
          </form>
        )}
      </Card>
    </AppShell>
  );
}
