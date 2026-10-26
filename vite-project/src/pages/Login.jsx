import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowRight, ShieldCheck, Eye, EyeOff, Sun, Moon, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { BrandMark } from '../components/Sidebar.jsx';
import { Field } from '../components/Modal.jsx';
import { api } from '../services/api.js';
import { setAccessToken, setRefreshToken, setUser } from '../utils/auth.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { suggestEmail } from '../utils/emailTypo.js';
import { getActiveSeasonYear } from '../utils/season.js';

export default function Login({ onSuccess, navigate, notify }) {
  const { handleSubmit, register, watch, setValue, formState: { errors: formErrors }, setError: setFormError } = useForm();
  const { isDark, toggleTheme } = useTheme();

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dismissedSuggestion, setDismissedSuggestion] = useState('');

  const watchedEmail = watch('email') || '';
  const emailSuggestion = suggestEmail(watchedEmail);

  const submit = async (formData) => {
    if (loading) return;
    setError('');

    // Check for email domain typos before submitting
    const suggestion = suggestEmail(formData.email);
    if (suggestion && dismissedSuggestion !== suggestion) {
      setError(`Did you mean ${suggestion}? Please verify your email.`);
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    const ensureMinLoadingTime = async (minMs = 750) => {
      const elapsed = Date.now() - startTime;
      if (elapsed < minMs) {
        await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
      }
    };

    try {
      const payload = {
        email: formData.email,
        password: formData.password
      };
      const response = await api.post('/api/v1/auth/login', payload);

      const data = response.data;

      await ensureMinLoadingTime(600);

      if (data.success) {
        setAccessToken(data.data.accessToken);
        setRefreshToken(data.data.refreshToken);
        const loggedUser = data.data.user;
        setUser(loggedUser);

        const userName = loggedUser?.fullName || loggedUser?.name;
        const toastMsg = userName
          ? `Login successful! Welcome back, ${userName}.`
          : 'Login successful! Redirecting to dashboard...';

        setSuccessMessage('Login successful! Redirecting...');
        if (notify) {
          notify(toastMsg, 'success');
        }

        setTimeout(() => {
          onSuccess?.(loggedUser);
        }, 500);
      } else {
        setError(data.message || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login request failed:', err);

      await ensureMinLoadingTime(750);

      if (err.response) {
        const data = err.response.data;
        if (err.response.status === 400 && data?.data && typeof data.data === 'object') {
          Object.keys(data.data).forEach((key) => {
            setFormError(key, { type: 'server', message: data.data[key] });
          });
          if (data.message && typeof data.message === 'string' && data.message.toLowerCase().includes('malformed')) {
            setError(data.message);
          } else if (data.message && Object.keys(data.data).length === 0) {
            setError(data.message);
          }
        } else {
          const serverMsg = (data && typeof data === 'object')
            ? (data.message || data.error || data.detail)
            : (typeof data === 'string' && data ? data : null);
          setError(serverMsg || 'Invalid email or password');
        }
      } else {
        setError(err.message || 'Unable to connect to the server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1.05fr_.95fr] bg-[#f4efe3]">
      <div className="hidden lg:flex relative overflow-hidden bg-[#183f35] p-12 text-[#faf5e9] flex-col justify-between">
        <div className="absolute -right-20 -top-28 h-96 w-96 rounded-full border-[32px] border-[#e3a84b]/20" />
        <div className="absolute -bottom-36 -left-20 h-[30rem] w-[30rem] rounded-full border-[46px] border-[#e3a84b]/10" />
        <BrandMark light />
        <div className="relative max-w-xl pb-10">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.22em] text-[#e7b85f]">
            Operations workspace
          </p>
          <h1 className="font-display text-6xl font-extrabold leading-[1.04] tracking-[-.05em]">
            Every share,<br />
            <span className="text-[#e7b85f]">accounted for.</span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-[#d5e2d9]">
            A steady command centre for Buffalo inventory, Hissa capacity and the people your community is serving.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-[#b4cbc0]">
            <ShieldCheck size={18} className="text-[#e7b85f]" /> Built for calm, confident coordination.
          </div>
        </div>
        <p className="text-xs text-[#9fb9ad]">JIH Qurbani Management System · {getActiveSeasonYear()} season</p>
      </div>

      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute top-6 right-6">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            data-testid="button-login-theme-toggle"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d8d0c0] bg-[#f0ebd9]/80 text-[#183f35] transition hover:bg-[#e6dfcb] dark:border-[#22483d] dark:bg-[#152e25] dark:text-[#edf6f2] dark:hover:bg-[#1c3c30]"
          >
            {isDark ? <Sun size={18} className="text-[#f5be4b]" /> : <Moon size={18} className="text-[#2b594b]" />}
          </button>
        </div>
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>
          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[.16em] text-[#b47a21]">
              Welcome back
            </p>
            <h2 className="font-display text-4xl font-extrabold tracking-[-.045em] text-[#183f35]">
              Sign in to your workspace
            </h2>
            <p className="mt-3 leading-7 text-[#66766d]">
              Keep this season’s capacity clear and every booking in its place.
            </p>
          </div>
          <form onSubmit={handleSubmit(submit)} className="card-surface rounded-2xl p-6 sm:p-8">
            <Field label="Email address">
              <input
                data-testid="input-email"
                type="email"
                {...register('email', { required: 'Email is required' })}
                className={`input ${emailSuggestion && dismissedSuggestion !== emailSuggestion ? 'border-amber-400 focus:border-amber-500 dark:border-amber-500/70' : ''}`}
                placeholder="admin@example.com"
                disabled={loading}
              />
              {emailSuggestion && dismissedSuggestion !== emailSuggestion && (
                <div
                  data-testid="warning-email-typo"
                  className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200 animate-in fade-in"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Did you mean{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setValue('email', emailSuggestion);
                          setDismissedSuggestion('');
                        }}
                        className="font-bold underline decoration-amber-600 hover:text-amber-950 dark:hover:text-white"
                      >
                        {emailSuggestion}
                      </button>
                      ?
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setValue('email', emailSuggestion);
                        setDismissedSuggestion('');
                      }}
                      className="rounded-md bg-amber-200/90 px-2 py-0.5 text-[11px] font-bold text-amber-950 transition hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
                    >
                      Fix typo
                    </button>
                    <button
                      type="button"
                      onClick={() => setDismissedSuggestion(emailSuggestion)}
                      className="text-[11px] font-medium text-amber-800/80 hover:text-amber-950 dark:text-amber-300/80 dark:hover:text-white"
                      title="Keep entered email"
                    >
                      Keep as is
                    </button>
                  </div>
                </div>
              )}
              {formErrors.email && (
                <div className="mt-1 text-sm text-[#a63f32]">{formErrors.email.message}</div>
              )}
            </Field>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="block text-xs font-bold uppercase tracking-[.07em] text-[#68776e]">
                  Password
                </span>
                <button
                  type="button"
                  data-testid="link-forgot-password"
                  onClick={() => navigate?.('/forgot-password')}
                  className="text-xs font-bold text-[#246b59] hover:text-[#183f35] hover:underline dark:text-[#56ab93] dark:hover:text-[#a9dfb6]"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  data-testid="input-password"
                  type={showPassword ? "text" : "password"}
                  {...register('password', { required: 'Password is required' })}
                  className="input pr-10"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a948e] hover:text-[#183f35]"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formErrors.password && (
                <div className="mt-1 text-sm text-[#a63f32]">{formErrors.password.message}</div>
              )}
            </div>
            {error && (
              <div
                data-testid="status-login-error"
                className="mt-4 rounded-xl border border-[#efb7ae] bg-[#fff3f0] px-4 py-3 text-sm text-[#a63f32]"
              >
                {error}
              </div>
            )}
            {successMessage && (
              <div
                data-testid="status-login-success"
                className="mt-4 flex items-center gap-2 rounded-xl border border-[#b2ddcf] bg-[#eef8f4] px-4 py-3 text-sm font-semibold text-[#183f35] dark:border-[#225745] dark:bg-[#112d24] dark:text-[#52c99a]"
              >
                <CheckCircle2 size={16} className="shrink-0 text-[#246b59] dark:text-[#52c99a]" />
                <span>{successMessage}</span>
              </div>
            )}
            <button
              data-testid="button-login"
              className="btn-primary mt-6 w-full justify-center py-3.5 disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading || Boolean(successMessage)}
            >
              {successMessage ? (
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-[#a9dfb6]" />
                  <span>Redirecting...</span>
                </span>
              ) : loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={17} className="animate-spin" />
                  <span>Logging in...</span>
                </span>
              ) : (
                <React.Fragment>
                  Enter dashboard <ArrowRight size={17} />
                </React.Fragment>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
