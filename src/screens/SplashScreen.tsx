import React from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ActivityIndicator size="large" color="#7514C5" accessibilityLabel="Cargando aplicación" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
