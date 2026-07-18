import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { authService } from '../services/authService';
import Toast from 'react-native-toast-message';
import { useAppTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import { GlobalLoader } from '../components/GlobalLoader';
import { FloatingLabelInput } from '../components/FloatingLabelInput';
import { Feather } from '@expo/vector-icons';

const webotLogo = require('../../assets/images/webot_logo.jpg');

export default function ForgotPasswordScreen() {
  const { C } = useAppTheme();
  const s = getStyles(C);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 4 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (step === 4 && countdown === 0) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/login');
      }
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

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

  const handleSendCode = async (isResend = false) => {
    if (!email.trim()) {
      return Toast.show({ type: 'error', text1: 'Email required' });
    }
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.toLowerCase());
      Toast.show({
        type: 'success',
        text1: isResend ? 'Reset code resent!' : 'Reset code sent!',
        text2: res.dev_code ? `(Dev Code: ${res.dev_code})` : 'Check your email'
      });
      if (!isResend) setStep(2);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.detail || 'Failed to send code' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (code.length !== 6) {
      return Toast.show({ type: 'error', text1: 'Please enter the 6-digit code' });
    }
    setStep(3);
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      return Toast.show({ type: 'error', text1: 'Passwords are required' });
    }
    if (newPassword !== confirmPassword) {
      return Toast.show({ type: 'error', text1: 'Passwords do not match' });
    }
    if (newPassword.length < 8) {
      return Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' });
    }

    setLoading(true);
    try {
      await authService.resetPassword(email.toLowerCase(), code, newPassword);
      setStep(4);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.detail || 'Failed to reset password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <GlobalLoader C={C} visible={loading} messages="Please wait..." />
      <ThemeToggle />
      <View style={s.glowTopLeft} />
      <View style={s.glowBottomRight} />
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingTop: 60, paddingBottom: 40 }}>
          <>
            <View style={[s.content, step === 4 && { flex: 1, justifyContent: 'center' }]}>
              {step < 4 && (
                <View style={s.topHeader}>
                  <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={s.absBackBtn}>
                    <Text style={s.inlineBackIcon}>←</Text>
                  </TouchableOpacity>
                  <View style={s.logoWrapper}>
                    <Image source={webotLogo} style={s.logoImage} resizeMode="contain" />
                  </View>
                </View>
              )}
              
              {step === 1 && (
                <>
                  <Text style={s.title}>Forgot password</Text>
                  <Text style={s.subtitle}>Please enter your email to reset the password</Text>
                  <View style={s.formGroup}>
                    <FloatingLabelInput
                      label="Your Email"
                      iconName="mail"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <TouchableOpacity
                      style={[s.btn, loading && { opacity: 0.6 }]}
                      onPress={() => handleSendCode(false)}
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Reset Password</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={s.title}>Check your email</Text>
                  <Text style={s.subtitle}>We sent a reset link to {email}. Enter the 6-digit code mentioned in the email.</Text>
                  <View style={s.formGroup}>
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
                    
                    <TouchableOpacity
                      style={s.btn}
                      onPress={handleVerifyCode}
                    >
                      <Text style={s.btnText}>Verify Code</Text>
                    </TouchableOpacity>

                    <View style={s.resendContainer}>
                      <Text style={s.resendText}>Haven't got the email yet? </Text>
                      <TouchableOpacity onPress={() => handleSendCode(true)}>
                        <Text style={s.resendLink}>Resend email</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              {step === 3 && (
                <>
                  <Text style={s.title}>Set a new password</Text>
                  <Text style={s.subtitle}>Create a new password. Ensure it differs from previous ones for security.</Text>
                  
                  <View style={s.formGroup}>
                    <FloatingLabelInput
                      label="Password"
                      iconName="lock"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      isPassword={true}
                    />

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

                    <FloatingLabelInput
                      label="Confirm Password"
                      iconName="lock"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      isPassword={true}
                    />

                    <TouchableOpacity
                      style={[s.btn, loading && { opacity: 0.6 }]}
                      onPress={handleResetPassword}
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Update Password</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === 4 && (
                <>
                  <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 16 }}>
                    <View style={s.successCircle}>
                      <Feather name="check" size={48} color="#fff" />
                    </View>
                  </View>
                  <Text style={s.title}>Password reset</Text>
                  <Text style={s.subtitle}>Your password has been successfully reset.</Text>
                  <View style={s.countdownContainer}>
                    <Text style={s.countdownText}>
                      Redirecting to sign in in {countdown}...
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={{ flex: 1 }} />
            {step < 4 && (
              <View style={s.bottomRow}>
                <Text style={s.bottomText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}>
                  <Text style={s.bottomLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1 },
  glowTopLeft: {
    position: 'absolute', top: -80, left: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(109,74,255,0.12)',
  },
  glowBottomRight: {
    position: 'absolute', bottom: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(200,80,255,0.08)',
  },
  topHeader: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    height: 64,
  },
  absBackBtn: {
    position: 'absolute',
    left: 0,
    top: 12,
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  logoWrapper: {
    width: 64, height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(109,74,255,0.2)',
  },
  logoImage: {
    width: '100%', height: '100%',
  },
  inlineBackIcon: { color: C.textPrimary, fontSize: 24, marginTop: -4 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: C.textMuted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  formGroup: {
    gap: 16,
  },
  inputContainer: {
    position: 'relative',
    marginTop: 8,
  },
  floatingLabel: {
    position: 'absolute',
    top: -9,
    left: 16,
    zIndex: 10,
    backgroundColor: C.bg,
    paddingHorizontal: 6,
    color: C.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  inputIconLeft: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  inputWithIcon: {
    paddingLeft: 46,
  },
  input: {
    height: 56,
    backgroundColor: C.bg,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    paddingHorizontal: 16,
    color: C.textPrimary,
    fontSize: 16,
  },
  btn: {
    height: 56,
    backgroundColor: C.primary,
    borderRadius: 28,
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
    paddingHorizontal: 8,
  },
  otpBox: {
    width: 44,
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
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 19,
    zIndex: 1,
  },
  strengthContainer: { marginTop: 4, gap: 12 },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1, marginRight: 16 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '700', width: 60, textAlign: 'right' },
  reqList: { gap: 6 },
  reqItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqText: { fontSize: 13, fontWeight: '500' },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  bottomText: {
    color: C.textSecondary,
    fontSize: 14,
  },
  bottomLink: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  resendText: {
    color: C.textSecondary,
    fontSize: 14,
  },
  resendLink: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  countdownContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  countdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
  },
});
