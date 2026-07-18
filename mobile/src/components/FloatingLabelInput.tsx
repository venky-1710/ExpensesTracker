import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Animated, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

interface Props extends TextInputProps {
  label: string;
  iconName?: React.ComponentProps<typeof Feather>['name'];
  error?: string;
  isPassword?: boolean;
  isRequired?: boolean;
  prefixText?: string;
  multiline?: boolean;
}

export function FloatingLabelInput({ label, iconName, error, isPassword, isRequired, prefixText, multiline, value, ...props }: Props) {
  const { C } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation value: 0 when unfocused & empty, 1 when focused or filled
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: (isFocused || !!value) ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelTop = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -9]
  });

  const labelFontSize = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12]
  });

  const hasLeftElement = !!iconName || !!prefixText;

  const labelLeft = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [hasLeftElement ? 46 : 16, 16]
  });

  const borderColor = error ? C.red : (isFocused ? C.primary : C.inputBorder);
  const iconColor = error ? C.red : (isFocused ? C.primary : C.textMuted);
  const labelColor = error ? C.red : (isFocused ? C.primary : C.textMuted);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Animated.Text
          style={[
            styles.label,
            {
              top: labelTop,
              fontSize: labelFontSize,
              left: labelLeft,
              color: labelColor,
              backgroundColor: C.bg // hide border behind the label
            }
          ]}
          pointerEvents="none"
        >
          {label}
          {isRequired && (isFocused || !!value) && (
            <Text style={{ color: labelColor }}>*</Text>
          )}
        </Animated.Text>

        {iconName && (
          <View style={styles.iconLeft}>
            <Feather name={iconName} size={20} color={iconColor} />
          </View>
        )}

        {prefixText && !iconName && (
          <View style={styles.iconLeft}>
            <Text style={{ fontSize: 18, color: iconColor, fontWeight: '500' }}>{prefixText}</Text>
          </View>
        )}

        <TextInput
          {...props}
          multiline={multiline}
          value={value}
          style={[
            styles.input,
            hasLeftElement && styles.inputWithIcon,
            isPassword && styles.inputWithEye,
            multiline && { paddingTop: 16, textAlignVertical: 'top' },
            { borderColor, color: C.textPrimary, backgroundColor: C.bg },
            props.style
          ]}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          secureTextEntry={isPassword && !showPassword}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={{ color: C.red, fontSize: 12, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    position: 'relative',
    marginTop: 8,
  },
  label: {
    position: 'absolute',
    zIndex: 10,
    paddingHorizontal: 4,
    fontWeight: '500',
  },
  iconLeft: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  input: {
    minHeight: 56,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputWithIcon: {
    paddingLeft: 46,
  },
  inputWithEye: {
    paddingRight: 46,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    height: 56,
    justifyContent: 'center',
    zIndex: 2,
  }
});
