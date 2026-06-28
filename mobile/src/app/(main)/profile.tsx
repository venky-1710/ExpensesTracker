import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
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

  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '', username: '', phone: '', profile_image: '', banner_image: '',
  });
  const [saving, setSaving] = useState(false);

  const [themeModal, setThemeModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteShowPw, setDeleteShowPw] = useState(false);

  const load = async () => {
    try {
      const data = await userService.getProfile();
      setUser(data);
      setEditForm({
        full_name: data.full_name || '',
        username: data.username || '',
        phone: data.phone || '',
        profile_image: data.profile_image || '',
        banner_image: data.banner_image || '',
      });
    } catch (e) {
      console.error('Profile load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaveProfile = async () => {
    if (!editForm.full_name.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Full name cannot be empty' });
      return;
    }
    setSaving(true);
    try {
      const updated = await userService.updateProfile(editForm);
      setUser(updated);
      setEditModal(false);
      Toast.show({ type: 'success', text1: 'Saved!', text2: 'Profile updated successfully' });
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
      setEditForm(prev => ({
        ...prev,
        [field]: `data:${mime};base64,${result.assets[0].base64}`,
      }));
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.new_password || !pwForm.confirm_password) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please fill in both fields' });
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      Toast.show({ type: 'error', text1: 'Mismatch', text2: 'Passwords do not match' });
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
      Toast.show({ type: 'success', text1: 'Done!', text2: 'Password changed successfully' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.detail || 'Failed to change password' });
    } finally { setPwSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please enter your password to confirm' });
      return;
    }
    setDeleteLoading(true);
    try {
      await userService.deleteAccount(deletePassword);
      setDeleteModal(false);
      setDeletePassword('');
      await logout();
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.response?.data?.data?.message || 'Failed to delete account';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  const initials = (user?.full_name || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  const themeLabel = themeMode === 'system' ? 'System' : themeMode === 'dark' ? 'Dark' : 'Light';
  const themeIcon: any = themeMode === 'system' ? 'monitor' : isDark ? 'moon' : 'sun';

  const accountItems = [
    {
      label: 'Edit Profile',
      sub: 'Name, photo & contact info',
      icon: 'user' as const,
      color: C.primary,
      onPress: () => setEditModal(true),
    },
    {
      label: 'Appearance',
      sub: `Theme: ${themeLabel}`,
      icon: themeIcon,
      color: C.blue,
      onPress: () => setThemeModal(true),
    },
    {
      label: 'Security',
      sub: 'Update your password',
      icon: 'shield' as const,
      color: C.green,
      onPress: () => setPwModal(true),
    },
  ];

  return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Avatar ─────────────────────────────────── */}
        {/* ── Banner ─────────────────────────────────── */}
        <View style={s.banner}>
          {user?.banner_image ? (
            <Image source={{ uri: user.banner_image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <>
              <View style={s.glow1} />
              <View style={s.glow2} />
              <View style={s.glow3} />
            </>
          )}
          <View style={s.bannerDim} />
          <TouchableOpacity style={s.bannerEditBtn} onPress={() => setEditModal(true)} activeOpacity={0.8}>
            <Feather name="edit-2" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Avatar ─────────────────────────────────── */}
        <View style={s.avatarRow}>
          <View style={s.avatarOuter}>
            <View style={s.avatar}>
              {user?.profile_image
                ? <Image source={{ uri: user.profile_image }} style={s.avatarImage} />
                : <Text style={s.avatarInitials}>{initials}</Text>
              }
            </View>
            <TouchableOpacity style={s.cameraBadge} onPress={() => setEditModal(true)} activeOpacity={0.8}>
              <Feather name="camera" size={11} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Identity ───────────────────────────────── */}
        <View style={s.identity}>
          <Text style={s.userName}>{user?.full_name || 'User'}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
          <View style={s.rolePill}>
            <Text style={s.roleText}>{(user?.role || 'User').toUpperCase()}</Text>
          </View>
        </View>

        {/* ── Stats Strip ────────────────────────────── */}
        <View style={s.statsStrip}>
          <View style={s.statCell}>
            <Text style={s.statVal}>{memberSince}</Text>
            <Text style={s.statKey}>Joined</Text>
          </View>
          <View style={s.statSep} />
          <View style={s.statCell}>
            <Text style={s.statVal} numberOfLines={1}>
              {user?.username ? `@${user.username}` : '—'}
            </Text>
            <Text style={s.statKey}>Username</Text>
          </View>
          <View style={s.statSep} />
          <View style={s.statCell}>
            <Text style={s.statVal} numberOfLines={1}>
              {user?.phone || '—'}
            </Text>
            <Text style={s.statKey}>Phone</Text>
          </View>
        </View>

        {/* ── Account Settings ───────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Account Settings</Text>
          <View style={s.menuCard}>
            {accountItems.map((item, i) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity style={s.menuRow} onPress={item.onPress} activeOpacity={0.7}>
                  <View style={[s.menuIconBox, { backgroundColor: item.color + '18' }]}>
                    <Feather name={item.icon} size={17} color={item.color} />
                  </View>
                  <View style={s.menuMeta}>
                    <Text style={s.menuLabel}>{item.label}</Text>
                    <Text style={s.menuSub}>{item.sub}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={C.textMuted} />
                </TouchableOpacity>
                {i < accountItems.length - 1 && <View style={s.rowSep} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Sign Out ───────────────────────────────── */}
        <View style={s.section}>
          <TouchableOpacity style={s.signOutBtn} onPress={logout} activeOpacity={0.8}>
            <Feather name="log-out" size={17} color={C.red} />
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Danger Zone ────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: C.red + 'aa' }]}>Danger Zone</Text>
          <TouchableOpacity style={s.dangerRow} onPress={() => setDeleteModal(true)} activeOpacity={0.8}>
            <View style={[s.menuIconBox, { backgroundColor: C.red + '15' }]}>
              <Feather name="trash-2" size={17} color={C.red} />
            </View>
            <View style={s.menuMeta}>
              <Text style={[s.menuLabel, { color: C.red }]}>Delete Account</Text>
              <Text style={s.menuSub}>Permanently removes all your data</Text>
            </View>
            <Feather name="chevron-right" size={16} color={C.red + '70'} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Appearance Modal ───────────────────────── */}
      <Modal visible={themeModal} animationType="fade" transparent onRequestClose={() => setThemeModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Appearance</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setThemeModal(false)}>
                <Feather name="x" size={17} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={s.sheetBody}>
              {([
                { mode: 'system', label: 'System Default', icon: 'monitor', desc: 'Follows device setting' },
                { mode: 'light', label: 'Light Mode', icon: 'sun', desc: 'Always light' },
                { mode: 'dark', label: 'Dark Mode', icon: 'moon', desc: 'Always dark' },
              ] as const).map((opt, i, arr) => (
                <React.Fragment key={opt.mode}>
                  <TouchableOpacity
                    style={[s.themeRow, themeMode === opt.mode && s.themeRowActive]}
                    onPress={() => { setThemeMode(opt.mode); setThemeModal(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={[s.themeIconBox, themeMode === opt.mode && { backgroundColor: C.primary + '20' }]}>
                      <Feather name={opt.icon} size={17} color={themeMode === opt.mode ? C.primary : C.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.themeLabel, themeMode === opt.mode && { color: C.primary }]}>{opt.label}</Text>
                      <Text style={s.themeDesc}>{opt.desc}</Text>
                    </View>
                    <View style={[s.radio, themeMode === opt.mode && s.radioActive]}>
                      {themeMode === opt.mode && <View style={s.radioDot} />}
                    </View>
                  </TouchableOpacity>
                  {i < arr.length - 1 && <View style={s.rowSep} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Profile Modal ─────────────────────── */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Edit Profile</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setEditModal(false)}>
                <Feather name="x" size={17} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false}>
              {/* Image pickers */}
              <View style={s.imagePickers}>
                <TouchableOpacity style={s.bannerPicker} onPress={() => pickImage('banner_image')} activeOpacity={0.8}>
                  {editForm.banner_image
                    ? <Image source={{ uri: editForm.banner_image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    : (
                      <View style={s.bannerPickerPlaceholder}>
                        <Feather name="image" size={22} color={C.textMuted} />
                        <Text style={s.pickerHint}>Change Banner</Text>
                      </View>
                    )
                  }
                </TouchableOpacity>

                <TouchableOpacity style={s.avatarPicker} onPress={() => pickImage('profile_image')} activeOpacity={0.8}>
                  {editForm.profile_image
                    ? <Image source={{ uri: editForm.profile_image }} style={s.avatarPickerImage} />
                    : <Text style={s.avatarPickerInitials}>{initials}</Text>
                  }
                  <View style={s.avatarPickerBadge}>
                    <Feather name="camera" size={11} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Fields */}
              <FormField label="Full Name" icon="user" C={C}>
                <TextInput
                  style={s.input}
                  placeholder="Your full name"
                  placeholderTextColor={C.textMuted}
                  value={editForm.full_name}
                  onChangeText={v => setEditForm(f => ({ ...f, full_name: v }))}
                  autoCapitalize="words"
                />
              </FormField>

              <FormField label="Username" icon="at-sign" C={C}>
                <TextInput
                  style={s.input}
                  placeholder="@username"
                  placeholderTextColor={C.textMuted}
                  value={editForm.username}
                  onChangeText={v => setEditForm(f => ({ ...f, username: v }))}
                  autoCapitalize="none"
                />
              </FormField>

              <FormField label="Phone" icon="phone" C={C}>
                <TextInput
                  style={s.input}
                  placeholder="+91 9999999999"
                  placeholderTextColor={C.textMuted}
                  value={editForm.phone}
                  onChangeText={v => setEditForm(f => ({ ...f, phone: v }))}
                  keyboardType="phone-pad"
                />
              </FormField>

              <TouchableOpacity
                style={[s.primaryBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveProfile}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                    <Feather name="check" size={17} color="#fff" />
                    <Text style={s.primaryBtnText}>Save Changes</Text>
                  </>
                }
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Delete Account Modal ───────────────────── */}
      <Modal
        visible={deleteModal}
        animationType="fade"
        transparent
        onRequestClose={() => { setDeleteModal(false); setDeletePassword(''); }}
      >
        <View style={s.deleteOverlay}>
          <View style={s.deleteSheet}>
            <View style={s.deleteIconCircle}>
              <Feather name="trash-2" size={28} color={C.red} />
            </View>
            <Text style={s.deleteTitle}>Delete Account</Text>
            <Text style={s.deleteBody}>
              This permanently removes your account, all transactions and calendar events. This cannot be undone.
            </Text>

            {/* Password confirmation */}
            <View style={s.deleteFieldWrap}>
              <Text style={s.deleteFieldLabel}>Confirm your password</Text>
              <View style={s.deleteFieldRow}>
                <Feather name="lock" size={15} color={C.textMuted} style={s.deleteFieldIcon} />
                <TextInput
                  style={s.deleteInput}
                  placeholder="Enter your password"
                  placeholderTextColor={C.textMuted}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  secureTextEntry={!deleteShowPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={s.deleteEyeBtn}
                  onPress={() => setDeleteShowPw(v => !v)}
                  activeOpacity={0.7}
                >
                  <Feather name={deleteShowPw ? 'eye' : 'eye-off'} size={16} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.deleteActions}>
              <TouchableOpacity
                style={s.deleteCancelBtn}
                onPress={() => { setDeleteModal(false); setDeletePassword(''); }}
                activeOpacity={0.8}
              >
                <Text style={s.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.deleteConfirmBtn, (deleteLoading || !deletePassword) && { opacity: 0.5 }]}
                onPress={handleDeleteAccount}
                disabled={deleteLoading || !deletePassword}
                activeOpacity={0.8}
              >
                {deleteLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.deleteConfirmText}>Delete</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Change Password Modal ──────────────────── */}
      <Modal visible={pwModal} animationType="slide" transparent onRequestClose={() => setPwModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Change Password</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setPwModal(false)}>
                <Feather name="x" size={17} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false}>
              <FormField label="New Password" icon="lock" C={C}>
                <TextInput
                  style={s.input}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={C.textMuted}
                  value={pwForm.new_password}
                  onChangeText={v => setPwForm(f => ({ ...f, new_password: v }))}
                  secureTextEntry
                />
              </FormField>

              <FormField label="Confirm Password" icon="lock" C={C}>
                <TextInput
                  style={s.input}
                  placeholder="Repeat new password"
                  placeholderTextColor={C.textMuted}
                  value={pwForm.confirm_password}
                  onChangeText={v => setPwForm(f => ({ ...f, confirm_password: v }))}
                  secureTextEntry
                />
              </FormField>

              <TouchableOpacity
                style={[s.primaryBtn, pwSaving && { opacity: 0.6 }]}
                onPress={handleChangePassword}
                disabled={pwSaving}
                activeOpacity={0.85}
              >
                {pwSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                    <Feather name="shield" size={17} color="#fff" />
                    <Text style={s.primaryBtnText}>Update Password</Text>
                  </>
                }
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Reusable form field wrapper ────────────────────────────────────
function FormField({
  label, icon, children, C,
}: {
  label: string;
  icon: any;
  children: React.ReactNode;
  C: ThemeColors;
}) {
  const s = getStyles(C);
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldRow}>
        <View style={s.fieldIcon}>
          <Feather name={icon} size={15} color={C.textMuted} />
        </View>
        {children}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const getStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 12 },
  loadingText: { color: C.textMuted, fontSize: 14 },

  // Banner
  banner: {
    height: 160,
    backgroundColor: C.primary + '22',
    overflow: 'hidden',
  },
  glow1: {
    position: 'absolute', top: -60, left: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: C.primary + '35',
  },
  glow2: {
    position: 'absolute', top: 20, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: C.accent + '20',
  },
  glow3: {
    position: 'absolute', bottom: -30, left: 60,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: C.blue + '15',
  },
  bannerDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  bannerEditBtn: {
    position: 'absolute', top: 18, right: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },

  // Avatar
  avatarRow: {
    alignItems: 'center',
    marginTop: -48,
    marginBottom: 12,
  },
  avatarOuter: { position: 'relative' },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: C.bg,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 48 },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: '#fff' },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: C.bg,
  },

  // Identity
  identity: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 4,
  },
  userName: {
    fontSize: 24, fontWeight: '800', color: C.textPrimary, textAlign: 'center',
  },
  userEmail: {
    fontSize: 14, color: C.textMuted, textAlign: 'center', marginBottom: 8,
  },
  rolePill: {
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: C.primary + '18',
    borderRadius: 20, borderWidth: 1, borderColor: C.primary + '35',
  },
  roleText: {
    fontSize: 11, fontWeight: '700', color: C.primary, letterSpacing: 1,
  },

  // Stats
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: C.card,
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    paddingVertical: 14,
  },
  statCell: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  statVal: {
    fontSize: 13, fontWeight: '800', color: C.textPrimary,
    marginBottom: 3, textAlign: 'center',
  },
  statKey: {
    fontSize: 10, fontWeight: '600', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center',
  },
  statSep: { width: 1, alignSelf: 'stretch', backgroundColor: C.border, marginVertical: 4 },

  // Sections
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.5,
    marginBottom: 10,
  },

  // Menu card
  menuCard: {
    backgroundColor: C.card,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowSep: { height: 1, backgroundColor: C.border, marginLeft: 62 },
  menuIconBox: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  menuMeta: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: C.textPrimary, marginBottom: 1 },
  menuSub: { fontSize: 12, color: C.textMuted, fontWeight: '400' },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 52, borderRadius: 16,
    backgroundColor: C.red + '10',
    borderWidth: 1, borderColor: C.red + '28',
  },
  signOutText: { fontSize: 16, fontWeight: '700', color: C.red },

  // Danger
  dangerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.red + '08',
    borderRadius: 18, borderWidth: 1, borderColor: C.red + '28',
  },

  // Bottom sheet / modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '90%',
    borderTopWidth: 1, borderColor: 'rgba(109,74,255,0.12)',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border, alignSelf: 'center', marginTop: 12,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderColor: C.border,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.border + '80',
    alignItems: 'center', justifyContent: 'center',
  },
  sheetBody: { paddingHorizontal: 24, paddingTop: 20 },

  // Appearance modal
  themeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 4,
  },
  themeRowActive: {},
  themeIconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.border + '50',
  },
  themeLabel: { fontSize: 15, fontWeight: '600', color: C.textPrimary, marginBottom: 1 },
  themeDesc: { fontSize: 12, color: C.textMuted },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: C.primary },
  radioDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary,
  },

  // Edit profile image pickers
  imagePickers: { alignItems: 'center', marginBottom: 24 },
  bannerPicker: {
    width: '100%', height: 100, borderRadius: 14, overflow: 'hidden',
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerPickerPlaceholder: { alignItems: 'center', gap: 6 },
  pickerHint: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  avatarPicker: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -40, borderWidth: 4, borderColor: C.card,
  },
  avatarPickerImage: { width: '100%', height: '100%', borderRadius: 40 },
  avatarPickerInitials: { fontSize: 24, fontWeight: '800', color: '#fff' },
  avatarPickerBadge: {
    position: 'absolute', bottom: 0, right: -2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: C.card,
  },

  // Form fields
  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: C.textSecondary,
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8,
  },
  fieldRow: { position: 'relative', justifyContent: 'center' },
  fieldIcon: { position: 'absolute', left: 16, zIndex: 1 },
  input: {
    backgroundColor: C.inputBg, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingLeft: 44, paddingRight: 16, paddingVertical: 14,
    color: C.textPrimary, fontSize: 15,
  },

  // Primary action button
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16,
    marginTop: 8,
    shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Delete account modal
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  deleteSheet: {
    width: '100%',
    backgroundColor: C.card,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.red + '35',
    shadowColor: C.red,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  deleteIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.red + '15',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.red + '30',
    marginBottom: 20,
  },
  deleteTitle: {
    fontSize: 20, fontWeight: '800', color: C.textPrimary,
    marginBottom: 10, textAlign: 'center',
  },
  deleteBody: {
    fontSize: 14, color: C.textMuted,
    textAlign: 'center', lineHeight: 22,
    marginBottom: 28,
  },
  deleteActions: {
    flexDirection: 'row', gap: 12, width: '100%',
  },
  deleteCancelBtn: {
    flex: 1, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.inputBg,
    borderWidth: 1, borderColor: C.border,
  },
  deleteCancelText: {
    fontSize: 15, fontWeight: '700', color: C.textSecondary,
  },
  deleteConfirmBtn: {
    flex: 1, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.red,
    shadowColor: C.red, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  deleteConfirmText: {
    fontSize: 15, fontWeight: '700', color: '#fff',
  },

  deleteFieldWrap: { width: '100%', marginBottom: 24 },
  deleteFieldLabel: {
    fontSize: 11, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  deleteFieldRow: {
    position: 'relative', justifyContent: 'center',
  },
  deleteFieldIcon: { position: 'absolute', left: 14, zIndex: 1 },
  deleteInput: {
    backgroundColor: C.inputBg,
    borderRadius: 12, borderWidth: 1, borderColor: C.red + '35',
    paddingLeft: 42, paddingRight: 44, paddingVertical: 13,
    color: C.textPrimary, fontSize: 14,
  },
  deleteEyeBtn: { position: 'absolute', right: 14 },
});
