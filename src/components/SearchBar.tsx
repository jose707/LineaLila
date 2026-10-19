import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { X, MapPin } from 'lucide-react-native';
import PlaceSuggestionLabel from './PlaceSuggestionLabel';

import {
  placesService,
  newPlacesSession,
  PlaceSuggestion,
  PlaceResult,
} from '../services/places.service';
export type SearchResult = PlaceResult;

interface SearchBarProps {
  onResultSelect: (result: SearchResult) => void;
  placeholder: string;
  currentLat?: number;
  currentLon?: number;
  leftIcon?: React.ReactNode;
  onLeftIconPress?: () => void;
  autoFocus?: boolean;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  onSuffixIconPress?: () => void;
  initialValue?: string;
  onClear?: () => void;
  onResultsChange?: (
    results: PlaceSuggestion[],
    loading: boolean,
    error: string,
    empty: boolean,
  ) => void;
  onFocusChange?: (focused: boolean) => void;
  hideResults?: boolean;
}

export interface SearchBarRef {
  focus: () => void;
  select: (suggestion: PlaceSuggestion) => Promise<void>;
}

const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(
  (
    {
      onResultSelect,
      placeholder,
      currentLat,
      currentLon,
      leftIcon,
      onLeftIconPress,
      autoFocus,
      prefixIcon,
      suffixIcon,
      onSuffixIconPress,
      initialValue,
      onClear,
      onResultsChange,
      onFocusChange,
      hideResults,
    },
    ref,
  ) => {
    const [searchText, setSearchText] = useState(initialValue || '');
    const [results, setResults] = useState<PlaceSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [selecting, setSelecting] = useState(false);
    const selectingRef = useRef(false);
    const sessionRef = useRef('');
    if (!sessionRef.current) sessionRef.current = newPlacesSession();
    const revisionRef = useRef(0);
    const mountedRef = useRef(true);
    const selectedCallback = useRef(onResultSelect);
    selectedCallback.current = onResultSelect;
    const inputRef = useRef<TextInput>(null);
    const skipSearchRef = useRef(!!initialValue);
    const selectedTextRef = useRef(initialValue || '');
    const onResultsChangeRef = useRef(onResultsChange);
    onResultsChangeRef.current = onResultsChange;
    const onFocusChangeRef = useRef(onFocusChange);
    onFocusChangeRef.current = onFocusChange;

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

    useEffect(() => {
      selectedTextRef.current = initialValue || '';
      revisionRef.current++;
      setSearchText(initialValue || '');
      setResults([]);
      setShowResults(false);
      setLoading(false);
      setErrorMessage('');
    }, [initialValue]);

    useEffect(() => {
      let cancelled = false;
      if (selectingRef.current) return;
      const version = ++revisionRef.current;
      if (skipSearchRef.current || selectedTextRef.current === searchText) {
        skipSearchRef.current = false;
        return;
      }
      setErrorMessage('');
      setResults([]);
      if (searchText.trim().length < 2) {
        setLoading(false);
        setShowResults(false);
        return;
      }
      setLoading(true);
      setShowResults(true);
      const timer = setTimeout(async () => {
        try {
          const suggestions = await placesService.autocomplete(
            searchText,
            sessionRef.current,
            currentLat,
            currentLon,
          );
          if (!cancelled && version === revisionRef.current)
            setResults(suggestions);
        } catch (error: any) {
          if (!cancelled && version === revisionRef.current)
            setErrorMessage(
              error?.data?.error ||
                'No se pudo buscar. Revisa tu conexión e intenta nuevamente.',
            );
        } finally {
          if (!cancelled && version === revisionRef.current) setLoading(false);
        }
      }, 400);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [searchText, currentLat, currentLon]);

    useEffect(() => {
      if (hideResults && isFocused) {
        onResultsChangeRef.current?.(
          showResults ? results : [],
          loading || selecting,
          errorMessage,
          showResults &&
            !loading &&
            !selecting &&
            !errorMessage &&
            results.length === 0,
        );
      }
    }, [
      results,
      loading,
      selecting,
      showResults,
      hideResults,
      isFocused,
      errorMessage,
    ]);

    const handleResultSelect = useCallback(
      async (suggestion: PlaceSuggestion) => {
        if (
          selectingRef.current ||
          suggestion.sessionToken !== sessionRef.current
        )
          return;
        selectingRef.current = true;
        const version = ++revisionRef.current;
        setSelecting(true);
        setLoading(false);
        setErrorMessage('');
        try {
          const result = await placesService.details(suggestion);
          if (!mountedRef.current || version !== revisionRef.current) return;
          skipSearchRef.current = true;
          selectedTextRef.current = result.display_name;
          setSearchText(result.display_name);
          setResults([]);
          setShowResults(false);
          sessionRef.current = newPlacesSession();
          selectedCallback.current(result);
        } catch (error: any) {
          if (mountedRef.current && version === revisionRef.current)
            setErrorMessage(
              error?.data?.error ||
                'No se pudo obtener el lugar. Intenta seleccionarlo nuevamente.',
            );
        } finally {
          selectingRef.current = false;
          if (mountedRef.current) setSelecting(false);
        }
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        select: handleResultSelect,
      }),
      [handleResultSelect],
    );

    return (
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          {prefixIcon && <View style={styles.prefixIcon}>{prefixIcon}</View>}
          {leftIcon && isFocused && (
            <TouchableOpacity
              onPress={onLeftIconPress}
              style={styles.leftIconBtn}
              activeOpacity={0.7}
            >
              {leftIcon}
            </TouchableOpacity>
          )}
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#999"
            value={searchText}
            editable={!selecting}
            maxLength={200}
            onChangeText={text => {
              revisionRef.current++;
              selectedTextRef.current = '';
              skipSearchRef.current = false;
              setSearchText(text);
            }}
            autoFocus={autoFocus}
            onFocus={() => {
              setIsFocused(true);
              onFocusChangeRef.current?.(true);
              if (searchText.length >= 2 && selectedTextRef.current !== searchText) {
                setShowResults(true);
              }
            }}
            onBlur={() => {
              setIsFocused(false);
              onFocusChangeRef.current?.(false);
            }}
          />
          {isFocused && searchText.length > 0 && (
            <TouchableOpacity
              disabled={selecting}
              style={styles.clearButton}
              onPress={() => {
                revisionRef.current++;
                sessionRef.current = newPlacesSession();
                setErrorMessage('');
                setLoading(false);
                setSearchText('');
                setResults([]);
                setShowResults(false);
                onClear?.();
              }}
            >
              <X size={10} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          )}
          {isFocused && suffixIcon && onSuffixIconPress ? (
            <TouchableOpacity
              style={styles.suffixIconBtn}
              onPress={onSuffixIconPress}
              activeOpacity={0.7}
            >
              {suffixIcon}
            </TouchableOpacity>
          ) : isFocused && suffixIcon ? (
            <View style={styles.suffixIcon}>{suffixIcon}</View>
          ) : null}
        </View>

        {!hideResults && !!errorMessage && (
          <Text accessibilityRole="alert" style={styles.error}>
            {errorMessage}
          </Text>
        )}
        {!hideResults && (
          <>
            {(loading || selecting) && showResults && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#7C3AED" />
              </View>
            )}

            {showResults && results.length > 0 && (
              <FlatList
                data={results}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    disabled={selecting || loading}
                    style={styles.resultItem}
                    onPress={() => handleResultSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.resultIconContainer}>
                      <MapPin
                        size={22}
                        color="#7C3AED"
                        strokeWidth={2.2}
                      />
                    </View>
                    <PlaceSuggestionLabel suggestion={item} />
                  </TouchableOpacity>
                )}
                keyExtractor={item => item.placeId}
                ListFooterComponent={
                  <Text style={styles.attribution}>Google Maps</Text>
                }
                scrollEnabled={false}
                style={styles.resultsList}
              />
            )}

            {showResults &&
              searchText.length >= 2 &&
              results.length === 0 &&
              !loading &&
              !selecting &&
              !errorMessage && (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    No se encontraron resultados en La Paz
                  </Text>
                </View>
              )}
          </>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  attribution: {
    fontSize: 12,
    fontWeight: '400',
    color: '#5E5E5E',
    padding: 12,
    textAlign: 'right',
  },
  error: { color: '#B91C1C', padding: 12, fontSize: 14 },
  container: {
    marginVertical: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  leftIconBtn: {
    marginRight: 8,
  },
  prefixIcon: {
    marginRight: 8,
  },
  suffixIcon: {
    marginLeft: 8,
  },
  suffixIconBtn: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    minHeight: 48,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  loadingContainer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  noResultsContainer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginTop: 8,
  },
  noResultsText: {
    fontSize: 13,
    color: '#999',
  },
});

export default SearchBar;
