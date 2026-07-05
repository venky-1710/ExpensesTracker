import React, { useState, useEffect, useRef } from 'react';
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
        const ok = await login(email, password);
        if (ok) router.replace('/(main)/dashboard');
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
      {/* Background glow orbs */}
      <View style={s.glowTopLeft} />
      <View style={s.glowBottomRight} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Brand Section */}
          <View style={s.brandSection}>
            <Image source={webotLogo} style={s.logoImage} resizeMode="contain" />
            <View style={s.brandTextContainer}>
              <Text style={s.brandName}>ExpenseTrack</Text>
              <Text style={s.brandTagline}>Smart money, smarter you</Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={s.card}>
            <Text style={s.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
            <Text style={s.subtitle}>
              {isLogin ? 'Sign in to your account' : 'Sign up with email & password'}
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
                  <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>Full Name</Text>
                    <View style={s.inputContainer}>
                      <View style={s.inputIconLeft}>
                        <Feather name="user" size={20} color={C.textMuted} />
                      </View>
                      <TextInput
                        style={[s.input, s.inputWithIcon]}
                        placeholder="John Doe"
                        placeholderTextColor={C.textMuted}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>Username</Text>
                    <View style={s.inputContainer}>
                      <View style={s.inputIconLeft}>
                        <Feather name="at-sign" size={20} color={fieldErrors.username ? C.red : C.textMuted} />
                      </View>
                      <TextInput
                        style={[s.input, s.inputWithIcon, fieldErrors.username && { borderColor: C.red }]}
                        placeholder="e.g. johndoe"
                        placeholderTextColor={C.textMuted}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    {fieldErrors.username && <Text style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{fieldErrors.username}</Text>}
                  </View>
                </>
              )}

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Email Address</Text>
                <View style={s.inputContainer}>
                  <View style={s.inputIconLeft}>
                    <Feather name="mail" size={20} color={fieldErrors.email ? C.red : C.textMuted} />
                  </View>
                  <TextInput
                    style={[s.input, s.inputWithIcon, fieldErrors.email && { borderColor: C.red }]}
                    placeholder="you@example.com"
                    placeholderTextColor={C.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {fieldErrors.email && <Text style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{fieldErrors.email}</Text>}
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Password</Text>
                <View style={s.inputContainer}>
                  <View style={s.inputIconLeft}>
                    <Feather name="lock" size={16} color={fieldErrors.password ? C.red : C.textMuted} />
                  </View>
                  <TextInput
                    style={[s.input, s.inputWithIcon, { paddingRight: 48 }, fieldErrors.password && { borderColor: C.red }]}
                    placeholder={isLogin ? 'Your password' : 'Min. 8 characters'}
                    placeholderTextColor={C.textMuted}
                    value={password}
                    onChangeText={v => { setPassword(v); setFieldErrors(f => ({ ...f, password: '' })); }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity style={s.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
                {!!fieldErrors.password && (
                  <View style={s.fieldErrorRow}>
                    <Feather name="alert-circle" size={12} color={C.red} />
                    <Text style={[s.fieldErrorText, { color: C.red }]}>{fieldErrors.password}</Text>
                  </View>
                )}
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
                <TouchableOpacity style={s.forgotBtn} onPress={() => router.push('/forgot-password')}>
                  <Text style={s.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
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
                    <Text style={s.socialIcon}>f</Text>
                    <Text style={s.socialBtnText}>Facebook</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, overflow: 'hidden' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

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

  card: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 6,
  },

  title: {
    fontSize: 26, fontWeight: '800', color: C.textPrimary,
    letterSpacing: 0.2, marginBottom: 6,
  },
  subtitle: {
    fontSize: 14, color: C.textSecondary, marginBottom: 24,
  },

  form: {},

  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: C.textSecondary,
    marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase',
  },

  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIconLeft: {
    position: 'absolute', left: 16, zIndex: 1,
  },
  input: {
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.textPrimary,
    fontSize: 15,
  },
  inputWithIcon: {
    paddingLeft: 46,
  },
  eyeIcon: {
    position: 'absolute', right: 16,
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

  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20, marginTop: -8,
  },
  forgotText: {
    color: C.primary, fontSize: 13, fontWeight: '600',
  },

  btn: {
    backgroundColor: C.primary,
    borderRadius: 14,
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
    flex: 1, backgroundColor: C.socialBg,
    paddingVertical: 13, borderRadius: 12,
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
