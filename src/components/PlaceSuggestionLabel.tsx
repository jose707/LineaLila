import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PlaceSuggestion } from '../services/places.service';

export default function PlaceSuggestionLabel({
  suggestion,
}: {
  suggestion: PlaceSuggestion;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.primary} numberOfLines={2}>
        {suggestion.mainText || suggestion.address}
      </Text>
      {!!suggestion.secondaryText && (
        <Text style={styles.secondary} numberOfLines={2}>
          {suggestion.secondaryText}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  primary: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 21,
  },
  secondary: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 1.5,
  },
});
