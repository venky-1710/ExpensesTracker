import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import { GlobalLoader } from '../../components/GlobalLoader';
import { FloatingLabelInput } from '../../components/FloatingLabelInput';

const webotLogo = require('../../../assets/images/webot_logo.jpg');

export default function LoginScreen() {
  const { C } = useAppTheme();
  const s = getStyles(C);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered credentials on mount
  useEffect(() => {
    AsyncStorage.getItem('rememberedCredentials').then(data => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.email && parsed.password) {
            setEmail(parsed.email);
            setPassword(parsed.password);
            setRememberMe(true);
          }
        } catch (e) {}
      }
    });
  }, []);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [signupStep, setSignupStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const otpInputRef = useRef<TextInput>(null);
  const { login, requestSignup, verifySignup, googleLogin } = useAuth();

  // Debounced check for availability
  useEffect(() => {
    if (isLogin) {
      setFieldErrors(prev => ({ ...prev, username: '', email: '' }));
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      const u = username.trim();
      const e = email.trim();
      
      if (u.length > 2 || e.length > 5) {
        try {
          const res = await authService.checkAvailability(u || undefined, e || undefined);
          setFieldErrors(prev => {
            const next = { ...prev };
            if (!res.username_available && u.length > 2) next.username = 'Username is already taken';
            else delete next.username;
            
            if (!res.email_available && e.length > 5) next.email = 'Email is already registered';
            else delete next.email;
            return next;
          });
        } catch (err) {
          // Ignore
        }
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [username, email, isLogin]);

  // Password strength: 0-4
  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };
  const pwStrength = getPasswordStrength(password);
  const pwStrengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength] ?? '';
  const pwStrengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'][pwStrength] ?? '';

  const handleGoogleLogin = async () => {
    console.warn("Google Login is disabled in Expo Go");
  };

  const handleSubmit = async () => {
    setFieldErrors({});
    if (isLogin) {
      if (!email || !password) return;
      setSubmitting(true);
      try {
        const ok = await login(email.trim(), password);
        if (ok) {
          if (rememberMe) {
            await AsyncStorage.setItem('rememberedCredentials', JSON.stringify({ email: email.trim(), password }));
          } else {
            await AsyncStorage.removeItem('rememberedCredentials');
          }
          router.replace('/(main)/dashboard');
        }
      } catch (e) {}
      setSubmitting(false);
    } else {
      if (signupStep === 1) {
        if (!email || !password || !name || !username) return;
        if (pwStrength < 2) {
          setFieldErrors({ password: 'Password is too weak. Use 8+ chars with uppercase, numbers, or symbols.' });
          return;
        }
        setSubmitting(true);
        try {
          console.log('Submitting requestSignup...');
          const ok = await requestSignup({ email, password, full_name: name, username });
          console.log('requestSignup ok?', ok);
          if (ok) {
            console.log('Setting signup step to 2');
            setSignupStep(2);
          }
        } catch (e: any) {
          const detail = e.response?.data?.detail || '';
          if (typeof detail === 'string') {
            if (detail.toLowerCase().includes('username')) setFieldErrors({ username: detail });
            else if (detail.toLowerCase().includes('email')) setFieldErrors({ email: detail });
          }
        }
        setSubmitting(false);
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setSubmitting(true);
    try {
      const ok = await verifySignup(email, otpCode);
      if (ok) router.replace('/(main)/dashboard');
    } catch (e) {}
    setSubmitting(false);
  };


  return (
    <SafeAreaView style={s.root}>
      <GlobalLoader C={C} visible={submitting || googleLoading} messages="Please wait..." />
      <ThemeToggle />
      {/* Background glow orbs */}
      <View style={s.glowTopLeft} />
      <View style={s.glowBottomRight} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <>
            <View style={s.content}>
              <View style={s.topHeader}>
                <View style={s.logoWrapper}>
                  <Image source={webotLogo} style={s.logoImage} resizeMode="contain" />
                </View>
              </View>
              <Text style={s.title}>{isLogin ? 'Welcome Back!' : 'Create Your Account?'}</Text>
              <Text style={s.subtitle}>
                {isLogin ? 'Sign in to analyze your transactions and maintain your daily expenses.' : 'Create your account to track exactly how much you spend and what you earn.'}
              </Text>

              <View style={s.form}>
                {!isLogin && signupStep === 2 ? (
                  <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>6-Digit Verification Code</Text>
                    <TouchableOpacity
                      activeOpacity={1}
                      style={s.otpContainer}
                      onPress={() => otpInputRef.current?.focus()}
                    >
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <View key={i} style={[s.otpBox, otpCode.length === i && s.otpBoxActive]}>
                          <Text style={s.otpText}>{otpCode[i] || ''}</Text>
                        </View>
                      ))}
                      <TextInput
                        ref={otpInputRef}
                        style={s.hiddenInput}
                        value={otpCode}
                        onChangeText={setOtpCode}
                        keyboardType="number-pad"
                        maxLength={6}
                        caretHidden
                        autoFocus
                      />
                    </TouchableOpacity>
                    <Text style={s.fieldHint}>We sent a code to {email}</Text>
                  </View>
                ) : (
                  <>
                    {!isLogin && (
                      <>
                    <FloatingLabelInput
                      label="Full Name"
                      isRequired={true}
                      iconName="user"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />

                    <FloatingLabelInput
                      label="Username"
                      isRequired={true}
                      iconName="at-sign"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      error={fieldErrors.username}
                    />
                  </>
                )}

                <FloatingLabelInput
                  label="Email address"
                  isRequired={true}
                  iconName="mail"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={fieldErrors.email}
                />

                <View style={s.fieldGroup}>
                  <FloatingLabelInput
                    label="Password"
                    isRequired={true}
                    iconName="lock"
                    value={password}
                    onChangeText={v => { setPassword(v); setFieldErrors(f => ({ ...f, password: '' })); }}
                    isPassword={true}
                    error={fieldErrors.password}
                  />
                  {!isLogin && password.length > 0 && (
                    <View style={s.strengthWrap}>
                      <View style={s.strengthBars}>
                        {[1, 2, 3, 4].map(i => (
                          <View
                            key={i}
                            style={[
                              s.strengthSegment,
                              { backgroundColor: i <= pwStrength ? pwStrengthColor : C.border },
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={[s.strengthLabel, { color: pwStrengthColor }]}>{pwStrengthLabel}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

                {isLogin && (
                  <View style={s.actionsRow}>
                    <TouchableOpacity 
                      style={s.rememberRow} 
                      onPress={() => setRememberMe(!rememberMe)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.checkbox, rememberMe && s.checkboxActive]}>
                        {rememberMe && <Feather name="check" size={12} color="#fff" />}
                      </View>
                      <Text style={s.rememberText}>Remember me</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                      <Text style={s.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[s.btn, submitting && { opacity: 0.6 }, !isLogin && { marginTop: 8 }]}
                  onPress={!isLogin && signupStep === 2 ? handleVerifyOtp : handleSubmit}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : (
                      <View style={s.btnInner}>
                        <Text style={s.btnText}>
                          {isLogin ? 'Sign In' : (signupStep === 2 ? 'Verify Code' : 'Create Account')}
                        </Text>
                        <Feather name="arrow-right" size={18} color="#fff" />
                      </View>
                    )
                  }
                </TouchableOpacity>

                {/* Divider */}
                <View style={s.orRow}>
                  <View style={s.orLine} />
                  <Text style={s.orText}>or continue with</Text>
                  <View style={s.orLine} />
                </View>

                {/* Social Buttons */}
                <View style={s.socialRow}>
                  <TouchableOpacity style={s.socialBtn} onPress={handleGoogleLogin} disabled={googleLoading}>
                    <View style={s.socialBtnInner}>
                      <Text style={s.socialIcon}>G</Text>
                      {googleLoading
                        ? <ActivityIndicator color={C.textPrimary} size="small" />
                        : <Text style={s.socialBtnText}>Google</Text>
                      }
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.socialBtn}>
                    <View style={s.socialBtnInner}>
                      <Feather name="aperture" size={16} color={C.textPrimary} style={{ marginRight: -4, marginTop: 1 }} />
                      <Text style={s.socialBtnText}>Apple</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Switch Mode */}
                <View style={s.switchRow}>
                  <Text style={s.switchText}>
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  </Text>
                  <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                    <Text style={s.switchLink}>{isLogin ? 'Sign up' : 'Sign in'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>


          </>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, overflow: 'hidden' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

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

  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 16,
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
  },
  topHeader: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    height: 64,
  },
  themeToggleWrapper: {
    position: 'absolute',
    right: 0,
    top: 10,
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

  title: {
    fontSize: 28, fontWeight: '800', color: C.textPrimary,
    letterSpacing: 0.2, marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: C.textSecondary, marginBottom: 32,
    textAlign: 'center',
  },

  form: {},

  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: C.textSecondary,
    marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase',
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
  inputWithIcon: {
    paddingLeft: 46,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 19,
    zIndex: 1,
  },

  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  otpBox: { 
    width: 48, height: 56, 
    borderRadius: 12, borderWidth: 1, borderColor: C.inputBorder,
    backgroundColor: C.inputBg,
    alignItems: 'center', justifyContent: 'center' 
  },
  otpBoxActive: { borderColor: C.primary, backgroundColor: 'rgba(109,74,255,0.05)' },
  otpText: { fontSize: 24, fontWeight: '700', color: C.textPrimary },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  fieldHint: { fontSize: 12, color: C.textSecondary, marginTop: 4, textAlign: 'center' },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  rememberText: {
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  forgotText: {
    color: C.primary, fontSize: 13, fontWeight: '600',
  },

  btn: {
    backgroundColor: C.primary,
    borderRadius: 28, // pill shape
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  btnText: {
    color: '#fff', fontSize: 16, fontWeight: '700',
  },

  orRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
  },
  orLine: {
    flex: 1, height: 1, backgroundColor: C.border,
  },
  orText: {
    color: C.textMuted, fontSize: 12, fontWeight: '500',
  },

  socialRow: {
    flexDirection: 'row', gap: 12, marginBottom: 28,
  },
  socialBtn: {
    flex: 1, backgroundColor: C.bg, // removed socialBg to keep consistent with dark theme outline
    paddingVertical: 13, borderRadius: 28, // pill shape
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
  },
  socialBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  socialIcon: {
    fontSize: 15, fontWeight: '800', color: C.textPrimary,
  },
  socialBtnText: {
    color: C.textSecondary, fontSize: 14, fontWeight: '600',
  },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  switchText: { color: C.textMuted, fontSize: 14 },
  switchLink: { color: C.primary, fontSize: 14, fontWeight: '700' },

  fieldErrorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5,
  },
  fieldErrorText: {
    fontSize: 12, fontWeight: '500',
  },

  strengthWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
  },
  strengthBars: {
    flex: 1, flexDirection: 'row', gap: 4,
  },
  strengthSegment: {
    flex: 1, height: 4, borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11, fontWeight: '700', minWidth: 36, textAlign: 'right',
  },
});
