'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaArrowRight,
  FaCheckCircle,
  FaEnvelope,
  FaLock,
  FaShieldAlt,
} from 'react-icons/fa';
import {
  clearServerAuthSession,
  completeApiLogin,
  loginWithDummyCredentials,
  updateStoredUser,
} from '../../lib/auth-session';
import { loginWithServerAction } from '../../app/login/actions';
import { getRoleLabel } from '../../lib/platform-structure';
import { getDefaultWorkspacePath } from '../../lib/workspace-routes';
import styles from './LoginScreen.module.css';

const LoginScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      event.preventDefault();
      setStatus('');
      setError('Enter your email and password to continue.');
      return;
    }

    setError('');
    setStatus('Verifying your credentials and loading departments.');

    try {
      const temporaryAdminUser = loginWithDummyCredentials(
        'Admin',
        normalizedEmail,
        normalizedPassword,
      );

      if (temporaryAdminUser) {
        event.preventDefault();
        await clearServerAuthSession();
        updateStoredUser(temporaryAdminUser);
        setStatus('Temporary admin access granted. Opening the admin workspace.');
        setError('');
        router.replace(getDefaultWorkspacePath());
        return;
      }

      setIsSubmitting(true);
      const formData = new FormData();
      formData.set('email', normalizedEmail);
      formData.set('password', normalizedPassword);

      const loginResult = await loginWithServerAction(
        {
          ok: false,
          body: null,
          message: '',
          statusCode: undefined,
          email: '',
          submitted: false,
        },
        formData,
      );

      if (!loginResult.ok) {
        throw new Error(
          loginResult.message || 'Unable to sign in right now. Please try again in a moment.',
        );
      }

      const user = completeApiLogin(loginResult.email, loginResult.body);
      setError('');
      setStatus(`Verified. Departments loaded. Opening the ${getRoleLabel(user.role).toLowerCase()} workspace.`);
      router.replace(getDefaultWorkspacePath());
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
              <span>Business and employee credentials use backend verification. Admin access stays available through a temporary local login.</span>
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
