import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions, Text } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import * as SplashScreen from 'expo-splash-screen';

const webotLogo = require('../../assets/images/webot_logo_transparent.png');
const { width, height } = Dimensions.get('window');

const Bubbles = () => {
  const { C } = useAppTheme();
  // Generate more, smaller bubbles for a better effect
  const bubbles = useRef(Array.from({ length: 15 }).map(() => ({
    size: 15 + Math.random() * 35, // Smaller bubbles (15px to 50px)
    left: Math.random() * width,
    animY: new Animated.Value(0),
    duration: 1500 + Math.random() * 2500, // Speed for upwards flow
    delay: Math.random() * 1000,
  }))).current;

  useEffect(() => {
    bubbles.forEach(b => {
      // Delay initial start randomly so they don't all appear at once
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(b.animY, {
              toValue: -(height + 200), // Flow continuously upwards off-screen
              duration: b.duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            // Instantly reset to the bottom to loop smoothly
            Animated.timing(b.animY, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            })
          ])
        ).start();
      }, b.delay);
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Background glow orbs matching login page */}
      <View style={styles.glowTopLeft} />
      <View style={styles.glowBottomRight} />

      {bubbles.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: b.size,
            height: b.size,
            borderRadius: b.size / 2,
            backgroundColor: C.primary,
            opacity: 0.15,
            left: b.left,
            bottom: -100, // Start well below the screen so they appear smoothly
            transform: [{ translateY: b.animY }]
          }}
        />
      ))}
    </View>
  );
};

interface Props {
  onAnimationComplete: () => void;
}

export function AnimatedSplashScreen({ onAnimationComplete }: Props) {
  const { C } = useAppTheme();
  
  // Animation values
  const dotScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(0)).current;

  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide the native splash screen immediately
    SplashScreen.hideAsync().catch(() => {});

    // Animation sequence
    Animated.sequence([
      // 1. Primary Dot and Logo pop in
      Animated.parallel([
        Animated.spring(dotScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          delay: 100,
          useNativeDriver: true,
        }),
      ]),
      // 2. Quick pause
      Animated.delay(100),
      // 3. Dynamic drop: Text comes down below the circle
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 90, // Drops elegantly below the logo
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      // 4. Hold for impact
      Animated.delay(1000),
      // 5. Massive expansion of the dot to cover the screen!
      Animated.parallel([
        Animated.timing(dotScale, {
          toValue: 60, // Enormous scale to engulf the screen
          duration: 600,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        // Fade out the logo and text as the dot expands
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // 6. The screen is now solid primary color. Fade out to reveal the app!
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationComplete();
    });
  }, []);

  return (
    <Animated.View style={[
      styles.container, 
      { 
        backgroundColor: C.bg,
        opacity: containerOpacity,
      }
    ]} pointerEvents="none">
      
      <Bubbles />
      
      {/* The expanding dot backdrop */}
      <Animated.View style={[
        styles.expandingDot,
        {
          backgroundColor: C.primary,
          transform: [{ scale: dotScale }]
        }
      ]} />

      <View style={styles.centerWrap}>
        <Animated.Image 
          source={webotLogo} 
          style={[
            styles.logo, 
            { opacity: logoOpacity }
          ]} 
          resizeMode="cover"
        />
        
        <Animated.Text style={[
          styles.brandText,
          { color: C.textPrimary }, // Adapt to light/dark theme background perfectly!
          { 
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }]
          }
        ]}>
          EXPENSE TRACKER
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999, // Ensure it's on top of absolutely everything
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  expandingDot: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: 'absolute',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    position: 'absolute',
  },
  brandText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    letterSpacing: 4,
    position: 'absolute',
    width: 300,
    textAlign: 'center',
  }
});
