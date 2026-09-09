import React, { useState } from 'react';
import { User } from '../types.js';
import { User as UserIcon, Mail, Phone, MapPin, KeyRound, Save, LogOut, CheckCircle, ShieldAlert } from 'lucide-react';

interface ProfileProps {
  currentUser: User;
  onLogout: () => void;
  onUpdateUser: (updated: User) => void;
}

export default function Profile({ currentUser, onLogout, onUpdateUser }: ProfileProps) {
  // Details inputs
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [address, setAddress] = useState(currentUser.address || '');
  const [birthday, setBirthday] = useState(currentUser.birthday || '');
  const [gender, setGender] = useState(currentUser.gender || 'Not Specified');
  
  // Password reset inputs
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingDetails, setSavingDetails] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [changingPassword, setChangingPassword] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setSavingDetails(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify({ name, phone, address, birthday, gender })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccessMsg('Your profile attributes have been successfully updated.');
      onUpdateUser(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccess('');
    setPassError('');

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('mumbai_bazar_token')}`
        },
        body: JSON.stringify({ currentPassword: oldPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setPassSuccess('Security credentials updated successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="bg-stone-50 dark:bg-zinc-950 min-h-screen py-8 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-stone-200 pb-4 mb-8">
          <div>
            <h1 className="text-xl font-black text-stone-900 dark:text-white tracking-tight">Your Account Profile</h1>
            <p className="text-xs text-stone-400 mt-1">Review your user status and customize default dispatch coordinates</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* User badge display card */}
          <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-sm flex flex-col items-center text-center h-fit transition-colors">
            <img
              src={currentUser.avatar}
              alt=""
              className="w-24 h-24 rounded-full border border-stone-200/60 p-1 bg-stone-50 object-cover"
            />
            
            <h3 className="text-sm font-black text-stone-850 dark:text-white mt-4">{currentUser.name}</h3>
            <p className="text-[10px] text-stone-400 font-mono mt-1">{currentUser.email}</p>
            
            {/* Role badge */}
            <span className="text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full mt-4 tracking-widest border border-amber-500/10">
              Role: {currentUser.role.replace('_', ' ')}
            </span>

            <div className="w-full mt-6 pt-6 border-t border-stone-50 dark:border-zinc-850/60 text-left text-[11px] text-stone-500 space-y-2 leading-relaxed">
              <p>• Account creation date logged as verified.</p>
              <p>• All default settings securely persisted in JSON database servers.</p>
            </div>
          </div>

          {/* Edit form columns */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Account Details form */}
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 md:p-8 shadow-sm transition-colors">
              <h3 className="text-sm font-extrabold uppercase text-stone-850 dark:text-zinc-200 pb-3 border-b border-stone-100 dark:border-zinc-850 flex items-center gap-1.5">
                <UserIcon className="w-4.5 h-4.5 text-amber-500" />
                Personal Information Attributes
              </h3>

              {successMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-xl border border-emerald-100 mt-4">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 font-bold text-xs rounded-xl border mt-4">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSaveDetails} className="space-y-4 text-xs mt-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-stone-500 uppercase mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-500 uppercase mb-1">Contact Mobile *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="tel"
                        required
                        placeholder="Enter phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-stone-500 uppercase mb-1">Gender Select</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                    >
                      <option value="Male" className="bg-white dark:bg-zinc-900 text-stone-850 dark:text-zinc-200">Male</option>
                      <option value="Female" className="bg-white dark:bg-zinc-900 text-stone-850 dark:text-zinc-200">Female</option>
                      <option value="Other" className="bg-white dark:bg-zinc-900 text-stone-850 dark:text-zinc-200">Other</option>
                      <option value="Not Specified" className="bg-white dark:bg-zinc-900 text-stone-850 dark:text-zinc-200">Prefer Not to Say</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-stone-500 uppercase mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-500 uppercase mb-1">Fulfillment Shipping Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                    <textarea
                      rows={3}
                      placeholder="Enter flat / building, street name, district and pincode"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingDetails}
                  className="py-2.5 px-6 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-450 text-stone-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {savingDetails ? 'Saving...' : 'Update Details'}
                </button>

              </form>
            </div>

            {/* 2. Password reset form */}
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 md:p-8 shadow-sm transition-colors">
              <h3 className="text-sm font-extrabold uppercase text-stone-850 dark:text-zinc-200 pb-3 border-b border-stone-100 dark:border-zinc-850 flex items-center gap-1.5">
                <KeyRound className="w-4.5 h-4.5 text-amber-500" />
                Change Password Credentials
              </h3>

              {passSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-xl border border-emerald-100 mt-4">
                  {passSuccess}
                </div>
              )}
              {passError && (
                <div className="p-3 bg-red-50 text-red-600 font-bold text-xs rounded-xl border mt-4">
                  {passError}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs mt-6">
                
                <div>
                  <label className="block font-bold text-stone-500 uppercase mb-1">Current Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-stone-500 uppercase mb-1">New Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-500 uppercase mb-1">Confirm New Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 rounded-xl text-stone-850 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="py-2.5 px-6 bg-stone-850 hover:bg-stone-900 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {changingPassword ? 'Resetting...' : 'Change Credentials'}
                </button>

              </form>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
