import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppTheme, ThemeColors } from '../../context/ThemeContext';

// Theme is loaded dynamically from ThemeContext

export default function LoginScreen() {
  const { C } = useAppTheme();
  const s = getStyles(C);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, signup, googleLogin } = useAuth();

  // Google Auth is disabled for Expo Go compatibility
  // React.useEffect(() => {
  //   GoogleSignin.configure({ ... });
  // }, []);

  const handleGoogleLogin = async () => {
    // setGoogleLoading(true);
    // try {
    //   await GoogleSignin.hasPlayServices();
    //   const userInfo = await GoogleSignin.signIn();
    //   ...
    // } catch (error) {
    //   console.error(error);
    // } finally {
    //   setGoogleLoading(false);
    // }
    console.warn("Google Login is disabled in Expo Go");
  };

  const handleSubmit = async () => {
    if (!email || !password) return;
    if (!isLogin && !name) return;
    setSubmitting(true);
    try {
      if (isLogin) {
        const ok = await login(email, password);
        if (ok) router.replace('/(main)/dashboard');
      } else {
        const ok = await signup({ email, password, full_name: name });
        if (ok) setIsLogin(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          
          <Text style={s.title}>{isLogin ? 'SIGN IN' : 'SIGN UP'}</Text>
          <Text style={s.subtitle}>
            {isLogin ? 'Sign in with email address & password' : 'Sign up with email address & password'}
          </Text>

          <View style={s.form}>
            {!isLogin && (
              <View style={s.inputContainer}>
                <TextInput
                  style={s.input}
                  placeholder="Username"
                  placeholderTextColor={C.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}
            
            <View style={s.inputContainer}>
              <TextInput
                style={s.input}
                placeholder="Yourname@gmail.com"
                placeholderTextColor={C.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <View style={s.inputContainer}>
              <TextInput
                style={[s.input, { paddingRight: 45 }]}
                placeholder={isLogin ? "Password" : "Password (min 8 characters)"}
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={s.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {isLogin && (
              <TouchableOpacity style={s.forgotBtn} onPress={() => router.push('/forgot-password')}>
                <Text style={s.forgotText}>Forget password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[s.btn, submitting && { opacity: 0.6 }, !isLogin && { marginTop: 12 }]} onPress={handleSubmit} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnText}>{isLogin ? 'Sign in' : 'Sign up'}</Text>
              }
            </TouchableOpacity>

            <Text style={s.orText}>Or continue with</Text>

            <View style={s.socialRow}>
              <TouchableOpacity style={s.socialBtn} onPress={handleGoogleLogin} disabled={googleLoading}>
                {googleLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.socialBtnText}>Google</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.socialBtn}>
                <Text style={s.socialBtnText}>Facebook</Text>
              </TouchableOpacity>
            </View>

            <View style={s.switchRow}>
              <Text style={s.switchText}>
                {isLogin ? 'New here? ' : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                <Text style={s.switchLink}>{isLogin ? 'Sign up' : 'Sign in'}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60 },
  
  title: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: '#fff', 
    letterSpacing: 4,
    marginBottom: 20,
    textShadowColor: 'rgba(155, 81, 224, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: { 
    fontSize: 14, 
    color: C.textSecondary, 
    marginBottom: 32 
  },
  
  form: { flex: 1 },
  
  inputContainer: {
    marginBottom: 20,
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.inputBorder,
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: C.textPrimary,
    fontSize: 15,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
  },
  
  forgotBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  forgotText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  
  btn: {
    backgroundColor: '#8b5cf6', // A vibrant purple/indigo color that matches the screenshot
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  
  orText: {
    color: C.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },
  
  socialRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  socialBtn: {
    flex: 1,
    backgroundColor: C.socialBg,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  socialBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    color: C.textMuted,
    fontSize: 14,
  },
  switchLink: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});
