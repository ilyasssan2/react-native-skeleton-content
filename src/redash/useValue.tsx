import { useRef } from 'react';
import { Value } from 'react-native-reanimated';

type Atomic = string | number | boolean;

export function useConst<T>(initialValue: T | (() => T)): T {
  const ref = useRef<{ value: T }>();
  if (ref.current === undefined) {
    // Box the value in an object so we can tell if it's initialized even if the initializer
    // returns/is undefined
    ref.current = {
      value:
        typeof initialValue === 'function'
          ? // eslint-disable-next-line @typescript-eslint/ban-types
            (initialValue as Function)()
          : initialValue,
    };
  }
  return ref.current.value;
}

export const useValue = <V extends Atomic>(value: V) =>
  useConst(() => new Value(value));
