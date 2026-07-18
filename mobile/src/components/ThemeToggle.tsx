import React, { useRef, useEffect } from 'react';
import { Animated, PanResponder, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme, ThemeMode } from '../context/ThemeContext';

const BUTTON_SIZE = 44;
const PADDING = 16;

export default function ThemeToggle() {
  const { themeMode, setThemeMode, C } = useAppTheme();
  const { width, height } = useWindowDimensions();
  
  const initialX = width - BUTTON_SIZE - PADDING;
  const initialY = height - 120; // Default to bottom right

  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const panRef = useRef({ x: initialX, y: initialY });

  useEffect(() => {
    const listener = pan.addListener(value => {
      panRef.current = value;
    });
    return () => {
      pan.removeListener(listener);
    };
  }, [pan]);
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only become responder if the user has moved more than a small amount to allow taps
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: panRef.current.x,
          y: panRef.current.y
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [
          null,
          { dx: pan.x, dy: pan.y }
        ],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        
        const currentX = panRef.current.x;
        const currentY = panRef.current.y;
        
        const midPoint = width / 2;
        const snapX = currentX + (BUTTON_SIZE / 2) < midPoint ? PADDING : width - BUTTON_SIZE - PADDING;
        
        let snapY = currentY;
        const minY = PADDING + 40; 
        const maxY = height - BUTTON_SIZE - PADDING - 40; 
        
        if (snapY < minY) snapY = minY;
        if (snapY > maxY) snapY = maxY;

        Animated.spring(pan, {
          toValue: { x: snapX, y: snapY },
          useNativeDriver: false,
          bounciness: 6,
          speed: 12
        }).start();
      }
    })
  ).current;

  const getIconName = () => {
    if (themeMode === 'light') return 'sun';
    if (themeMode === 'dark') return 'moon';
    return 'monitor';
  };

  const handlePress = () => {
    // Cycle theme: system -> light -> dark -> system
    if (themeMode === 'system') setThemeMode('light');
    else if (themeMode === 'light') setThemeMode('dark');
    else setThemeMode('system');
  };

  return (
    <Animated.View
      style={[
        s.draggableContainer,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }]
        }
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={[s.iconButton, { backgroundColor: C.inputBg, borderColor: C.border }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Feather name={getIconName()} size={20} color={C.textPrimary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  draggableContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  iconButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
