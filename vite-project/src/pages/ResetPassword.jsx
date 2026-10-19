import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  X,
  CheckCircle2,
  Sun,
  Moon,
  Lock,
} from 'lucide-react';
import { BrandMark } from '../components/Sidebar.jsx';
import { Field } from '../components/Modal.jsx';
import { resetPassword } from '../services/authApi.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { getActiveSeasonYear } from '../utils/season.js';

const PASSWORD_REGEX = /^(?=\S{8,100}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/;

export default function ResetPassword({ navigate, notify }) {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors: formErrors },
    setError: setFormError,
  } = useForm({
    defaultValues: {
      token: tokenFromUrl,
      newPassword: '',
      confirmPassword: '',
    },
  });

  const { isDark, toggleTheme } = useTheme();

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      setValue('token', tokenFromUrl);
    }
  }, [tokenFromUrl, setValue]);

  const watchedNewPassword = watch('newPassword') || '';

  // Password rules evaluation for real-time visual feedback
  const rules = [
    { label: 'Between 8 and 100 characters (no spaces)', valid: /^\S{8,100}$/.test(watchedNewPassword) },
    { label: 'At least one uppercase letter (A-Z)', valid: /[A-Z]/.test(watchedNewPassword) },
    { label: 'At least one lowercase letter (a-z)', valid: /[a-z]/.test(watchedNewPassword) },
    { label: 'At least one number (0-9)', valid: /\d/.test(watchedNewPassword) },
    { label: 'At least one special character (!@#$%^&*)', valid: /[^A-Za-z0-9]/.test(watchedNewPassword) },
  ];

  const onSubmit = async (data) => {
    setError('');

    if (data.newPassword !== data.confirmPassword) {
      setFormError('confirmPassword', {
        type: 'manual',
        message: 'Confirm password must match new password',
      });
      return;
    }

    if (!PASSWORD_REGEX.test(data.newPassword)) {
      setFormError('newPassword', {
        type: 'manual',
        message: 'Password must contain uppercase, lowercase, number and special character without spaces',
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        token: data.token.trim(),
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      };

      const res = await resetPassword(payload);

      if (res?.success) {
        setIsSuccess(true);
        if (notify) {
          notify(res.message || 'Password reset successful!', 'success');
        }
      } else {
        setError(res?.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
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
        'Failed to reset password. The link or token may be invalid or expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1.05fr_.95fr] bg-[#f4efe3] dark:bg-[#0c1e18]">
      {/* Left hero banner */}
      <div className="hidden lg:flex relative overflow-hidden bg-[#183f35] p-12 text-[#faf5e9] flex-col justify-between">
        <div className="absolute -right-20 -top-28 h-96 w-96 rounded-full border-[32px] border-[#e3a84b]/20" />
        <div className="absolute -bottom-36 -left-20 h-[30rem] w-[30rem] rounded-full border-[46px] border-[#e3a84b]/10" />
        <BrandMark light />
        <div className="relative max-w-xl pb-10">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.22em] text-[#e7b85f]">
            Operations workspace
          </p>
          <h1 className="font-display text-6xl font-extrabold leading-[1.04] tracking-[-.05em]">
            Set new<br />
            <span className="text-[#e7b85f]">credentials.</span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-[#d5e2d9]">
            Create a strong, secure password to protect administrative operations and community booking data.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-[#b4cbc0]">
            <ShieldCheck size={18} className="text-[#e7b85f]" /> End-to-end authenticated operations.
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
                  Security credentials
                </p>
                <h2 className="font-display text-4xl font-extrabold tracking-[-.045em] text-[#183f35] dark:text-[#edf6f2]">
                  Reset password
                </h2>
                <p className="mt-3 leading-7 text-[#66766d] dark:text-[#8ba79b]">
                  Please enter your reset token and configure your new secure password.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="card-surface rounded-2xl p-6 sm:p-8 space-y-4">
                <Field label="Reset Token">
                  <input
                    data-testid="input-reset-token"
                    type="text"
                    maxLength={200}
                    {...register('token', {
                      required: 'Reset token is required',
                      maxLength: { value: 200, message: 'Reset token is invalid' },
                    })}
                    className="input font-mono text-sm"
                    placeholder="Paste reset token here"
                    disabled={loading}
                  />
                  {formErrors.token && (
                    <div className="mt-1 text-sm text-[#a63f32]">{formErrors.token.message}</div>
                  )}
                  {tokenFromUrl && (
                    <p className="mt-1 text-xs text-[#246b59] dark:text-[#68caa4] flex items-center gap-1 font-medium">
                      <Check size={13} /> Token prefilled from your reset link
                    </p>
                  )}
                </Field>

                <div>
                  <Field label="New Password">
                    <div className="relative">
                      <input
                        data-testid="input-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        maxLength={100}
                        {...register('newPassword', {
                          required: 'New password is required',
                          minLength: { value: 8, message: 'Password must be between 8 and 100 characters' },
                          maxLength: { value: 100, message: 'Password must be between 8 and 100 characters' },
                          pattern: {
                            value: PASSWORD_REGEX,
                            message: 'Password must contain uppercase, lowercase, number and special character',
                          },
                        })}
                        className="input pr-10"
                        placeholder="••••••••"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a948e] hover:text-[#183f35] dark:text-[#8ba79b] dark:hover:text-[#edf6f2]"
                        disabled={loading}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formErrors.newPassword && (
                      <div className="mt-1 text-sm text-[#a63f32]">{formErrors.newPassword.message}</div>
                    )}
                  </Field>

                  {/* Password requirements live checklist */}
                  {watchedNewPassword && (
                    <div className="mt-3 rounded-xl border border-[#d8d0c0] bg-[#f8f5ee] p-3 text-xs dark:border-[#22483d] dark:bg-[#152e25]">
                      <p className="mb-2 font-bold text-[#183f35] dark:text-[#edf6f2]">
                        Password Requirements:
                      </p>
                      <ul className="space-y-1">
                        {rules.map((rule, idx) => (
                          <li
                            key={idx}
                            className={`flex items-center gap-1.5 ${
                              rule.valid
                                ? 'text-[#1e7a55] dark:text-[#52d69f]'
                                : 'text-[#7e8c83] dark:text-[#889f94]'
                            }`}
                          >
                            {rule.valid ? <Check size={13} className="shrink-0" /> : <X size={13} className="shrink-0" />}
                            <span>{rule.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div>
                  <Field label="Confirm Password">
                    <div className="relative">
                      <input
                        data-testid="input-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        maxLength={100}
                        {...register('confirmPassword', {
                          required: 'Confirm password is required',
                          validate: (val) => val === watch('newPassword') || 'Confirm password must match new password',
                        })}
                        className="input pr-10"
                        placeholder="••••••••"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a948e] hover:text-[#183f35] dark:text-[#8ba79b] dark:hover:text-[#edf6f2]"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formErrors.confirmPassword && (
                      <div className="mt-1 text-sm text-[#a63f32]">{formErrors.confirmPassword.message}</div>
                    )}
                  </Field>
                </div>

                {error && (
                  <div
                    data-testid="status-reset-error"
                    className="rounded-xl border border-[#efb7ae] bg-[#fff3f0] px-4 py-3 text-sm text-[#a63f32]"
                  >
                    {error}
                  </div>
                )}

                <button
                  data-testid="button-submit-reset-password"
                  className="btn-primary mt-6 w-full justify-center py-3.5 disabled:opacity-70 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    'Resetting password...'
                  ) : (
                    <>
                      Reset password <ArrowRight size={17} />
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
                Password reset complete
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#66766d] dark:text-[#8ba79b]">
                Your password has been successfully updated. You can now use your new credentials to access the workspace.
              </p>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="btn-primary w-full justify-center py-3.5"
                >
                  <Lock size={17} /> Sign in with new password
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
