import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, Globe, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Register = () => {
  const { language, setLanguage, isHindi, t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [role, setRole] = useState('NGO');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, isAuthenticated, isLoading, register } = useAuth();
  const navigate = useNavigate();

  // If user is already authenticated, redirect to their role-specific dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const userRole = (user.role || 'ADMIN').toUpperCase();
      if (userRole === 'DRIVER') {
        navigate('/shipments', { replace: true });
      } else if (userRole === 'NGO') {
        navigate('/orders', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center">
        <LoadingSpinner size="lg" text="Authenticating Session..." />
      </div>
    );
  }

  const validate = () => {
    let isValid = true;

    if (!name) {
      setNameError(t('fullNameRequired', 'Full name is required'));
      isValid = false;
    } else if (name.length < 2 || name.length > 60) {
      setNameError(t('nameLengthError', 'Name must be between 2 and 60 characters long'));
      isValid = false;
    } else {
      setNameError('');
    }

    if (!email) {
      setEmailError(t('pleaseEnterEmail', 'Please enter your email'));
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError(t('validEmailError', 'Please enter a valid email address'));
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError(t('pleaseEnterPassword', 'Please enter your password'));
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError(t('passwordMinLengthError', 'Password must be at least 6 characters long'));
      isValid = false;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmPasswordError(t('confirmPasswordRequired', 'Please confirm your password'));
      isValid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError(t('passwordsDoNotMatch', 'Passwords do not match'));
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) return;

    setLoading(true);
    const result = await register(name, email, password, role);
    setLoading(false);

    if (result.success) {
      const userRole = result.user?.role || role;
      if (userRole === 'DRIVER') {
        navigate('/shipments');
      } else if (userRole === 'NGO') {
        navigate('/orders');
      } else {
        navigate('/dashboard');
      }
    } else {
      setApiError(result.message || t('registrationFailed', 'Registration request failed'));
    }
  };

  return (
    <div className="min-h-screen bg-darkBg flex items-center justify-center p-4 md:p-6 relative overflow-hidden select-none text-customText">
      {/* Subtle Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-customPrimary/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Centered Register Card */}
      <div className="w-full max-w-md bg-darkCard/80 border border-darkBorder rounded-2xl p-8 shadow-2xl backdrop-blur-xl z-10 relative space-y-6">
        
        {/* Top Header Row: Logo & Brand + Language Switcher */}
        <div className="flex items-center justify-between border-b border-darkBorder/40 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-customPrimary/10 border border-customPrimary/30 rounded-xl text-customPrimary shadow-[0_0_12px_rgba(168,85,247,0.2)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm tracking-wider uppercase leading-none neon-text-purple">Smart Logistics</h2>
              <span className="text-[9px] text-customPrimary font-semibold uppercase tracking-widest block mt-1">SIH26002</span>
            </div>
          </div>

          {/* Language Switcher: 🌐 EN | हिंदी */}
          <div className="flex items-center gap-1.5 bg-darkBgSecondary/80 border border-darkBorder rounded-lg px-2.5 py-1 text-xs font-semibold shadow-inner">
            <Globe className="w-3.5 h-3.5 text-customPrimary shrink-0" />
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-customPrimary text-customText font-bold shadow-xs'
                  : 'text-customMuted hover:text-customText'
              }`}
              aria-label="Switch to English"
            >
              EN
            </button>
            <span className="text-darkBorder font-mono">|</span>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                language === 'hi'
                  ? 'bg-customPrimary text-customText font-bold shadow-xs'
                  : 'text-customMuted hover:text-customText'
              }`}
              aria-label="Switch to Hindi"
            >
              हिंदी
            </button>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1.5 pt-1">
          <h1 className="text-2xl font-bold tracking-tight text-customText">
            {t('createAccount', 'Create Account')}
          </h1>
          <p className="text-xs text-customMuted leading-relaxed">
            {t('createAccountSubtitle', 'Create your account to access the Smart Logistics platform.')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {apiError && (
            <div className="p-3.5 bg-customDanger/10 border border-customDanger/30 text-customDanger rounded-xl text-xs font-semibold" role="alert">
              {apiError}
            </div>
          )}

          {/* Full Name field */}
          <div className="space-y-1">
            <Input
              label={t('fullName', 'FULL NAME')}
              placeholder={t('enterFullName', 'Enter your full name')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError('');
                setApiError('');
              }}
              error={nameError}
              required
            />
          </div>

          {/* Email field */}
          <div className="space-y-1">
            <Input
              label={t('emailAddress', 'EMAIL ADDRESS')}
              type="email"
              placeholder={t('enterYourEmail', 'Enter your email')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
                setApiError('');
              }}
              error={emailError}
              required
            />
          </div>

          {/* Select Role field */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-customText uppercase tracking-wider">
              {t('selectRole', 'SELECT ROLE')}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-darkBgSecondary border border-darkBorder rounded-lg px-3.5 py-2.5 text-xs text-customText focus:outline-none focus:border-customPrimary transition-colors cursor-pointer"
            >
              <option value="NGO">{t('roleNgo', 'Relief NGO')}</option>
              <option value="DRIVER">{t('roleDriver', 'Logistics Driver')}</option>
              <option value="ADMIN">{t('roleAdmin', 'System Admin')}</option>
            </select>
          </div>

          {/* Password field */}
          <div className="space-y-1 relative">
            <Input
              label={t('password', 'PASSWORD')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
                setApiError('');
              }}
              error={passwordError}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[32px] text-customMuted hover:text-customText outline-none cursor-pointer p-1"
              aria-label={showPassword ? t('hidePassword', 'Hide password') : t('showPassword', 'Show password')}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm Password field */}
          <div className="space-y-1 relative">
            <Input
              label={t('confirmPassword', 'CONFIRM PASSWORD')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('confirmPasswordPlaceholder', 'Re-enter password')}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmPasswordError('');
                setApiError('');
              }}
              error={confirmPasswordError}
              required
            />
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full mt-3 py-3 text-xs font-bold uppercase tracking-wider gap-2 justify-center cursor-pointer shadow-lg shadow-customPrimary/10 rounded-xl"
            disabled={loading}
            loading={loading}
          >
            <span>{loading ? t('creatingAccount', 'Creating account...') : t('createAccount', 'Create Account')}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        {/* Footer Sign In link */}
        <div className="text-center text-xs text-customMuted border-t border-darkBorder/40 pt-4">
          {t('alreadyHaveAccount', 'Already have an account?')}{' '}
          <Link to="/login" className="text-customPrimary hover:underline font-semibold transition-colors ml-1">
            {t('signIn', 'Sign In')}
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
