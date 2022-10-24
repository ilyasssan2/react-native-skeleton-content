import Animated, {
  interpolateNode,
  Extrapolate,
} from 'react-native-reanimated';
import { processColor } from 'react-native';

const {
  add,
  multiply,
  abs,
  round,
  sub,
  proc,
  color,
  min: min2,
  max: max2,
  floor,
} = Animated;

const mix = proc(
  (
    value: Animated.Adaptable<number>,
    x: Animated.Adaptable<number>,
    y: Animated.Adaptable<number>
  ) => add(x, multiply(value, sub(y, x)))
);

const clamp = proc(
  (
    value: Animated.Adaptable<number>,
    lowerBound: Animated.Adaptable<number>,
    upperBound: Animated.Adaptable<number>
  ): Animated.Node<number> => min2(max2(lowerBound, value), upperBound)
);
const fract = (x: Animated.Adaptable<number>) => sub(x, floor(x));

// type Color = Animated.Adaptable<string> | Animated.Adaptable<number>;
type StaticColor = string | number;

const opacity = (c: number) => ((c >> 24) & 255) / 255;
const red = (c: number) => (c >> 16) & 255;
const green = (c: number) => (c >> 8) & 255;
const blue = (c: number) => c & 255;

const hsv2rgb = (
  h: Animated.Adaptable<number>,
  s: Animated.Adaptable<number>,
  v: Animated.Adaptable<number>
) => {
  // vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  const K = {
    x: 1,
    y: 2 / 3,
    z: 1 / 3,
    w: 3,
  };
  // vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  const p = {
    x: abs(sub(multiply(fract(add(h, K.x)), 6), K.w)),
    y: abs(sub(multiply(fract(add(h, K.y)), 6), K.w)),
    z: abs(sub(multiply(fract(add(h, K.z)), 6), K.w)),
  };
  // return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  const rgb = {
    x: multiply(v, mix(s, K.x, clamp(sub(p.x, K.x), 0, 1))),
    y: multiply(v, mix(s, K.x, clamp(sub(p.y, K.x), 0, 1))),
    z: multiply(v, mix(s, K.x, clamp(sub(p.z, K.x), 0, 1))),
  };
  return {
    r: round(multiply(rgb.x, 255)),
    g: round(multiply(rgb.y, 255)),
    b: round(multiply(rgb.z, 255)),
  };
};

const hsv2color = proc(
  (
    h: Animated.Adaptable<number>,
    s: Animated.Adaptable<number>,
    v: Animated.Adaptable<number>
  ) => {
    const { r, g, b } = hsv2rgb(h, s, v);
    return color(r, g, b) as Animated.Node<number>;
  }
);

const rgbToHsv = (c: number) => {
  const r = red(c) / 255;
  const g = green(c) / 255;
  const b = blue(c) / 255;

  const ma = Math.max(r, g, b);
  const mi = Math.min(r, g, b);
  let h = 0;
  const v = ma;

  const d = ma - mi;
  const s = ma === 0 ? 0 : d / ma;
  if (ma === mi) {
    h = 0; // achromatic
  } else {
    switch (ma) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default: // do nothing
    }
    h /= 6;
  }
  return { h, s, v };
};

const interpolateColorsHSV = (
  animationValue: Animated.Adaptable<number>,
  inputRange: readonly Animated.Adaptable<number>[],
  colors: number[]
): Animated.Node<number> => {
  const colorsAsHSV = colors.map((c) => rgbToHsv(c));
  const h = interpolateNode(animationValue, {
    inputRange,
    outputRange: colorsAsHSV.map((c) => c.h),
    extrapolate: Extrapolate.CLAMP,
  });
  const s = interpolateNode(animationValue, {
    inputRange,
    outputRange: colorsAsHSV.map((c) => c.s),
    extrapolate: Extrapolate.CLAMP,
  });
  const v = interpolateNode(animationValue, {
    inputRange,
    outputRange: colorsAsHSV.map((c) => c.v),
    extrapolate: Extrapolate.CLAMP,
  });
  return hsv2color(h, s, v);
};

const interpolateColorsRGB = (
  animationValue: Animated.Adaptable<number>,
  inputRange: readonly Animated.Adaptable<number>[],
  colors: number[]
) => {
  const r = round(
    interpolateNode(animationValue, {
      inputRange,
      outputRange: colors.map((c) => red(c)),
      extrapolate: Extrapolate.CLAMP,
    })
  );
  const g = round(
    interpolateNode(animationValue, {
      inputRange,
      outputRange: colors.map((c) => green(c)),
      extrapolate: Extrapolate.CLAMP,
    })
  );
  const b = round(
    interpolateNode(animationValue, {
      inputRange,
      outputRange: colors.map((c) => blue(c)),
      extrapolate: Extrapolate.CLAMP,
    })
  );
  const a = interpolateNode(animationValue, {
    inputRange,
    outputRange: colors.map((c) => opacity(c)),
    extrapolate: Extrapolate.CLAMP,
  });

  return color(r, g, b, a) as Animated.Node<number>;
};

interface ColorInterpolationConfig {
  inputRange: readonly Animated.Adaptable<number>[];
  outputRange: StaticColor[];
}

export const interpolateColor = (
  value: Animated.Adaptable<number>,
  config: ColorInterpolationConfig,
  colorSpace: 'hsv' | 'rgb' = 'rgb'
): Animated.Node<number> => {
  const { inputRange } = config;
  const outputRange = config.outputRange.map((c) =>
    typeof c === 'number' ? c : (processColor(c) as number)
  );
  if (colorSpace === 'hsv') {
    return interpolateColorsHSV(value, inputRange, outputRange);
  }
  return interpolateColorsRGB(value, inputRange, outputRange);
};
