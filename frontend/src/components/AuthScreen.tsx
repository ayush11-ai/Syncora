import { useState } from "react";
import { API_BASE_URL, type AuthMode, type UserProfile } from "../utils/constants";

interface AuthScreenProps {
  onAuthenticated: (token: string, user: UserProfile) => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (targetMode: AuthMode) => {
    setMode(targetMode);
    setErrorMessage("");
    setSuccessMessage("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (mode === "signup" && password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        const response = await fetch(`${API_BASE_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, confirmPassword }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Registration failed");
        }

        setMode("signin");
        setPassword("");
        setConfirmPassword("");
        setSuccessMessage("Account created successfully! Please sign in.");

      } else {
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Sign in failed");
        }

        onAuthenticated(data.token, data.user);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Unable to connect to server");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <aside className="auth-sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Welcome Back</h1>
          <p className="sidebar-subtitle">Sign in to continue to your workspace</p>
        </div>

        <div className="sidebar-features">
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <div>
              <h3 className="feature-title">Secure Access</h3>
              <p className="feature-desc">Your data is protected with enterprise-grade security</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div>
              <h3 className="feature-title">Fast Performance</h3>
              <p className="feature-desc">Lightning-fast access to all your resources</p>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <p>© 2026 Syncora. All rights reserved.</p>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-form-wrapper">
          <div className="form-header">
            <h2 className="form-title">{mode === "signin" ? "Sign In" : "Register"}</h2>
            <p className="form-subtitle">
              {mode === "signin" ? "Enter your credentials to access your account" : "Create a new account to get started"}
            </p>
          </div>

          {errorMessage && <div className="alert-box error">{errorMessage}</div>}
          {successMessage && <div className="alert-box success">{successMessage}</div>}

          <form onSubmit={handleFormSubmit} className="form-body">
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <input
                  id="password"
                  type="password"
                  placeholder={mode === "signin" ? "Enter your password" : "Create password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            {mode === "signup" && (
              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : mode === "signin" ? "Sign In" : "Register"}
            </button>
          </form>

          <div className="form-footer">
            {mode === "signin" ? (
              <p>Don't have an account? <button type="button" onClick={() => switchMode("signup")}>Register</button></p>
            ) : (
              <p>Already have an account? <button type="button" onClick={() => switchMode("signin")}>Sign In</button></p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}