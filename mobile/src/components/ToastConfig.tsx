import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

type ToastType = 'success' | 'error' | 'info' | 'warning';

const TYPE_META: Record<ToastType, { icon: string; color: string }> = {
  success: { icon: 'check-circle', color: '#10b981' },
  error:   { icon: 'x-circle',     color: '#ef4444' },
  info:    { icon: 'info',          color: '#6d4aff' },
  warning: { icon: 'alert-triangle',color: '#f59e0b' },
};

interface ToastProps {
  text1?: string;
  text2?: string;
  type?: ToastType;
}

function ToastItem({ text1, text2, type = 'info' }: ToastProps) {
  const { C, isDark } = useAppTheme();
  const meta = TYPE_META[type] ?? TYPE_META.info;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: C.card,
          borderColor: meta.color + '35',
          shadowColor: meta.color,
        },
      ]}
    >
      {/* Left accent bar */}
      <View style={[styles.accent, { backgroundColor: meta.color }]} />

      {/* Icon */}
      <View style={[styles.iconBox, { backgroundColor: meta.color + '18' }]}>
        <Feather name={meta.icon as any} size={19} color={meta.color} />
      </View>

      {/* Text */}
      <View style={styles.body}>
        {text1 ? (
          <Text style={[styles.title, { color: C.textPrimary }]} numberOfLines={1}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.subtitle, { color: C.textMuted }]} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 58,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 10,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 17,
  },
});

export const toastConfig = {
  success: (props: any) => <ToastItem {...props} type="success" />,
  error:   (props: any) => <ToastItem {...props} type="error"   />,
  info:    (props: any) => <ToastItem {...props} type="info"    />,
  warning: (props: any) => <ToastItem {...props} type="warning" />,
};
