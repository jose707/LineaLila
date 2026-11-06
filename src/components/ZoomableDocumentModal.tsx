import React, { useRef, useState } from 'react';
import {
  Animated,
  ImageURISource,
  Modal,
  PanResponder,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Minus, Plus, X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  source?: ImageURISource;
  title: string;
  onClose: () => void;
}

const limit = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (touches: Array<{ pageX: number; pageY: number }>) =>
  Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);

export default function ZoomableDocumentModal({ visible, source, title, onClose }: Props) {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const xValue = useRef(new Animated.Value(0)).current;
  const yValue = useRef(new Animated.Value(0)).current;
  const scale = useRef(1);
  const offset = useRef({ x: 0, y: 0 });
  const viewport = useRef({ width: 1, height: 1 });
  const gesture = useRef({ count: 0, distance: 0, baseScale: 1, x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const setPosition = (nextX: number, nextY: number, nextScale = scale.current) => {
    const maxX = viewport.current.width * (nextScale - 1) / 2;
    const maxY = viewport.current.height * (nextScale - 1) / 2;
    offset.current = { x: limit(nextX, -maxX, maxX), y: limit(nextY, -maxY, maxY) };
    xValue.setValue(offset.current.x);
    yValue.setValue(offset.current.y);
  };

  const setScale = (next: number) => {
    scale.current = limit(next, 1, 5);
    scaleValue.setValue(scale.current);
    setZoom(scale.current);
    setPosition(offset.current.x, offset.current.y);
  };

  const reset = () => {
    setScale(1);
    setPosition(0, 0);
  };

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (event) => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        const nextDistance = distance(touches);
        if (gesture.current.count !== 2) {
          gesture.current = { count: 2, distance: nextDistance, baseScale: scale.current, x: 0, y: 0 };
        } else if (gesture.current.distance > 0) {
          setScale(gesture.current.baseScale * nextDistance / gesture.current.distance);
        }
      } else if (touches.length === 1) {
        const { pageX, pageY } = touches[0];
        if (gesture.current.count === 1 && scale.current > 1) {
          setPosition(offset.current.x + pageX - gesture.current.x, offset.current.y + pageY - gesture.current.y);
        }
        gesture.current = { ...gesture.current, count: 1, x: pageX, y: pageY };
      }
    },
    onPanResponderRelease: () => { gesture.current.count = 0; },
    onPanResponderTerminate: () => { gesture.current.count = 0; },
  })).current;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} onShow={reset} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <View style={styles.container}>
        <View style={styles.canvas} onLayout={(event) => { viewport.current = event.nativeEvent.layout; }} {...responder.panHandlers}>
          {source && <Animated.Image
            source={source}
            resizeMode="contain"
            style={[styles.image, { transform: [{ translateX: xValue }, { translateY: yValue }, { scale: scaleValue }] }]}
          />}
        </View>
        <View style={styles.header} pointerEvents="box-none">
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <TouchableOpacity style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar imagen">
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.control} onPress={() => setScale(scale.current - 0.5)} accessibilityRole="button" accessibilityLabel="Alejar imagen">
            <Minus size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.reset} onPress={reset} accessibilityRole="button" accessibilityLabel="Restablecer zoom">
            <Text style={styles.zoomText}>{Math.round(zoom * 100)} %</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.control} onPress={() => setScale(scale.current + 0.5)} accessibilityRole="button" accessibilityLabel="Ampliar imagen">
            <Plus size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  canvas: { flex: 1, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  header: { position: 'absolute', top: 36, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  controls: { position: 'absolute', bottom: 36, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10 },
  control: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  reset: { minWidth: 72, height: 48, borderRadius: 16, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  zoomText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
