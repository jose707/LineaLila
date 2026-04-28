import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import SplashImage from '../../assets/splash.png';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../theme/colors';

export default function SplashScreen() {
  const { isLoading } = useAuth();

  const fade = useRef(new Animated.Value(0)).current;
  const move = useRef(new Animated.Value(30)).current;

  // Detectar si es tablet
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768; // iPad y tablets tienen ancho >= 768
  const resizeMode = isTablet ? 'contain' : 'cover';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(move, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.fullScreen}>
      <Image
        source={SplashImage}
        style={styles.fullImage}
        resizeMode={resizeMode}
      />
      <Animated.View
        style={{
          opacity: fade,
          position: 'absolute',
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  logo: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },

  subtitle: {
    marginTop: 10,
    color: '#EEE',
    fontSize: 18,
    marginBottom: 60,
  },

  road: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    borderStyle: 'dashed',
    justifyContent: 'flex-end',
    alignItems: 'center',
    transform: [{ rotate: '25deg' }],
  },

  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF',
    marginBottom: -12,
  },

  loading: {
    marginTop: 50,
    color: '#FFF',
    opacity: 0.8,
  },
  fullImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
