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
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="m-0 text-3xl font-extrabold tracking-tight bg-gradient-to-br from-[#1a0d35] to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent">Profile</h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Manage your account settings and preferences</p>
        </div>
        {!isEditing && (
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => setIsChangingPassword(true)}>
              <FiLock /> Change Password
            </button>
            <button className="flex items-center gap-2 px-5 py-2 bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-none rounded-lg text-sm font-semibold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30 transition-all cursor-pointer" onClick={handleEdit}>
              <FiEdit2 /> Edit Profile
            </button>
          </div>
        )}
      </div>

      <div
        className={`relative overflow-hidden flex items-center gap-7 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 transition-shadow hover:shadow-md ${bannerImg ? 'bg-cover bg-center border-none' : ''}`}
        style={bannerImg ? { backgroundImage: `url(${bannerImg})` } : {}}
      >
        {isEditing && (
          <label className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 bg-black/50 text-white border border-white/20 rounded-lg text-sm font-medium cursor-pointer backdrop-blur-sm hover:bg-black/80 hover:-translate-y-0.5 transition-all" title="Upload Banner Image">
            <FiImage size={16} /> Edit Banner
            <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
          </label>
        )}
        {bannerImg && <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-black/10 z-[1]" />}
        <div className="relative w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shrink-0 z-[2]">
          {editForm.profile_image ? (
            <img src={editForm.profile_image} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white"><FiUser size={48} /></div>
          )}
          {isEditing && (
            <label className="absolute bottom-1 right-1 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer text-white shadow-md hover:bg-indigo-700 hover:scale-110 transition-transform">
              <FiCamera size={18} />
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>
        <div className="flex-1 z-[2]">
          <h2 className={`m-0 text-3xl font-bold tracking-tight ${bannerImg ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{user?.full_name}</h2>
          <p className="inline-block mt-2 px-3.5 py-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 rounded-full capitalize">{user?.role || 'User'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-7 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="m-0 mb-6 text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">Personal Information</h3>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <label className="w-36 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400"><FiUser className="text-gray-400" />Full Name</label>
              {isEditing ? (
                <div className="flex-1 relative">
                  <input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className={`w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.full_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-600 focus:border-indigo-500'}`} />
                  {errors.full_name && <span className="absolute -bottom-5 left-0 text-xs text-red-500">{errors.full_name}</span>}
                </div>
              ) : <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{user?.full_name}</span>}
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <label className="w-36 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400"><FiUser className="text-gray-400" />Username</label>
              {isEditing ? (
                <div className="flex-1 relative">
                  <input type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className={`w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${errors.username ? 'border-red-500' : 'border-gray-200 dark:border-gray-600 focus:border-indigo-500'}`} />
                  {errors.username && <span className="absolute -bottom-5 left-0 text-xs text-red-500">{errors.username}</span>}
                </div>
              ) : <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{user?.username || 'Not set'}</span>}
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <label className="w-36 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400"><FiPhone className="text-gray-400" />Phone</label>
              {isEditing ? (
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Enter phone number" className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
              ) : <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{user?.phone || 'Not provided'}</span>}
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <label className="w-36 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400"><FiMail className="text-gray-400" />Email</label>
              <span className="flex-1 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/50">{user?.email}</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <label className="w-36 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400"><FiCalendar className="text-gray-400" />Member Since</label>
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer" onClick={handleCancel} disabled={loading.update}><FiX /> Cancel</button>
              <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white border-none rounded-lg text-sm font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed" onClick={handleSave} disabled={loading.update}>
                {loading.update ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : <><FiSave /> Save Changes</>}
              </button>
            </div>
          )}
        </div>

        <div className="hidden lg:flex items-center justify-center p-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10 min-h-[300px] relative overflow-hidden">
          <div className="relative w-[240px] h-[240px] z-10 flex items-center justify-center">
            <div className="absolute w-[180px] h-[120px] bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 top-10 left-10 -rotate-6 animate-float">
              <div className="w-3/4 h-3 bg-gray-200 dark:bg-gray-700 rounded-full mb-3" />
              <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
            <div className="absolute w-[140px] h-[140px] bg-white dark:bg-gray-800 rounded-full shadow-xl flex items-center justify-center bottom-4 right-4 rotate-12 animate-float" style={{ animationDelay: '1s' }}>
              <div className="w-24 h-24 border-8 border-indigo-100 dark:border-indigo-900/30 rounded-full border-t-indigo-500 dark:border-t-indigo-400 rotate-45" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl flex items-center justify-center text-white z-10">
              <FiLock size={28} />
            </div>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-7 shadow-sm border border-red-100 dark:border-red-900/30 mt-6">
        <h3 className="m-0 mb-4 text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2"><FiTrash2 />Danger Zone</h3>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl border border-red-100 dark:border-red-900/50">
          <div>
            <h4 className="m-0 mb-1 text-base font-semibold text-gray-900 dark:text-white">Delete Account</h4>
            <p className="m-0 text-sm text-gray-500 dark:text-gray-400">Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <button className="px-5 py-2.5 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-sm font-semibold hover:bg-red-500 hover:text-white dark:hover:bg-red-600 hover:border-transparent transition-all cursor-pointer whitespace-nowrap" onClick={() => setShowDeleteConfirm(true)}>Delete Account</button>
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
