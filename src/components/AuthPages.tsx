import React, { useState } from 'react';
import { User, UserRole } from '../types.js';
import { Mail, Lock, User as UserIcon, Shield, Eye, EyeOff, MapPin, Phone, ArrowLeft, X, PlusCircle, CheckCircle2 } from 'lucide-react';

interface AuthPagesProps {
  onLoginSuccess: (token: string, user: User) => void;
  onBackToHome?: () => void;
  initialRole?: UserRole;
}

export default function AuthPages({ onLoginSuccess, onBackToHome, initialRole = 'buyer' }: AuthPagesProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState(''); // Super Admin only
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email or Phone login configuration
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('phone');
  const [loginPhone, setLoginPhone] = useState('');

  // Google Sign-In states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  const handleGoogleAuth = async (googleEmail: string, googleName?: string, googleAvatar?: string) => {
    if (!googleEmail || !googleEmail.trim()) {
      setError('Please enter a valid Google email address.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleEmail,
          name: googleName || googleEmail.split('@')[0],
          role: selectedRole,
          avatar: googleAvatar
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google Sign-In failed');
      }

      setShowGoogleModal(false);
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole, emailVal: string, phoneVal: string, userVal: string, passVal: string) => {
    setSelectedRole(role);
    setError('');
    setEmail(emailVal);
    setLoginPhone(phoneVal);
    setUsername(userVal);
    setPassword(passVal);
    setLoading(true);
    
    try {
      const payload: any = { password: passVal, role };
      if (role === 'super_admin') {
        payload.username = userVal;
      } else {
        payload.emailOrPhone = emailVal || phoneVal;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: any = { password, role: selectedRole };
      if (selectedRole === 'super_admin') {
        payload.username = username || 'Siddhesh';
      } else {
        payload.emailOrPhone = loginMethod === 'phone' ? loginPhone : email;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role: selectedRole,
          phone,
          address
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950 px-4 py-12 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-stone-100 dark:border-zinc-800 p-8 transition-colors">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBackToHome}
            className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </button>
          <span className="text-xs px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-semibold rounded-full uppercase tracking-wider">
            {selectedRole.replace('_', ' ')}
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">
            Mumbai Bazar 🏬
          </h2>
          <p className="mt-2 text-sm text-stone-500 dark:text-zinc-400">
            {isRegistering ? 'Create a vendor or customer account' : 'Access your dashboard instantly'}
          </p>
        </div>

        {/* Roles Selector (Only when not in registering phase, or as selection) */}
        {!isRegistering && (
          <div className="grid grid-cols-4 gap-1 p-1 bg-stone-100 dark:bg-zinc-800 rounded-xl mb-6">
            {(['buyer', 'seller', 'admin', 'super_admin'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setSelectedRole(r);
                  setError('');
                }}
                className={`text-[10px] md:text-xs font-semibold py-2 rounded-lg transition-all capitalize ${
                  selectedRole === r
                    ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-white shadow-sm'
                    : 'text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/50 flex items-start gap-2 animate-shake">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        {/* Forms */}
        {isRegistering ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Full Name *</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-zinc-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  placeholder="E.g. Siddhadesh Kalambe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Phone Number *</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-zinc-500" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Email Address (Optional)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  placeholder="name@mumbaibazar.com (optional)"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Address</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  placeholder="E.g. Bandra, Mumbai"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-zinc-500 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <span className="block text-xs text-stone-500 dark:text-zinc-400 mb-2">Registering as:</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-700 dark:text-zinc-300">
                  <input
                    type="radio"
                    name="regRole"
                    checked={selectedRole === 'buyer'}
                    onChange={() => setSelectedRole('buyer')}
                    className="accent-amber-500"
                  />
                  Buyer (Customer)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-stone-700 dark:text-zinc-300">
                  <input
                    type="radio"
                    name="regRole"
                    checked={selectedRole === 'seller'}
                    onChange={() => setSelectedRole('seller')}
                    className="accent-amber-500"
                  />
                  Seller (Store Vendor)
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Complete Sign Up'}
            </button>

            <p className="text-center text-xs text-stone-500 dark:text-zinc-400 mt-4">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setError('');
                }}
                className="text-amber-500 font-bold hover:underline"
              >
                Login here
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            {selectedRole === 'super_admin' ? (
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Super Admin Username *</label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                    placeholder="Siddhesh"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 2 options tab selector for Login */}
                <div>
                  <label className="block text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider mb-2 text-center">
                    Select Login Method
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 dark:bg-zinc-800/80 rounded-xl border border-stone-200/50 dark:border-zinc-700/50">
                    <button
                      type="button"
                      onClick={() => setLoginMethod('phone')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        loginMethod === 'phone'
                          ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-sm'
                          : 'text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Phone Number
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod('email')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        loginMethod === 'email'
                          ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-sm'
                          : 'text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email Address
                    </button>
                  </div>
                </div>

                {loginMethod === 'email' ? (
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-zinc-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                        placeholder={`${selectedRole}@mumbaibazar.com`}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300 uppercase tracking-wider mb-1.5">Phone Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-zinc-500" />
                      <input
                        type="tel"
                        required
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                        placeholder="e.g. 9876543214"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="block text-xs font-semibold text-stone-600 dark:text-zinc-300 uppercase tracking-wider">Password *</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-zinc-500 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Authenticating...' : `Login as ${selectedRole.replace('_', ' ')}`}
            </button>

            {/* Interactive Instant Access Accounts */}
             {/* <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-zinc-800">
              <span className="block text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                ⚡ One-Click instant Access logins:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('buyer', 'buyer@mumbaibazar.com', '9876543214', '', 'password')}
                  className="p-2.5 text-left bg-stone-50 hover:bg-amber-500/10 dark:bg-zinc-800/40 dark:hover:bg-amber-500/10 border border-stone-150 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-500/50 rounded-xl transition-all cursor-pointer group"
                >
                  <p className="text-[11px] font-bold text-stone-700 dark:text-zinc-200 group-hover:text-amber-500">Buyer Customer</p>
                  <p className="text-[9px] text-stone-400 dark:text-zinc-500 truncate font-mono">buyer@mumbaibazar.com</p>
                  <p className="text-[9px] text-amber-600/70 dark:text-amber-400/70 font-mono">Ph: 9876543214</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('seller', 'seller@mumbaibazar.com', '9876543212', '', 'password')}
                  className="p-2.5 text-left bg-stone-50 hover:bg-amber-500/10 dark:bg-zinc-800/40 dark:hover:bg-amber-500/10 border border-stone-150 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-500/50 rounded-xl transition-all cursor-pointer group"
                >
                  <p className="text-[11px] font-bold text-stone-700 dark:text-zinc-200 group-hover:text-amber-500">Seller Vendor</p>
                  <p className="text-[9px] text-stone-400 dark:text-zinc-500 truncate font-mono">seller@mumbaibazar.com</p>
                  <p className="text-[9px] text-amber-600/70 dark:text-amber-400/70 font-mono">Ph: 9876543212</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin', 'admin@mumbaibazar.com', '9876543211', '', 'password')}
                  className="p-2.5 text-left bg-stone-50 hover:bg-amber-500/10 dark:bg-zinc-800/40 dark:hover:bg-amber-500/10 border border-stone-150 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-500/50 rounded-xl transition-all cursor-pointer group"
                >
                  <p className="text-[11px] font-bold text-stone-700 dark:text-zinc-200 group-hover:text-amber-500">Admin Portal</p>
                  <p className="text-[9px] text-stone-400 dark:text-zinc-500 truncate font-mono">admin@mumbaibazar.com</p>
                  <p className="text-[9px] text-amber-600/70 dark:text-amber-400/70 font-mono">Ph: 9876543211</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('super_admin', 'siddheshkalambe12@gmail.com', '9876543210', 'Siddhesh', 'Siddhesh123')}
                  className="p-2.5 text-left bg-stone-50 hover:bg-amber-500/10 dark:bg-zinc-800/40 dark:hover:bg-amber-500/10 border border-stone-150 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-500/50 rounded-xl transition-all cursor-pointer group"
                >
                  <p className="text-[11px] font-bold text-stone-700 dark:text-zinc-200 group-hover:text-amber-500">Super Admin</p>
                  <p className="text-[9px] text-stone-400 dark:text-zinc-500 truncate font-mono">Siddhesh / Siddhesh123</p>
                  <p className="text-[9px] text-amber-600/70 dark:text-amber-400/70 font-mono">Ph: 9876543210</p>
                </button>
              </div>
            </div>*/}

            {/* Google Login Trigger */}
            {(selectedRole === 'buyer' || selectedRole === 'seller') && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200 dark:border-zinc-800"></div></div>
                  <div className="relative flex justify-center text-xs"><span className="px-2 bg-white dark:bg-zinc-900 text-stone-500 dark:text-zinc-400">Or continue with</span></div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setShowGoogleModal(true);
                  }}
                  className="w-full py-2.5 bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-200 font-semibold rounded-xl text-xs border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-750 transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-2xs group"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </>
            )}

            {(selectedRole === 'buyer' || selectedRole === 'seller') && (
              <p className="text-center text-xs text-stone-500 dark:text-zinc-400 mt-4">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setError('');
                  }}
                  className="text-amber-500 font-bold hover:underline"
                >
                  Create account
                </button>
              </p>
            )}
          </form>
        )}

      </div>

      {/* Google Sign-In Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span className="text-sm font-bold text-stone-900 dark:text-white">Sign in with Google</span>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowGoogleModal(false);
                }}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4">
              <h3 className="text-base font-bold text-stone-900 dark:text-white">Sign in to your Google Account</h3>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                to continue to <strong className="text-amber-600 dark:text-amber-400">Mumbai Bazar</strong> as {selectedRole === 'seller' ? 'Seller' : 'Buyer'}
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1">Google Email Address *</label>
                  <input 
                    type="email"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="e.g. name@gmail.com"
                    autoFocus
                    className="w-full p-2.5 bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-zinc-400 mb-1">Display Name (Optional)</label>
                  <input 
                    type="text"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="e.g. Siddhesh Kalambe"
                    className="w-full p-2.5 bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(false)}
                    className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-300 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGoogleAuth(customGoogleEmail, customGoogleName)}
                    disabled={loading || !customGoogleEmail.trim()}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all"
                  >
                    {loading ? 'Authenticating...' : 'Sign In'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 dark:border-zinc-800 text-center">
              <p className="text-[10px] text-stone-400 dark:text-zinc-500">
                To continue, Google will share your name, email address, and profile picture with Mumbai Bazar.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
