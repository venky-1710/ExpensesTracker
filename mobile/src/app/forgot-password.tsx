import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { authService } from '../services/authService';
import Toast from 'react-native-toast-message';
import { useAppTheme } from '../context/ThemeContext';
import { Feather } from '@expo/vector-icons';

const webotLogo = require('../../assets/images/webot_logo.png');

export default function ForgotPasswordScreen() {
  const { C } = useAppTheme();
  const s = getStyles(C);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const hasLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passedCount = [hasLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  let pwStrengthColor = C.border;
  let pwStrengthLabel = 'Very Weak';
  if (passedCount === 1) { pwStrengthColor = C.red; pwStrengthLabel = 'Weak'; }
  else if (passedCount === 2) { pwStrengthColor = '#eab308'; pwStrengthLabel = 'Fair'; }
  else if (passedCount === 3) { pwStrengthColor = '#3b82f6'; pwStrengthLabel = 'Good'; }
  else if (passedCount === 4) { pwStrengthColor = '#22c55e'; pwStrengthLabel = 'Strong'; }

  const requirements = [
    { label: 'At least 8 characters', passed: hasLength },
    { label: 'One capital letter', passed: hasUpper },
    { label: 'One number', passed: hasNumber },
    { label: 'One special symbol', passed: hasSpecial },
  ];

  const handleSendCode = async () => {
    if (!email.trim()) {
      return Toast.show({ type: 'error', text1: 'Email required' });
    }
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.toLowerCase());
      Toast.show({
        type: 'success',
        text1: 'Reset code sent!',
        text2: res.dev_code ? `(Dev Code: ${res.dev_code})` : 'Check your email'
      });
      setStep(2);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.detail || 'Failed to send code' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim() || !newPassword.trim()) {
      return Toast.show({ type: 'error', text1: 'Code and New Password required' });
    }
    if (newPassword.length < 8) {
      return Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' });
    }

    setLoading(true);
    try {
      await authService.resetPassword(email.toLowerCase(), code, newPassword);
      Toast.show({ type: 'success', text1: 'Password updated successfully!' });
      router.back();
    } catch (e) {
      Toast.show({ type: 'error', text1: e.response?.data?.detail || 'Invalid code' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={s.brandSection}>
            <Image source={webotLogo} style={s.logoImage} resizeMode="contain" />
            <View style={s.brandTextContainer}>
              <Text style={s.brandName}>ExpenseTrack</Text>
              <Text style={s.brandTagline}>Smart money, smarter you</Text>
            </View>
          </View>

          <View style={s.content}>
            <Text style={s.title}>{step === 1 ? 'Forgot Password' : 'Reset Password'}</Text>
            <Text style={s.subtitle}>
              {step === 1
                ? "Enter your email address and we'll send you a 6-digit code to reset your password."
                : `Enter the 6-digit code sent to ${email} and your new password.`}
            </Text>

            {step === 1 ? (
              <View style={s.formGroup}>
                <Text style={s.label}>Email Address</Text>
                <TextInput
                  style={s.input}
                  placeholder="hello@example.com"
                  placeholderTextColor={C.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TouchableOpacity
                  style={[s.btn, loading && { opacity: 0.6 }]}
                  onPress={handleSendCode}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send Code</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.formGroup}>
                <Text style={s.label}>6-Digit Reset Code</Text>
                <View style={s.otpContainer}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={[s.otpBox, code.length === i && s.otpBoxActive]}>
                      <Text style={s.otpText}>{code[i] || ''}</Text>
                    </View>
                  ))}
                  <TextInput
                    style={s.hiddenInput}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    caretHidden
                    autoFocus
                  />
                </View>

                <Text style={s.label}>New Password</Text>
                <View style={s.passwordContainer}>
                  <TextInput
                    style={[s.input, { paddingRight: 48, flex: 1 }]}
                    placeholder="••••••••"
                    placeholderTextColor={C.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity style={s.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={C.textMuted} />
                  </TouchableOpacity>
                </View>

                {newPassword.length > 0 && (
                  <View style={s.strengthContainer}>
                    <View style={s.strengthWrap}>
                      <View style={s.strengthBars}>
                        {[1, 2, 3, 4].map(i => (
                          <View
                            key={i}
                            style={[
                              s.strengthSegment,
                              { backgroundColor: i <= passedCount ? pwStrengthColor : C.border },
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={[s.strengthLabel, { color: pwStrengthColor }]}>{pwStrengthLabel}</Text>
                    </View>
                    <View style={s.reqList}>
                      {requirements.map((req, idx) => (
                        <View key={idx} style={s.reqItem}>
                          <Feather name={req.passed ? 'check-circle' : 'circle'} size={14} color={req.passed ? '#22c55e' : C.textMuted} />
                          <Text style={[s.reqText, { color: req.passed ? '#22c55e' : C.textMuted }]}>{req.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[s.btn, loading && { opacity: 0.6 }]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Update Password</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1 },
  backBtn: {
    width: 48, height: 48,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 16, marginTop: 8,
  },
  backIcon: { color: C.textPrimary, fontSize: 28 },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  logoImage: {
    width: 52, height: 52, borderRadius: 12,
  },
  brandTextContainer: {
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 24, fontWeight: '800', color: C.textPrimary,
    letterSpacing: 0.2, marginBottom: 2,
  },
  brandTagline: {
    fontSize: 13, color: C.textMuted, fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: C.textMuted,
    lineHeight: 24,
    marginBottom: 40,
  },
  formGroup: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSecondary,
    marginBottom: -8,
  },
  input: {
    height: 56,
    backgroundColor: C.inputBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    color: C.textPrimary,
    fontSize: 16,
  },
  btn: {
    height: 56,
    backgroundColor: C.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    elevation: 4,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
  },
  otpBox: {
    width: 48,
    height: 56,
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: C.primary,
    borderWidth: 2,
  },
  otpText: {
    fontSize: 24,
    fontWeight: '600',
    color: C.textPrimary,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  passwordContainer: {
    flexDirection: 'row',
    position: 'relative',
    alignItems: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  strengthContainer: { marginTop: 4, gap: 12 },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1, marginRight: 16 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '700', width: 60, textAlign: 'right' },
  reqList: { gap: 6 },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqText: { fontSize: 13, fontWeight: '500' }
});
