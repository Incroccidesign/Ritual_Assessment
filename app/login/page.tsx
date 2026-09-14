"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { AppShell } from "@/components/layout/AppShell";
import { Button, Card, Field, inputClass } from "@/components/ritual-ui";
import {
  getCurrentDesigner,
  isSupabaseConfigured,
  requestDesignerPasswordReset,
  signInDesigner,
  signUpDesigner,
  updateDesignerPassword
} from "@/lib/auth/designerAuth";
import { mapSignInError, mapSignUpError } from "@/lib/auth/authErrorMessages";
import { useLocale } from "@/lib/i18n/useLocale";

const PASSWORD_MIN_LENGTH = 6;

type FieldErrors = {
  email?: string;
  password?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  const { messages, href } = useLocale();
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "reset-request" | "new-password">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [next, setNext] = useState("/dashboard");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const requiresCaptcha = Boolean(turnstileSiteKey) && mode !== "new-password";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const passwordReset = params.get("reset") === "1";
    setNext(params.get("next") || "/dashboard");
    const requestedMode = params.get("mode");
    setMode(passwordReset ? "new-password" : requestedMode === "sign-up" ? "sign-up" : "sign-in");
    if (passwordReset) return;
    void getCurrentDesigner().then((designer) => {
      if (designer) router.replace(params.get("next") || href("/dashboard"));
    });
  }, [href, router]);

  function validate() {
    const nextErrors: FieldErrors = {};
    const trimmedEmail = email.trim();

    if (mode !== "new-password" && !trimmedEmail) {
      nextErrors.email = messages.auth.enterEmail;
    } else if (mode !== "new-password" && !isValidEmail(trimmedEmail)) {
      nextErrors.email = messages.auth.validEmail;
    }

    if (mode !== "reset-request" && !password) {
      nextErrors.password = mode === "sign-in" ? messages.auth.enterPassword : messages.auth.createPassword;
    } else if (mode !== "reset-request" && password.length < PASSWORD_MIN_LENGTH) {
      nextErrors.password = messages.auth.passwordMin.replace("{min}", String(PASSWORD_MIN_LENGTH));
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
        const result = await signUpDesigner(email.trim(), password, captchaToken ?? undefined);
        if (result.requiresEmailConfirmation) {
          setMode("sign-in");
          setPassword("");
          setNotice(messages.auth.signUpSuccess);
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

  return (
    <AppShell compact>
      <Card>
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-mint/25 bg-mint/10 text-mint">
            <Lock size={19} />
          </span>
          <div>
            <h1 className="font-heading text-4xl font-semibold leading-tight text-bone">{messages.auth.title}</h1>
            <p className="mt-3 text-sm leading-6 text-bone/58">{messages.auth.body}</p>
          </div>
        </div>
        {!isSupabaseConfigured ? (
          <p className="mt-7 rounded-md border border-orange/30 bg-orange/10 p-4 text-sm leading-6 text-bone/72">{messages.auth.supabaseRequired}</p>
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
                  minLength={PASSWORD_MIN_LENGTH}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
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
