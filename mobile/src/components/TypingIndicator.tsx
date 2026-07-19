import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image } from 'react-native';

const webotLogo = require('../../assets/images/webot_logo.jpg');

interface ThemeColors {
  primary: string;
  card: string;
  border: string;
}

interface TypingIndicatorProps {
  C: ThemeColors;
  style?: any;
}

export const TypingIndicator = ({ C, style }: TypingIndicatorProps) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 150);
    const a3 = anim(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={[styles.msgWrapper, style]}>
      <Image source={webotLogo} style={styles.botAvatar} resizeMode="cover" />
      <View style={[styles.bubble, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View key={i} style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: C.primary, transform: [{ translateY: d }]
            }} />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  msgWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
    justifyContent: 'flex-start'
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1
  },
  botAvatar: { width: 30, height: 30, borderRadius: 15, marginBottom: 14, marginRight: 8 }
});
