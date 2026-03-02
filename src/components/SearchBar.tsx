import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";

export interface SearchResult {
  address: string;
  display_name: string;
  lat: string;
  lon: string;
}

interface SearchBarProps {
  onResultSelect: (result: SearchResult) => void;
  placeholder: string;
  currentLat?: number; // Latitud actual del usuario
  currentLon?: number; // Longitud actual del usuario
}

const LOCATIONIQ_API_KEY = "pk.2c35bb8a74b61271c3e0f669fb81718d";
const LOCATIONIQ_BASE_URL = "https://us1.locationiq.com/v1";

const SearchBar: React.FC<SearchBarProps> = ({
  onResultSelect,
  placeholder,
  currentLat,
  currentLon,
}) => {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (searchText.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(() => {
      searchLocations(searchText);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  const searchLocations = async (query: string) => {
    try {
      setLoading(true);
      // Limites precisos de La Paz
      const north = -16.29;
      const south = -16.63;
      const east = -68.06;
      const west = -68.24;
      const boundingBox = `viewbox=${west},${south},${east},${north}`;

      const response = await fetch(
        `${LOCATIONIQ_BASE_URL}/search?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(
          query
        )}&${boundingBox}&format=json&limit=20&countrycodes=bo&bounded=1`
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();

      const calculateDistance = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
      ): number => {
        const R = 6371; // km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      const formattedResults: SearchResult[] = data
        .map((item: any) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          // distancia desde la ubicación actual si está disponible
          const distance =
            currentLat && currentLon
              ? calculateDistance(currentLat, currentLon, lat, lon)
              : Infinity;
          return {
            address: item.display_name,
            display_name: item.display_name,
            lat: item.lat,
            lon: item.lon,
            distance,
          } as SearchResult & { distance: number };
        })
        // Filtrar resultados estrictamente dentro de La Paz
        .filter((item: SearchResult & { distance: number }) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          return lat >= south && lat <= north && lon >= west && lon <= east;
        })
        // Ordenar por cercanía
        .sort(
          (
            a: SearchResult & { distance: number },
            b: SearchResult & { distance: number }
          ) => a.distance - b.distance
        )
        // eliminar la propiedad distance
        .map(
          ({ distance, ...rest }: SearchResult & { distance: number }) =>
            rest as SearchResult
        );

      setResults(formattedResults);
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    onResultSelect(result);
    setSearchText("");
    setShowResults(false);
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => {
            if (searchText.length >= 2) {
              setShowResults(true);
            }
          }}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearchText("");
              setResults([]);
              setShowResults(false);
            }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && showResults && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#7C3AED" />
        </View>
      )}

      {showResults && results.length > 0 && (
        <FlatList
          data={results}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handleResultSelect(item)}
            >
              <Text style={styles.resultIcon}>📍</Text>
              <View style={styles.resultTextContainer}>
                <Text style={styles.resultAddress} numberOfLines={2}>
                  {item.address}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item, index) => `${item.lat}-${item.lon}-${index}`}
          scrollEnabled={false}
          style={styles.resultsList}
        />
      )}

      {showResults &&
        searchText.length >= 2 &&
        results.length === 0 &&
        !loading && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>
              No se encontraron resultados
            </Text>
          </View>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#2D2D2D",
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: "#999",
  },
  loadingContainer: {
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsList: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  resultIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultAddress: {
    fontSize: 13,
    color: "#2D2D2D",
    fontWeight: "500",
    lineHeight: 18,
  },
  noResultsContainer: {
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    marginTop: 8,
  },
  noResultsText: {
    fontSize: 13,
    color: "#999",
  },
});

export default SearchBar;
