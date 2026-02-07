import React from 'react';
import './Profile.css';

const Profile = () => {
    return (
        <div className="profile-page">
            <div className="page-header">
                <h1>Profile</h1>
                <p className="subtitle">Manage your account settings</p>
            </div>

            <div className="content-placeholder">
                <div className="placeholder-icon">👤</div>
                <h3>Profile Page</h3>
                <p>View and edit your profile information, change password, and manage preferences.</p>
                <button className="primary-btn">Edit Profile</button>
            </div>
        </div>
    );
};

export default Profile;
