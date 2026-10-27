import React, { useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  message: string;
  visible: boolean;
  duration?: number;
  backgroundColor?: string;
  position?: 'top' | 'bottom';
  icon?: string;
  iconCircle?: boolean;
  fontSize?: number;
  fontWeight?: '500' | '700';
  verticalPadding?: number;
  horizontalInset?: number;
  minHeight?: number;
  borderRadius?: number;
  textAlign?: 'left' | 'center' | 'right';
  onHide?: () => void;
}

const Toast: React.FC<Props> = ({
  message,
  visible,
  duration = 4500,
  backgroundColor = '#000000',
  position = 'bottom',
  icon = '✓',
  iconCircle = true,
  fontSize = 15,
  fontWeight = '500',
  verticalPadding = 8,
  horizontalInset = 16,
  minHeight,
  borderRadius = 10,
  textAlign = 'left',
  onHide,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onHide?.());
    }, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        s.container,
        { backgroundColor, opacity, paddingVertical: verticalPadding, left: horizontalInset, right: horizontalInset, minHeight, borderRadius },
        position === 'top'
          ? { top: 15 + insets.top }
          : { bottom: 15 + insets.bottom },
      ]}
      pointerEvents="none"
    >
      {!!icon && (iconCircle ? (
        <View style={s.iconCircle}>
          <Text style={s.iconCircleText}>{icon}</Text>
        </View>
      ) : (
        <Text style={[s.icon, { fontSize: fontSize + 2 }]}>{icon}</Text>
      ))}
      <Text style={[s.text, { fontSize, fontWeight, textAlign }, textAlign === 'right' && s.rightAlignedText]}>{message}</Text>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 999,
  },
  icon: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    marginRight: 6,
  },
  iconCircle: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  iconCircleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  text: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  rightAlignedText: { flex: 1 },
});

export default Toast;
