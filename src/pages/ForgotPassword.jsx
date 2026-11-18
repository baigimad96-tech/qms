import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, Sun, Moon, KeyRound } from 'lucide-react';
import { BrandMark } from '../components/Sidebar.jsx';
import { Field } from '../components/Modal.jsx';
import { requestPasswordReset } from '../services/authApi.js';
import { useTheme } from '../context/ThemeContext.jsx';

export default function ForgotPassword({ navigate, notify }) {
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
    setError: setFormError,
  } = useForm();
  const { isDark, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);

    try {
      const res = await requestPasswordReset(data.email.trim());
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
        <p className="text-xs text-[#9fb9ad]">JIH Qurbani Management System · 2025 season</p>
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
                    className="input"
                    placeholder="admin@example.com"
                    disabled={loading}
                  />
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
                    'Sending reset link...'
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

              <div className="mt-6 rounded-xl border border-[#d8d0c0] bg-[#f8f5ee] p-4 text-left text-xs text-[#5f6f65] dark:border-[#22483d] dark:bg-[#152e25] dark:text-[#9bb7ab]">
                <p className="font-semibold text-[#183f35] dark:text-[#edf6f2] mb-1">
                  Received a reset token?
                </p>
                <p>
                  You can enter your token directly to set a new password, or click the link in your email.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/reset-password')}
                  className="btn-primary w-full justify-center py-3.5"
                >
                  <KeyRound size={17} /> Enter reset token
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="btn-secondary w-full justify-center py-3.5"
                >
                  <ArrowLeft size={16} /> Back to sign in
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
