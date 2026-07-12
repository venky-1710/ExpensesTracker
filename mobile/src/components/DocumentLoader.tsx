import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { ThemeColors } from '../context/ThemeContext';

const steps = [
  'Uploading your file...',
  'Scanning the document...',
  'Extracting work logs...',
  'Analyzing the timesheets...',
  'Assigning work codes...',
  'Almost done...',
];

export const DocumentLoader = ({ C }: { C: ThemeColors }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;
  
  const ring1Scale = useRef(new Animated.Value(0.8)).current;
  const ring1Opacity = useRef(new Animated.Value(0.8)).current;
  
  const ring2Scale = useRef(new Animated.Value(0.8)).current;
  const ring2Opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Text Fade Sequence
    const textInterval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setStepIndex((prev) => (prev + 1) % steps.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 1800);

    // Logo Pulse (1.6s loop)
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoPulse, { toValue: 0.93, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoOpacity, { toValue: 0.65, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(logoPulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(logoOpacity, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ])
    ).start();

    // Ring 1 Loop (1.8s)
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ring1Scale, { toValue: 1.4, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(ring1Opacity, { toValue: 0, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true })
        ]),
        Animated.timing(ring1Scale, { toValue: 0.8, duration: 0, useNativeDriver: true }),
        Animated.timing(ring1Opacity, { toValue: 0.8, duration: 0, useNativeDriver: true })
      ])
    ).start();

    // Ring 2 Loop (1.8s with delay)
    const ring2Timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ring2Scale, { toValue: 1.4, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(ring2Opacity, { toValue: 0, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true })
          ]),
          Animated.timing(ring2Scale, { toValue: 0.8, duration: 0, useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0.8, duration: 0, useNativeDriver: true })
        ])
      ).start();
    }, 500);

    return () => {
      clearInterval(textInterval);
      clearTimeout(ring2Timeout);
    };
  }, []);

  return (
    <View style={[StyleSheet.absoluteFillObject, s.overlay]}>
      <View style={s.loaderBox}>
        
        <View style={s.iconWrap}>
          <Animated.View style={[s.ring, s.ring1, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity, borderColor: 'rgba(108, 63, 209, 0.5)' }]} />
          <Animated.View style={[s.ring, s.ring2, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity, borderColor: 'rgba(108, 63, 209, 0.25)' }]} />
          <Animated.Image 
            source={require('../../assets/images/webot_logo.jpg')}
            style={[s.logo, { transform: [{ scale: logoPulse }], opacity: logoOpacity }]}
          />
        </View>

        <Animated.Text style={[s.loaderText, { color: C.primary, opacity: fadeAnim }]}>
          {steps[stepIndex]}
        </Animated.Text>

      </View>
    </View>
  );
};

const s = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 280,
    gap: 18,
  },
  iconWrap: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 14,
    zIndex: 2,
  },
  ring: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 2,
  },
  ring1: {
    width: 80,
    height: 80,
  },
  ring2: {
    width: 100,
    height: 100,
  },
  loaderText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  }
});
