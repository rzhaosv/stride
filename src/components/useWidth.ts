import { useCallback, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';

/** Measure a container so SVGs can fill it. */
export function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width)), []);
  return [w, onLayout];
}
