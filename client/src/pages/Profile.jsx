import React, { useState, useEffect } from 'react';
import { FiEdit2, FiSave, FiX, FiUser, FiMail, FiPhone, FiCalendar, FiLock, FiTrash2, FiCamera } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { userService } from '../services/userService';
import SubLoader from '../components/SubLoader/SubLoader';
import './Profile.css';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [editForm, setEditForm] = useState({
        full_name: '',
        username: '',
        phone: '',
        profile_image: ''
    });

    const [passwordForm, setPasswordForm] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });

    const [loading, setLoading] = useState({
        profile: true,
        update: false,
        password: false,
        delete: false
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(prev => ({ ...prev, profile: true }));
            const data = await userService.getProfile();
            setUser(data);
            setEditForm({
                full_name: data.full_name || '',
                username: data.username || '',
                phone: data.phone || '',
                profile_image: data.profile_image || ''
            });
        } catch (error) {
            toast.error('Failed to load profile');
            console.error(error);
        } finally {
            setLoading(prev => ({ ...prev, profile: false }));
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setErrors({});
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditForm({
            full_name: user.full_name || '',
            username: user.username || '',
            phone: user.phone || '',
            profile_image: user.profile_image || ''
        });
        setErrors({});
    };

    const validateForm = () => {
        const newErrors = {};

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
        if (!validateForm()) {
            toast.error('Please fix validation errors');
            return;
        }

        try {
            setLoading(prev => ({ ...prev, update: true }));
            const updated = await userService.updateProfile(editForm);
            setUser(updated);
            setIsEditing(false);
            toast.success('Profile updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update profile');
            console.error(error);
        } finally {
            setLoading(prev => ({ ...prev, update: false }));
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordForm.new_password !== passwordForm.confirm_password) {
            toast.error('New passwords do not match');
            return;
        }

        if (passwordForm.new_password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        try {
            setLoading(prev => ({ ...prev, password: true }));
            await userService.changePassword(passwordForm.old_password, passwordForm.new_password);
            toast.success('Password changed successfully!');
            setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
            setIsChangingPassword(false);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to change password');
            console.error(error);
        } finally {
            setLoading(prev => ({ ...prev, password: false }));
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Image size must be less than 2MB');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setEditForm(prev => ({ ...prev, profile_image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
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
            console.error(error);
        } finally {
            setLoading(prev => ({ ...prev, delete: false }));
            setShowDeleteConfirm(false);
        }
    };

    if (loading.profile) {
        return (
            <div className="profile-page">
                <div className="loading-container">
                    <SubLoader />
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            {/* Header */}
            <div className="profile-header">
                <div>
                    <h1>Profile</h1>
                    <p className="subtitle">Manage your account settings and preferences</p>
                </div>
                {!isEditing && (
                    <button className="edit-btn" onClick={handleEdit}>
                        <FiEdit2 /> Edit Profile
                    </button>
                )}
            </div>

            {/* Profile Image Section */}
            <div className="profile-image-section">
                <div className="profile-avatar">
                    {editForm.profile_image ? (
                        <img src={editForm.profile_image} alt="Profile" />
                    ) : (
                        <div className="avatar-placeholder">
                            <FiUser size={48} />
                        </div>
                    )}
                    {isEditing && (
                        <label className="image-upload-btn">
                            <FiCamera size={20} />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                style={{ display: 'none' }}
                            />
                        </label>
                    )}
                </div>
                <div className="profile-name">
                    <h2>{user?.full_name}</h2>
                    <p className="user-role">{user?.role || 'User'}</p>
                </div>
            </div>

            {/* Personal Information */}
            <div className="profile-section">
                <h3 className="section-title">Personal Information</h3>
                <div className="info-card">
                    <div className="info-row">
                        <label>
                            <FiUser className="info-icon" />
                            Full Name
                        </label>
                        {isEditing ? (
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                    className={errors.full_name ? 'error' : ''}
                                />
                                {errors.full_name && <span className="error-text">{errors.full_name}</span>}
                            </div>
                        ) : (
                            <span className="info-value">{user?.full_name}</span>
                        )}
                    </div>

                    <div className="info-row">
                        <label>
                            <FiUser className="info-icon" />
                            Username
                        </label>
                        {isEditing ? (
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                    className={errors.username ? 'error' : ''}
                                />
                                {errors.username && <span className="error-text">{errors.username}</span>}
                            </div>
                        ) : (
                            <span className="info-value">{user?.username || 'Not set'}</span>
                        )}
                    </div>

                    <div className="info-row">
                        <label>
                            <FiPhone className="info-icon" />
                            Phone
                        </label>
                        {isEditing ? (
                            <input
                                type="tel"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                placeholder="Enter phone number"
                            />
                        ) : (
                            <span className="info-value">{user?.phone || 'Not provided'}</span>
                        )}
                    </div>

                    <div className="info-row">
                        <label>
                            <FiMail className="info-icon" />
                            Email
                        </label>
                        <span className="info-value read-only">{user?.email}</span>
                    </div>

                    <div className="info-row">
                        <label>
                            <FiCalendar className="info-icon" />
                            Member Since
                        </label>
                        <span className="info-value">
                            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                    </div>
                </div>

                {isEditing && (
                    <div className="edit-actions">
                        <button className="btn-cancel" onClick={handleCancel} disabled={loading.update}>
                            <FiX /> Cancel
                        </button>
                        <button className="btn-save" onClick={handleSave} disabled={loading.update}>
                            {loading.update ? (
                                <>
                                    <div className="btn-spinner"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FiSave /> Save Changes
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Change Password Section */}
            <div className="profile-section">
                <div className="section-header-toggle" onClick={() => setIsChangingPassword(!isChangingPassword)}>
                    <h3 className="section-title">
                        <FiLock className="info-icon" />
                        Change Password
                    </h3>
                    <span className="toggle-icon">{isChangingPassword ? '−' : '+'}</span>
                </div>

                {isChangingPassword && (
                    <form className="password-form" onSubmit={handlePasswordChange}>
                        <div className="form-group">
                            <label>Current Password</label>
                            <input
                                type="password"
                                value={passwordForm.old_password}
                                onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={passwordForm.new_password}
                                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                                type="password"
                                value={passwordForm.confirm_password}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={loading.password}>
                            {loading.password ? 'Changing...' : 'Change Password'}
                        </button>
                    </form>
                )}
            </div>

            {/* Danger Zone */}
            <div className="profile-section danger-zone">
                <h3 className="section-title">
                    <FiTrash2 className="info-icon" />
                    Danger Zone
                </h3>
                <div className="danger-card">
                    <div>
                        <h4>Delete Account</h4>
                        <p>Once you delete your account, there is no going back. Please be certain.</p>
                    </div>
                    <button className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                        Delete Account
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <>
                    <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}></div>
                    <div className="confirmation-modal">
                        <h3>Delete Account?</h3>
                        <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button className="btn-danger" onClick={handleDeleteAccount} disabled={loading.delete}>
                                {loading.delete ? 'Deleting...' : 'Yes, Delete My Account'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Profile;
