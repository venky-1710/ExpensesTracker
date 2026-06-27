import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { authService } from '../services/authService';
import Toast from 'react-native-toast-message';
import { useAppTheme } from '../context/ThemeContext';

export default function ForgotPasswordScreen() {
  const { C } = useAppTheme();
  const s = getStyles(C);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

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
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to send code' });
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
              <TextInput
                style={s.input}
                placeholder="123456"
                placeholderTextColor={C.textMuted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              
              <Text style={s.label}>New Password</Text>
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
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
  }
});
