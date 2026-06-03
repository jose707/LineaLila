import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronRight, Star, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface SlideUpMenuItem {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

interface SlideUpMenuTheme {
  primary: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
  bg: string;
  white: string;
  overlay: string;
  avatarBg: string;
}

interface SlideUpMenuProps {
  visible: boolean;
  onClose: () => void;
  user?: {
    name?: string;
    profilePhoto?: string | null;
    rating?: number | string | null;
  } | null;
  menuItems: SlideUpMenuItem[];
  closeButton?: {
    label: string;
    onPress: () => void;
    backgroundColor?: string;
    textColor?: string;
  };
  theme?: Partial<SlideUpMenuTheme>;
}

const DEFAULT_THEME: SlideUpMenuTheme = {
  primary: '#7514C5',
  accent: '#7514C5',
  text: '#111111',
  textMuted: '#888888',
  border: '#F0F0F0',
  bg: '#FAFAFA',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
  avatarBg: '#F3E8FF',
};

export const SlideUpMenu: React.FC<SlideUpMenuProps> = ({
  visible,
  onClose,
  user,
  menuItems,
  closeButton,
  theme = {},
}) => {
  const insets = useSafeAreaInsets();
  const T = { ...DEFAULT_THEME, ...theme };
  const menuAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(menuAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [visible, menuAnim]);

  if (!visible) return null;

  const parsedRating =
    typeof user?.rating === 'number' ? user.rating : Number(user?.rating);
  const safeRating = Number.isFinite(parsedRating) ? parsedRating : 5;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.backdrop, { backgroundColor: T.overlay }]}
        activeOpacity={1}
        onPress={onClose}
      />

      <Animated.View
        style={[
          styles.menuSheet,
          {
            backgroundColor: T.white,
            paddingBottom: insets.bottom + 20,
            transform: [
              {
                translateY: menuAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [400, 0],
                }),
              },
            ],
            opacity: menuAnim,
          },
        ]}
      >
        <View style={[styles.menuHandle, { backgroundColor: T.border }]} />

        <View style={styles.menuUser}>
          <View style={[styles.menuAvatar, { backgroundColor: T.avatarBg }]}>
            {user?.profilePhoto || (user as any)?.photoURL ? (
              <Image
                source={{ uri: user.profilePhoto || (user as any).photoURL }}
                style={{ width: 50, height: 50, borderRadius: 25 }}
              />
            ) : (
              <User size={24} color={T.accent} />
            )}
          </View>
          <View>
            <Text style={[styles.menuUserName, { color: T.text }]}>
              {user?.name || 'Usuario'}
            </Text>
            <View style={styles.menuRatingRow}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={[styles.menuRatingText, { color: T.textMuted }]}>
                {safeRating.toFixed(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.menuSep, { backgroundColor: T.border }]} />

        {menuItems.map(item => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, { borderBottomColor: T.border }]}
            onPress={() => {
              onClose();
              item.onPress();
            }}
            activeOpacity={0.7}
          >
            {item.icon}
            <Text style={[styles.menuItemLabel, { color: T.text }]}>
              {item.label}
            </Text>
            <ChevronRight size={16} color={T.border} />
          </TouchableOpacity>
        ))}

        {closeButton && (
          <TouchableOpacity
            style={[
              styles.menuClose,
              { backgroundColor: closeButton.backgroundColor || T.primary },
            ]}
            onPress={() => {
              onClose();
              closeButton.onPress();
            }}
          >
            <Text
              style={[
                styles.menuCloseText,
                { color: closeButton.textColor || T.white },
              ]}
            >
              {closeButton.label}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  menuUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  menuAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  menuRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuRatingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  menuSep: {
    height: 1,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  menuClose: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  menuCloseText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export { SlideUpMenu };
export default SlideUpMenu;
