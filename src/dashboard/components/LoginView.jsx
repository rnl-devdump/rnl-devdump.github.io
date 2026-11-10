import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../../lib/firebase.js";
import { verifyAdminAuthorization } from "../config/servicesCatalog.js";

export default function LoginView({ unauthorizedUser, onAuthSuccess, onLogout }) {
  const [authTab, setAuthTab] = useState("google"); // 'google' | 'email'
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleGoogleLogin() {
    setIsVerifying(true);
    setAuthError("");
    try {
      if (!auth) throw new Error("Firebase Auth is not initialized.");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      const tokenRes = await cred.user.getIdTokenResult(true);
      if (!verifyAdminAuthorization(cred.user, tokenRes)) {
        setAuthError(
          `Signed in as ${cred.user.email}, which is not an authorized administrator account.`
        );
        return;
      }
      onAuthSuccess(cred.user, tokenRes);
    } catch (err) {
      setAuthError(err.message || "Google sign-in failed.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleEmailLogin(e) {
    if (e) e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      setAuthError("Please enter both admin email and password.");
      return;
    }
    setIsVerifying(true);
    setAuthError("");
    try {
      if (!auth) throw new Error("Firebase Auth is not initialized.");
      const cred = await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      const tokenRes = await cred.user.getIdTokenResult(true);
      if (!verifyAdminAuthorization(cred.user, tokenRes)) {
        await signOut(auth);
        setAuthError(
          "Access denied: this account does not have verified administrator privileges."
        );
        return;
      }
      setEmailInput("");
      setPasswordInput("");
      onAuthSuccess(cred.user, tokenRes);
    } catch (err) {
      setAuthError(err.message || "Firebase authentication failed.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="kiruu-bg min-h-screen text-[#1A1A19] flex flex-col items-center justify-center p-4 selection:bg-[#111827] selection:text-[#fee6e3]">
      <div className="w-full max-w-md kiruu-card p-6 sm:p-8">
        <div className="text-center mb-6">
          <a href="https://kiruu.xyz/" title="Return to kiruu.xyz Portal">
            <img
              src="https://kiruu.xyz/logo.png"
              alt="The Kiruu"
              className="h-16 w-auto mx-auto mb-3 cursor-pointer hover:scale-105 transition-transform"
            />
          </a>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#fee6e3] border-1.5 border-[#111111] text-[#111827] mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            console.kiruu.xyz &bull; Firebase Auth
          </span>
          <h1 className="kiruu-font-display text-2xl sm:text-3xl text-[#111827] tracking-tight">
            KIRUU CONSOLE
          </h1>
          <p className="text-xs font-medium text-[#475569] mt-1">
            Subdomain Control, TAWIR Conversation Monitor &amp; Security Audit
          </p>
        </div>

        {unauthorizedUser && (
          <div className="mb-5 p-3.5 rounded-lg bg-amber-50 border-1.5 border-amber-700 text-amber-900 text-xs font-semibold">
            <p>
              Signed in as <strong className="font-mono">{unauthorizedUser.email}</strong>, which
              lacks the <code className="font-mono">admin</code> claim or verified allowlist status.
            </p>
            <button
              type="button"
              onClick={onLogout}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded bg-amber-800 text-white font-bold hover:bg-amber-900 cursor-pointer"
            >
              Sign out &amp; switch account
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 p-1 mb-5 bg-slate-100 rounded-lg border-1.5 border-[#111111]">
          <button
            type="button"
            onClick={() => {
              setAuthTab("google");
              setAuthError("");
            }}
            className={`py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
              authTab === "google"
                ? "bg-[#111827] text-white shadow-xs"
                : "text-[#475569] hover:text-[#111827]"
            }`}
          >
            Google Sign-In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab("email");
              setAuthError("");
            }}
            className={`py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
              authTab === "email"
                ? "bg-[#111827] text-white shadow-xs"
                : "text-[#475569] hover:text-[#111827]"
            }`}
          >
            Admin Email
          </button>
        </div>

        {authTab === "google" ? (
          <div className="space-y-4">
            <p className="text-xs text-[#475569] leading-relaxed">
              Authenticate with your verified administrator Google account. All changes are verified
              by Cloud Firestore security rules and recorded in the append-only audit log.
            </p>
            {authError && (
              <div className="p-3 rounded-lg bg-red-50 border-1.5 border-red-600 text-red-700 text-xs font-semibold">
                {authError}
              </div>
            )}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isVerifying}
              className="kiruu-btn w-full min-h-[46px] text-sm font-bold flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 19.9 7.4 23 12 23z"
                />
              </svg>
              {isVerifying ? "Verifying Administrator..." : "Continue with Google"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5"
              >
                Verified Admin Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@kiruu.xyz"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border-2 border-[#111111] text-[#111827] placeholder-[#64748b] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#111827]"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter Firebase password..."
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 pr-11 rounded-lg bg-white border-2 border-[#111111] text-[#111827] placeholder-[#64748b] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#475569] hover:text-[#111827] cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-red-50 border-1.5 border-red-600 text-red-700 text-xs font-semibold">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="kiruu-btn w-full min-h-[46px] text-sm font-bold disabled:opacity-50"
            >
              {isVerifying ? "Signing In..." : "Sign In with Firebase Auth"}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-300 flex items-center justify-between text-xs text-[#475569]">
          <span>Server-Enforced Firestore Rules</span>
          <a
            href="https://kiruu.xyz/"
            className="inline-flex items-center gap-1 font-bold text-[#111827] hover:underline"
          >
            &larr; Return to kiruu.xyz
          </a>
        </div>
      </div>
    </div>
  );
}
