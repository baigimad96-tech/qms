import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, Sun, Moon, KeyRound, AlertTriangle, Loader2 } from 'lucide-react';
import { BrandMark } from '../components/Sidebar.jsx';
import { Field } from '../components/Modal.jsx';
import { requestPasswordReset } from '../services/authApi.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { suggestEmail } from '../utils/emailTypo.js';
import { getActiveSeasonYear } from '../utils/season.js';

export default function ForgotPassword({ navigate, notify }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors: formErrors },
    setError: setFormError,
  } = useForm();
  const { isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [dismissedSuggestion, setDismissedSuggestion] = useState('');

  const watchedEmail = watch('email') || '';
  const emailSuggestion = suggestEmail(watchedEmail);

  const onSubmit = async (data) => {
    if (loading) return;
    setError('');

    // Check for domain typos before submitting
    const suggestion = suggestEmail(data.email?.trim());
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
      const res = await requestPasswordReset(data.email.trim());
      await ensureMinLoadingTime(600);
      if (res?.success) {
        setSubmittedEmail(data.email.trim());
        setIsSuccess(true);
        if (notify) {
          notify(res.message || 'Password reset link sent.', 'success');
        }
      } else {
        setError(res?.message || 'Unable to process request.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      await ensureMinLoadingTime(750);
      const resData = err.response?.data;
      if (resData?.data && typeof resData.data === 'object') {
        Object.keys(resData.data).forEach((key) => {
          setFormError(key, { type: 'server', message: resData.data[key] });
        });
      }
      setError(
        resData?.message ||
        resData?.error ||
        err.message ||
        'Unable to send reset email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1.05fr_.95fr] bg-[#f4efe3] dark:bg-[#0c1e18]">
      {/* Left hero banner (consistent with Login) */}
      <div className="hidden lg:flex relative overflow-hidden bg-[#183f35] p-12 text-[#faf5e9] flex-col justify-between">
        <div className="absolute -right-20 -top-28 h-96 w-96 rounded-full border-[32px] border-[#e3a84b]/20" />
        <div className="absolute -bottom-36 -left-20 h-[30rem] w-[30rem] rounded-full border-[46px] border-[#e3a84b]/10" />
        <BrandMark light />
        <div className="relative max-w-xl pb-10">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.22em] text-[#e7b85f]">
            Operations workspace
          </p>
          <h1 className="font-display text-6xl font-extrabold leading-[1.04] tracking-[-.05em]">
            Account<br />
            <span className="text-[#e7b85f]">recovery.</span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-[#d5e2d9]">
            Safely reset your workspace password to regain access to bookings, stock, and animal inventory.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-[#b4cbc0]">
            <ShieldCheck size={18} className="text-[#e7b85f]" /> Secure verification with reset token.
          </div>
        </div>
        <p className="text-xs text-[#9fb9ad]">JIH Qurbani Management System · {getActiveSeasonYear()} season</p>
      </div>

      {/* Right form container */}
      <div className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute top-6 right-6">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d8d0c0] bg-[#f0ebd9]/80 text-[#183f35] transition hover:bg-[#e6dfcb] dark:border-[#22483d] dark:bg-[#152e25] dark:text-[#edf6f2] dark:hover:bg-[#1c3c30]"
          >
            {isDark ? <Sun size={18} className="text-[#f5be4b]" /> : <Moon size={18} className="text-[#2b594b]" />}
          </button>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>

          {!isSuccess ? (
            <>
              <div className="mb-8">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[.16em] text-[#b47a21]">
                  Account recovery
                </p>
                <h2 className="font-display text-4xl font-extrabold tracking-[-.045em] text-[#183f35] dark:text-[#edf6f2]">
                  Forgot password?
                </h2>
                <p className="mt-3 leading-7 text-[#66766d] dark:text-[#8ba79b]">
                  Enter the email address associated with your account, and we’ll send a password reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="card-surface rounded-2xl p-6 sm:p-8">
                <Field label="Email address">
                  <input
                    data-testid="input-forgot-email"
                    type="email"
                    maxLength={100}
                    {...register('email', {
                      required: 'Email is required',
                      maxLength: { value: 100, message: 'Email cannot exceed 100 characters' },
                      pattern: {
                        value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                        message: 'Email must be in a valid format',
                      },
                    })}
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

                {error && (
                  <div
                    data-testid="status-forgot-error"
                    className="mt-4 rounded-xl border border-[#efb7ae] bg-[#fff3f0] px-4 py-3 text-sm text-[#a63f32]"
                  >
                    {error}
                  </div>
                )}

                <button
                  data-testid="button-send-reset-link"
                  className="btn-primary mt-6 w-full justify-center py-3.5 disabled:opacity-70 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={17} className="animate-spin" />
                      <span>Sending reset link...</span>
                    </span>
                  ) : (
                    <>
                      Send reset link <ArrowRight size={17} />
                    </>
                  )}
                </button>

                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#66766d] hover:text-[#183f35] dark:text-[#8ba79b] dark:hover:text-[#edf6f2]"
                  >
                    <ArrowLeft size={15} /> Back to sign in
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="card-surface rounded-2xl p-6 sm:p-8 text-center">
              <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#e3f4eb] text-[#1b7a54] dark:bg-[#16382b] dark:text-[#4edea3]">
                <CheckCircle2 size={30} />
              </div>

              <h2 className="font-display text-2xl font-extrabold text-[#183f35] dark:text-[#edf6f2]">
                Check your inbox
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#66766d] dark:text-[#8ba79b]">
                If an account exists for <span className="font-bold text-[#183f35] dark:text-[#edf6f2]">{submittedEmail}</span>, a password reset link has been dispatched.
              </p>

              <div className="mt-5 rounded-xl border border-[#d8d0c0] bg-[#f8f5ee] p-4 text-left text-xs text-[#5f6f65] dark:border-[#22483d] dark:bg-[#152e25] dark:text-[#9bb7ab] space-y-1.5">
                <p className="font-semibold text-[#183f35] dark:text-[#edf6f2]">
                  Next steps & delivery tips:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[#66766d] dark:text-[#8ba79b]">
                  <li>Check your <strong>Inbox</strong>, <strong>Spam</strong>, or <strong>Junk</strong> folders if the message doesn't appear right away.</li>
                  <li>Click the link inside the email, or enter the verification code directly below.</li>
                </ul>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  data-testid="button-enter-reset-code"
                  onClick={() => navigate('/reset-password')}
                  className="btn-primary w-full justify-center py-3.5"
                >
                  <KeyRound size={17} /> Enter verification code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setError('');
                  }}
                  className="btn-secondary w-full justify-center py-3"
                >
                  Didn't receive email? Try again
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-[#66766d] hover:text-[#183f35] dark:text-[#8ba79b] dark:hover:text-[#edf6f2] pt-1"
                >
                  <ArrowLeft size={15} /> Back to sign in
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
