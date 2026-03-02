// src/screens/SplashScreen.tsx
import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
} from "react-native";
import { useAuth } from "../hooks/useAuth";
import { COLORS } from "../theme/colors";

export default function SplashScreen() {
  const { isLoading } = useAuth();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ ...styles.content, opacity: fadeAnim }}>
        {/* Logo placeholder */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <View style={styles.logoBgPurple} />
          </View>
        </View>

        {/* App name */}
        <View style={styles.titleContainer}>
          <View style={styles.titlePurple}>
            <View style={styles.titlePinkLeft} />
            <View style={styles.titlePinkRight} />
          </View>
        </View>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <View style={styles.tagline} />
        </View>

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}
      </Animated.View>

      {/* Bottom text */}
      <View style={styles.footer}>
        <View style={styles.footerText} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    marginBottom: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoBgPurple: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.secondary,
  },
  titleContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  titlePurple: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  titlePinkLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    marginRight: 8,
  },
  titlePinkRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    marginLeft: 8,
  },
  taglineContainer: {
    marginBottom: 50,
    alignItems: "center",
  },
  tagline: {
    width: 150,
    height: 20,
    backgroundColor: "#E5E5E5",
    borderRadius: 10,
  },
  loaderContainer: {
    marginTop: 40,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
  },
  footerText: {
    width: 200,
    height: 16,
    backgroundColor: "#E5E5E5",
    borderRadius: 8,
  },
});

