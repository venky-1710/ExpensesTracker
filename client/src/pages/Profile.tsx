import React, { useState, useEffect } from 'react';
import { FiEdit2, FiSave, FiX, FiUser, FiMail, FiPhone, FiCalendar, FiLock, FiTrash2, FiCamera, FiImage, FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { userService } from '../services/userService';
import SubLoader from '../components/SubLoader/SubLoader';
import type { User } from '../types';

interface EditForm {
  full_name: string;
  username: string;
  phone: string;
  profile_image: string;
  banner_image: string;
}

interface PasswordForm {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

interface ShowPassword {
  old: boolean;
  new: boolean;
  confirm: boolean;
}

interface LoadingState {
  profile: boolean;
  update: boolean;
  password: boolean;
  delete: boolean;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const [editForm, setEditForm] = useState<EditForm>({
    full_name: '', username: '', phone: '', profile_image: '', banner_image: ''
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    old_password: '', new_password: '', confirm_password: ''
  });

  const [showPassword, setShowPassword] = useState<ShowPassword>({ old: false, new: false, confirm: false });

  const [loading, setLoading] = useState<LoadingState>({
    profile: true, update: false, password: false, delete: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(prev => ({ ...prev, profile: true }));
      const data = await userService.getProfile();
      setUser(data);
      setEditForm({
        full_name: data.full_name || '', username: data.username || '',
        phone: data.phone || '', profile_image: data.profile_image || '', banner_image: data.banner_image || ''
      });
    } catch (error) {
      toast.error('Failed to load profile');
      console.error(error);
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const handleEdit = () => { setIsEditing(true); setErrors({}); };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setEditForm({
        full_name: user.full_name || '', username: user.username || '',
        phone: user.phone || '', profile_image: user.profile_image || '', banner_image: user.banner_image || ''
      });
    }
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!editForm.full_name || editForm.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters';
    }
    if (editForm.username && editForm.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) { toast.error('Please fix validation errors'); return; }
    try {
      setLoading(prev => ({ ...prev, update: true }));
      const updated = await userService.updateProfile(editForm);
      setUser(updated);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(prev => ({ ...prev, update: false }));
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) { toast.error('New passwords do not match'); return; }
    if (passwordForm.new_password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      setLoading(prev => ({ ...prev, password: true }));
      await userService.changePassword(passwordForm.old_password, passwordForm.new_password);
      toast.success('Password changed successfully!');
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      setIsChangingPassword(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image size must be less than 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setEditForm(prev => ({ ...prev, profile_image: reader.result as string })); };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Banner size must be less than 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setEditForm(prev => ({ ...prev, banner_image: reader.result as string })); };
    reader.readAsDataURL(file);
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(prev => ({ ...prev, delete: true }));
      await userService.deleteAccount();
      toast.success('Account deleted successfully');
      localStorage.removeItem('token');
      window.location.href = '/';
    } catch (error) {
      toast.error('Failed to delete account');
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
      setShowDeleteConfirm(false);
    }
  };

  if (loading.profile) {
    return (
      <div className="w-full p-[30px] flex justify-center items-center h-full min-h-[400px]">
        <SubLoader />
      </div>
    );
  }

  const bannerImg = isEditing ? editForm.banner_image : user?.banner_image;

  return (
    <div className="w-full p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-[30px] flex-wrap gap-4">
        <div>
          <h1 className="text-[32px] font-bold bg-gradient-to-br from-[#1a0d35] to-[#6d4aff] dark:from-[#c850ff] dark:to-[#6d4aff] bg-clip-text text-transparent m-0 leading-tight">Profile</h1>
          <p className="mt-[5px] text-gray-500 text-sm m-0">Manage your account settings and preferences</p>
        </div>
        {!isEditing && (
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer" onClick={() => setIsChangingPassword(true)}>
              <FiLock /> Change Password
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-[#c850ff] to-[#6d4aff] text-white border-none rounded-xl text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(200,80,255,0.4)] transition-all cursor-pointer shadow-[0_4px_12px_rgba(200,80,255,0.3)]" onClick={handleEdit}>
              <FiEdit2 /> Edit Profile
            </button>
          </div>
        )}
      </div>

      <div
        className={`relative overflow-hidden flex flex-col sm:flex-row items-center sm:items-end gap-6 p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-gray-700 mb-8 transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] ${bannerImg ? 'bg-cover bg-center border-none' : ''}`}
        style={bannerImg ? { backgroundImage: `url(${bannerImg})`, minHeight: '220px' } : { minHeight: '160px' }}
      >
        {isEditing && (
          <label className="absolute top-4 right-4 z-10 flex items-center gap-2 px-4 py-2.5 bg-black/40 text-white border border-white/20 rounded-xl text-sm font-semibold cursor-pointer backdrop-blur-md hover:bg-black/60 hover:-translate-y-0.5 transition-all shadow-lg" title="Upload Banner Image">
            <FiImage size={16} /> Edit Banner
            <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
          </label>
        )}
        {bannerImg && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[1]" />}
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-[#c850ff] to-[#6d4aff] shadow-[0_8px_25px_rgba(109,74,255,0.5)] shrink-0 z-[2] border-4 border-white dark:border-gray-800">
          {editForm.profile_image ? (
            <img src={editForm.profile_image} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white"><FiUser size={54} /></div>
          )}
          {isEditing && (
            <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center cursor-pointer text-white opacity-0 hover:opacity-100 transition-opacity backdrop-blur-sm">
              <FiCamera size={24} className="mb-1" />
              <span className="text-xs font-semibold">Change</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>
        <div className="flex-1 z-[2] text-center sm:text-left pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h2 className={`m-0 text-[32px] font-bold tracking-tight leading-none ${bannerImg ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{user?.full_name}</h2>
            <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm ${bannerImg ? 'bg-white/20 text-white backdrop-blur-md border border-white/30' : 'text-[#6d4aff] dark:text-[#c850ff] bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-900/50'}`}>
              {user?.role || 'User'}
            </span>
          </div>
          <p className={`mt-2 m-0 text-sm font-medium ${bannerImg ? 'text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>@{user?.username || 'user'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-gray-700">
          <h3 className="m-0 mb-6 text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-gray-700/60"><FiUser className="text-[#6d4aff] dark:text-[#c850ff]" /> Personal Information</h3>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <label className="w-40 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs"><FiUser className="text-gray-400" /> Full Name</label>
              {isEditing ? (
                <div className="flex-1 relative">
                  <input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className={`w-full p-3 bg-gray-50 dark:bg-gray-900/50 border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6d4aff]/30 focus:border-[#6d4aff] dark:focus:border-[#c850ff] transition-all shadow-inner ${errors.full_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`} />
                  {errors.full_name && <span className="absolute -bottom-5 left-0 text-xs text-red-500 font-medium">{errors.full_name}</span>}
                </div>
              ) : <span className="flex-1 text-[15px] font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/30 px-4 py-2.5 rounded-xl border border-transparent dark:border-gray-800">{user?.full_name}</span>}
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <label className="w-40 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs"><FiUser className="text-gray-400" /> Username</label>
              {isEditing ? (
                <div className="flex-1 relative">
                  <input type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className={`w-full p-3 bg-gray-50 dark:bg-gray-900/50 border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6d4aff]/30 focus:border-[#6d4aff] dark:focus:border-[#c850ff] transition-all shadow-inner ${errors.username ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`} />
                  {errors.username && <span className="absolute -bottom-5 left-0 text-xs text-red-500 font-medium">{errors.username}</span>}
                </div>
              ) : <span className="flex-1 text-[15px] font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/30 px-4 py-2.5 rounded-xl border border-transparent dark:border-gray-800">{user?.username || 'Not set'}</span>}
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <label className="w-40 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs"><FiPhone className="text-gray-400" /> Phone</label>
              {isEditing ? (
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Enter phone number" className="flex-1 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6d4aff]/30 focus:border-[#6d4aff] dark:focus:border-[#c850ff] transition-all shadow-inner" />
              ) : <span className="flex-1 text-[15px] font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/30 px-4 py-2.5 rounded-xl border border-transparent dark:border-gray-800">{user?.phone || 'Not provided'}</span>}
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <label className="w-40 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs"><FiMail className="text-gray-400" /> Email</label>
              <span className="flex-1 text-[15px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800/50">{user?.email}</span>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
              <label className="w-40 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs"><FiCalendar className="text-gray-400" /> Member Since</label>
              <span className="flex-1 text-[15px] font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/30 px-4 py-2.5 rounded-xl border border-transparent dark:border-gray-800">{user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/60">
              <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer" onClick={handleCancel} disabled={loading.update}><FiX /> Cancel</button>
              <button className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#c850ff] to-[#6d4aff] text-white border-none rounded-xl text-sm font-semibold hover:shadow-[0_6px_20px_rgba(109,74,255,0.4)] hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed" onClick={handleSave} disabled={loading.update}>
                {loading.update ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : <><FiSave /> Save Changes</>}
              </button>
            </div>
          )}
        </div>

        <div className="hidden lg:flex items-center justify-center p-8 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-3xl border border-indigo-100/50 dark:border-indigo-500/10 min-h-[350px] relative overflow-hidden shadow-[inset_0_2px_20px_rgba(0,0,0,0.02)]">
          <div className="relative w-[280px] h-[280px] z-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#6d4aff]/20 to-[#c850ff]/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute w-[180px] h-[120px] bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.1)] p-5 top-10 left-6 -rotate-6 animate-float border border-white/50 dark:border-gray-700/50">
              <div className="w-3/4 h-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-4" />
              <div className="w-1/2 h-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-4" />
              <div className="w-full h-2 bg-gradient-to-r from-[#6d4aff] to-[#c850ff] rounded-full opacity-20" />
            </div>
            <div className="absolute w-[150px] h-[150px] bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.1)] flex items-center justify-center bottom-4 right-4 rotate-12 animate-float border border-white/50 dark:border-gray-700/50" style={{ animationDelay: '1.5s' }}>
              <div className="w-24 h-24 border-[6px] border-indigo-50 dark:border-indigo-900/30 rounded-full border-t-[#c850ff] dark:border-t-[#c850ff] border-r-[#6d4aff] rotate-45" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br from-[#c850ff] to-[#6d4aff] rounded-[24px] shadow-[0_10px_30px_rgba(109,74,255,0.4)] flex items-center justify-center text-white z-10 border border-white/20">
              <FiLock size={32} />
            </div>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(109,74,255,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(200,80,255,0.15)_1px,transparent_1px)] bg-[size:32px_32px] opacity-70" />
        </div>
      </div>

      <div className="bg-red-50/50 dark:bg-red-900/10 rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-red-100 dark:border-red-900/30 mt-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 dark:bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <h3 className="m-0 mb-5 text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2 relative z-10"><FiTrash2 /> Danger Zone</h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 bg-white dark:bg-gray-800/80 rounded-2xl border border-red-100 dark:border-red-900/50 relative z-10 shadow-sm">
          <div>
            <h4 className="m-0 mb-1.5 text-base font-bold text-gray-900 dark:text-white">Delete Account</h4>
            <p className="m-0 text-sm text-gray-500 dark:text-gray-400">Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <button className="px-6 py-3 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white dark:hover:bg-red-600 hover:border-transparent hover:shadow-[0_4px_15px_rgba(239,68,68,0.3)] transition-all cursor-pointer whitespace-nowrap" onClick={() => setShowDeleteConfirm(true)}>Delete Account</button>
        </div>
      </div>

      {isChangingPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsChangingPassword(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="m-0 mb-2 text-xl font-bold text-gray-900 dark:text-white">Change Password</h3>
              <p className="m-0 mb-6 text-sm text-gray-500 dark:text-gray-400">Enter your current password and a new secure password.</p>
              <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
                {(['old', 'new', 'confirm'] as const).map((field) => (
                  <div key={field} className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{field === 'old' ? 'Current' : field === 'new' ? 'New' : 'Confirm New'} Password</label>
                    <div className="relative">
                      <input
                        type={showPassword[field] ? 'text' : 'password'}
                        value={passwordForm[`${field}_password` as keyof PasswordForm]}
                        onChange={(e) => setPasswordForm({ ...passwordForm, [`${field}_password`]: e.target.value })}
                        required
                        minLength={field === 'new' ? 8 : undefined}
                        className="w-full pl-3 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer flex items-center justify-center p-1" onClick={() => setShowPassword(prev => ({ ...prev, [field]: !prev[field] }))}>
                        {showPassword[field] ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button type="button" className="px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer" onClick={() => setIsChangingPassword(false)}>Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white border-none rounded-lg text-sm font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed" disabled={loading.password}>
                    {loading.password ? 'Changing...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-[400px] rounded-2xl shadow-xl p-7 flex flex-col items-center text-center animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center mb-4"><FiTrash2 size={24} /></div>
            <h3 className="m-0 mb-2 text-xl font-bold text-gray-900 dark:text-white">Delete Account?</h3>
            <p className="m-0 mb-6 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.</p>
            <div className="flex gap-3 w-full">
              <button className="flex-1 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="flex-1 py-2.5 bg-red-500 text-white border-none rounded-lg text-sm font-semibold hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed" onClick={handleDeleteAccount} disabled={loading.delete}>
                {loading.delete ? 'Deleting...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
