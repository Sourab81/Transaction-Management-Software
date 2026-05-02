'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaArrowRight,
  FaCheckCircle,
  FaEnvelope,
  FaLock,
  FaShieldAlt,
} from 'react-icons/fa';
import {
  completeApiLogin,
  updateStoredUser,
} from '../../lib/auth-session';
import type { LoginApiResponseBody } from '../../lib/api/auth';
import { getRoleLabel } from '../../lib/platform-structure';
import { getDefaultWorkspacePath } from '../../lib/workspace-routes';
import styles from './LoginScreen.module.css';

const readLoginErrorMessage = (body: LoginApiResponseBody | null) => {
  const message = body?.message;

  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  if (message && typeof message === 'object') {
    return Object.values(message)
      .map((value) => typeof value === 'string' ? value.trim() : '')
      .filter(Boolean)
      .join(' ');
  }

  return 'Unable to sign in right now. Please try again in a moment.';
};

const isFailedLoginBody = (body: LoginApiResponseBody | null) => {
  if (body?.status === false || body?.status === 'false') {
    return true;
  }

  if (typeof body?.status === 'number') {
    return body.status >= 400;
  }

  if (typeof body?.status === 'string' && /^\d+$/.test(body.status)) {
    return Number(body.status) >= 400;
  }

  return false;
};

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    updateStoredUser(null);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail || password.length === 0) {
      event.preventDefault();
      setStatus('');
      setError('Enter your email and password to continue.');
      return;
    }

    setError('');
    setStatus('Verifying your credentials and loading permissions.');

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: normalizedEmail,
          email: normalizedEmail,
          password,
        }),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null) as LoginApiResponseBody | null;

      if (!response.ok || isFailedLoginBody(body)) {
        throw new Error(readLoginErrorMessage(body));
      }

      const user = completeApiLogin(normalizedEmail, body);
      setError('');
      setStatus(`Verified. Permissions loaded. Opening the ${getRoleLabel(user.role).toLowerCase()} workspace.`);
      router.replace(getDefaultWorkspacePath(user.role));
    } catch (loginError) {
      setStatus('');
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Unable to sign in right now. Please try again in a moment.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.shell}>
      <div className={styles.aurora} aria-hidden="true">
        <span className={styles.orbOne} />
        <span className={styles.orbTwo} />
        <span className={styles.orbThree} />
      </div>

      <section className={styles.panel}>

        <section className={styles.authPanel}>
          <header className={styles.authHeader}>
            <p className={styles.authKicker}>Secure Entry</p>
            <h2 className={styles.authTitle}>Login with your email and password</h2>
          </header>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field} htmlFor="login-email">
              <span className={styles.fieldLabel}>Email Address</span>
              <span className={styles.fieldFrame}>
                <FaEnvelope className={styles.fieldIcon} />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  className={styles.fieldInput}
                  value={email}
                  disabled={isSubmitting}
                  autoComplete="username"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                />
              </span>
            </label>

            <label className={styles.field} htmlFor="login-password">
              <span className={styles.fieldLabel}>Password</span>
              <span className={styles.fieldFrame}>
                <FaLock className={styles.fieldIcon} />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  className={styles.fieldInput}
                  value={password}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                />
              </span>
            </label>

            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              <FaLock />
              {isSubmitting ? 'Verifying Access...' : 'Login'}
              <FaArrowRight />
            </button>

            <div className={styles.messageStack} aria-live="polite">
              {status ? <p className={styles.statusText}>{status}</p> : null}
              {error ? <div className={styles.errorBanner}>{error}</div> : null}
            </div>
          </form>

          <section className={styles.footnote} aria-label="Login notes">
            <div className={styles.footnoteItem}>
              <FaShieldAlt className={styles.footnoteIcon} />
              <span>Credentials are verified through the backend before workspace access is opened.</span>
            </div>
            <div className={styles.footnoteItem}>
              <FaCheckCircle className={styles.footnoteIcon} />
              <span>After login, the saved session keeps routing you into the correct dashboard until logout.</span>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
};

export default LoginScreen;
