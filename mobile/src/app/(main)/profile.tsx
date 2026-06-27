import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import Toast from 'react-native-toast-message';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';

export default function ProfileScreen() {
  const { C, isDark, themeMode, setThemeMode } = useAppTheme();
  const s = getStyles(C);

  const { logout } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile state
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', username: '', phone: '', profile_image: '', banner_image: '' });
  const [saving, setSaving] = useState(false);

  // Theme state
  const [themeModal, setThemeModal] = useState(false);

  // Change password state
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const load = async () => {
    try {
      const data = await userService.getProfile();
      setUser(data);
      setEditForm({ 
        full_name: data.full_name || '', 
        username: data.username || '', 
        phone: data.phone || '',
        profile_image: data.profile_image || '',
        banner_image: data.banner_image || ''
      });
    } catch (e) {
      console.error('Profile load error:', e);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleThemePress = () => {
    setThemeModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editForm.full_name.trim()) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Full name is required' });
      return;
    }
    setSaving(true);
    try {
      const updated = await userService.updateProfile(editForm);
      setUser(updated);
      setEditModal(false);
      Toast.show({ type: 'success', text1: 'Profile updated!', text2: 'Your changes were saved' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.detail || 'Failed to update' });
    } finally { setSaving(false); }
  };

  const pickImage = async (field: 'profile_image' | 'banner_image') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === 'profile_image' ? [1, 1] : [16, 9],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const mime = result.assets[0].mimeType || 'image/jpeg';
      const base64Data = `data:${mime};base64,${result.assets[0].base64}`;
      setEditForm(prev => ({ ...prev, [field]: base64Data }));
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.new_password || !pwForm.confirm_password) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Please fill in both fields' });
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      Toast.show({ type: 'error', text1: 'Mismatch', text2: 'New passwords do not match' });
      return;
    }
    if (pwForm.new_password.length < 8) {
      Toast.show({ type: 'error', text1: 'Too short', text2: 'Password must be at least 8 characters' });
      return;
    }
    setPwSaving(true);
    try {
      await userService.changePassword(pwForm.old_password, pwForm.new_password);
      setPwModal(false);
      setPwForm({ old_password: '', new_password: '', confirm_password: '' });
      Toast.show({ type: 'success', text1: 'Password changed!', text2: 'Your password has been updated' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.detail || 'Failed to change password' });
    } finally { setPwSaving(false); }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This is permanent and cannot be undone. All your data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account', style: 'destructive',
          onPress: async () => {
            try {
              await userService.deleteAccount();
              logout();
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to delete account' });
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#6d4aff" />
        <Text style={s.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A';

  const initials = (user?.full_name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView>
        <View style={s.headerContainer}>
          {user?.banner_image ? (
            <Image 
              source={{ uri: user.banner_image }} 
              style={s.headerBanner} 
              resizeMode="cover"
            />
          ) : (
            <View style={[s.headerBanner, { backgroundColor: C.primary + '20' }]} />
          )}
          
          <View style={s.topNav}>
            <Text style={s.topNavTitle}>PROFILE</Text>
          </View>

          <View style={s.headerContent}>
            <View style={s.avatarWrapper}>
              {user?.profile_image ? (
                <Image source={{ uri: user.profile_image }} style={{ width: '100%', height: '100%', borderRadius: 48 }} />
              ) : (
                <Text style={s.avatarText}>{initials}</Text>
              )}
            </View>
            <Text style={s.userName}>{user?.full_name}</Text>
            <Text style={s.userEmail}>{user?.email}</Text>
            <View style={s.roleBadge}>
              <Text style={s.roleText}>{user?.role || 'User'}</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statValue}>{memberSince}</Text>
            <Text style={s.statLabel}>Member Since</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>{user?.username || '—'}</Text>
            <Text style={s.statLabel}>Username</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={s.menuList}>
          <TouchableOpacity style={s.menuItem} onPress={() => setEditModal(true)}>
            <View style={[s.menuIconWrapper, { backgroundColor: C.primary + '20' }]}>
              <Text style={s.menuIconText}>✏️</Text>
            </View>
            <View style={s.menuTextWrapper}>
              <Text style={s.menuTitle}>Edit Profile</Text>
              <Text style={s.menuSubtitle}>Update your personal details</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={handleThemePress}>
            <View style={[s.menuIconWrapper, { backgroundColor: C.primary + '20' }]}>
              <Text style={s.menuIconText}>{themeMode === 'system' ? '⚙️' : isDark ? '🌙' : '☀️'}</Text>
            </View>
            <View style={s.menuTextWrapper}>
              <Text style={s.menuTitle}>Appearance</Text>
              <Text style={s.menuSubtitle}>Theme: {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={() => setPwModal(true)}>
            <View style={[s.menuIconWrapper, { backgroundColor: C.primary + '20' }]}>
              <Text style={s.menuIconText}>🔒</Text>
            </View>
            <View style={s.menuTextWrapper}>
              <Text style={s.menuTitle}>Security</Text>
              <Text style={s.menuSubtitle}>Change password</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.menuItem} onPress={handleDeleteAccount}>
            <View style={[s.menuIconWrapper, { backgroundColor: C.red + '20' }]}>
              <Text style={s.menuIconText}>⚠️</Text>
            </View>
            <View style={s.menuTextWrapper}>
              <Text style={[s.menuTitle, { color: C.red }]}>Delete Account</Text>
              <Text style={s.menuSubtitle}>Permanently delete all data</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer Actions */}
        <View style={s.footerActions}>
          <TouchableOpacity style={[s.logoutBtn, { flex: 1, backgroundColor: C.red + '10', borderColor: C.red + '30' }]} onPress={logout}>
            <Text style={[s.logoutBtnText, { color: C.red }]}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Theme Selection Modal */}
      <Modal visible={themeModal} animationType="fade" transparent onRequestClose={() => setThemeModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modalCard, { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 32 }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Appearance</Text>
              <TouchableOpacity onPress={() => setThemeModal(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 24, paddingTop: 20, gap: 12 }}>
              <TouchableOpacity 
                style={[s.themeOption, themeMode === 'system' && s.themeOptionActive]} 
                onPress={() => { setThemeMode('system'); setThemeModal(false); }}
              >
                <Text style={s.themeOptionIcon}>⚙️</Text>
                <Text style={[s.themeOptionText, themeMode === 'system' && s.themeOptionTextActive]}>System Default</Text>
                {themeMode === 'system' && <Text style={s.themeOptionCheck}>✓</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[s.themeOption, themeMode === 'light' && s.themeOptionActive]} 
                onPress={() => { setThemeMode('light'); setThemeModal(false); }}
              >
                <Text style={s.themeOptionIcon}>☀️</Text>
                <Text style={[s.themeOptionText, themeMode === 'light' && s.themeOptionTextActive]}>Light Mode</Text>
                {themeMode === 'light' && <Text style={s.themeOptionCheck}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[s.themeOption, themeMode === 'dark' && s.themeOptionActive]} 
                onPress={() => { setThemeMode('dark'); setThemeModal(false); }}
              >
                <Text style={s.themeOptionIcon}>🌙</Text>
                <Text style={[s.themeOptionText, themeMode === 'dark' && s.themeOptionTextActive]}>Dark Mode</Text>
                {themeMode === 'dark' && <Text style={s.themeOptionCheck}>✓</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                {/* Banner Edit */}
                <TouchableOpacity 
                  style={{ width: '100%', height: 100, backgroundColor: C.inputBg, borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}
                  onPress={() => pickImage('banner_image')}
                >
                  {editForm.banner_image ? (
                    <Image source={{ uri: editForm.banner_image }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Text style={{ color: C.textMuted }}>Tap to change Banner</Text>
                  )}
                </TouchableOpacity>

                {/* Profile Edit */}
                <TouchableOpacity 
                  style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', marginTop: -40, borderWidth: 4, borderColor: C.card }}
                  onPress={() => pickImage('profile_image')}
                >
                  {editForm.profile_image ? (
                    <Image source={{ uri: editForm.profile_image }} style={{ width: '100%', height: '100%', borderRadius: 40 }} />
                  ) : (
                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>{initials}</Text>
                  )}
                  <View style={{ position: 'absolute', bottom: 0, right: -4, backgroundColor: C.bg, borderRadius: 12, padding: 4 }}>
                    <Text style={{ fontSize: 12 }}>📷</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <Text style={s.formLabel}>Full Name *</Text>
              <TextInput
                style={s.formInput}
                placeholder="Your full name"
                placeholderTextColor="#475569"
                value={editForm.full_name}
                onChangeText={v => setEditForm({ ...editForm, full_name: v })}
                autoCapitalize="words"
              />
              <Text style={s.formLabel}>Username</Text>
              <TextInput
                style={s.formInput}
                placeholder="@username"
                placeholderTextColor="#475569"
                value={editForm.username}
                onChangeText={v => setEditForm({ ...editForm, username: v })}
                autoCapitalize="none"
              />
              <Text style={s.formLabel}>Phone</Text>
              <TextInput
                style={s.formInput}
                placeholder="+91 9999999999"
                placeholderTextColor="#475569"
                value={editForm.phone}
                onChangeText={v => setEditForm({ ...editForm, phone: v })}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={pwModal} animationType="slide" transparent onRequestClose={() => setPwModal(false)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setPwModal(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody}>
              <Text style={s.formLabel}>New Password</Text>
              <TextInput
                style={s.formInput}
                placeholder="••••••••"
                placeholderTextColor="#475569"
                value={pwForm.new_password}
                onChangeText={v => setPwForm({ ...pwForm, new_password: v })}
                secureTextEntry
              />
              <Text style={s.formLabel}>Confirm New Password</Text>
              <TextInput
                style={s.formInput}
                placeholder="••••••••"
                placeholderTextColor="#475569"
                value={pwForm.confirm_password}
                onChangeText={v => setPwForm({ ...pwForm, confirm_password: v })}
                secureTextEntry
              />
              <TouchableOpacity style={[s.saveBtn, pwSaving && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={pwSaving}>
                {pwSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Update Password</Text>}
              </TouchableOpacity>
              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 12 },
  loadingText: { color: C.textMuted, fontSize: 14 },

  headerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  headerBanner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 160,
    opacity: 0.6,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  topNav: {
    width: '100%',
    paddingTop: 16,
    alignItems: 'center',
  },
  topNavTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: 2,
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 40, // push avatar down to overlap banner
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: C.bg,
    marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 24, fontWeight: '800', color: C.textPrimary, marginBottom: 4, textAlign: 'center' },
  userEmail: { fontSize: 14, color: C.textMuted, marginBottom: 16, textAlign: 'center' },
  roleBadge: {
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: C.primary, borderRadius: 20,
  },
  roleText: { color: '#fff', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 12, color: C.textMuted },
  statDivider: {
    width: 1, height: 24,
    backgroundColor: C.border,
  },

  menuList: {
    marginHorizontal: 24,
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginBottom: 24,
  },
  menuIconWrapper: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIconText: { fontSize: 20 },
  menuTextWrapper: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  menuSubtitle: { fontSize: 13, color: C.textMuted },

  footerActions: {
    flexDirection: 'row',
    marginHorizontal: 24,
    gap: 16,
    marginBottom: 100, // padding for bottom nav
  },
  logoutBtn: {
    flex: 1, height: 56,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  logoutBtnText: { color: C.textPrimary, fontWeight: '700', fontSize: 15 },

  overlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', borderTopWidth: 1, borderColor: 'rgba(109,74,255,0.2)'
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20,
    borderBottomWidth: 1, borderColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  modalClose: { fontSize: 18, color: C.textMuted },
  modalBody: { paddingHorizontal: 24, paddingTop: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
  formInput: {
    backgroundColor: C.inputBg, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 14, color: C.textPrimary, fontSize: 15, marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  themeOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: C.inputBg, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
  },
  themeOptionActive: {
    backgroundColor: C.primary + '15',
    borderColor: C.primary,
  },
  themeOptionIcon: { fontSize: 20, marginRight: 16 },
  themeOptionText: { fontSize: 15, fontWeight: '600', color: C.textPrimary, flex: 1 },
  themeOptionTextActive: { color: C.primary, fontWeight: '800' },
  themeOptionCheck: { fontSize: 18, color: C.primary, fontWeight: '800' },
});
