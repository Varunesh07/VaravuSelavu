import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  AppState,
  Image,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
} from "react-native";
import {
  cancelAnimation,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

export type PandaReaction =
  | "happy"
  | "crying"
  | "thinking"
  | "sleeping"
  | "celebrating"
  | "shocked"
  | "pleading";

const FRAMES: Record<PandaReaction, ImageSourcePropType[]> = {
  happy: [
    require("./assets/panda/happy/frame-01.png"),
    require("./assets/panda/happy/frame-02.png"),
    require("./assets/panda/happy/frame-03.png"),
    require("./assets/panda/happy/frame-04.png"),
  ],
  crying: [
    require("./assets/panda/crying/frame-01.png"),
    require("./assets/panda/crying/frame-02.png"),
    require("./assets/panda/crying/frame-03.png"),
    require("./assets/panda/crying/frame-04.png"),
  ],
  thinking: [
    require("./assets/panda/thinking/frame-01.png"),
    require("./assets/panda/thinking/frame-02.png"),
    require("./assets/panda/thinking/frame-03.png"),
    require("./assets/panda/thinking/frame-04.png"),
  ],
  sleeping: [
    require("./assets/panda/sleeping/frame-01.png"),
    require("./assets/panda/sleeping/frame-02.png"),
    require("./assets/panda/sleeping/frame-03.png"),
    require("./assets/panda/sleeping/frame-04.png"),
  ],
  celebrating: [
    require("./assets/panda/celebrating/frame-01.png"),
    require("./assets/panda/celebrating/frame-02.png"),
    require("./assets/panda/celebrating/frame-03.png"),
    require("./assets/panda/celebrating/frame-04.png"),
  ],
  shocked: [
    require("./assets/panda/shocked/frame-01.png"),
    require("./assets/panda/shocked/frame-02.png"),
    require("./assets/panda/shocked/frame-03.png"),
    require("./assets/panda/shocked/frame-04.png"),
  ],
  pleading: [
    require("./assets/panda/pleading/frame-01.png"),
    require("./assets/panda/pleading/frame-02.png"),
    require("./assets/panda/pleading/frame-03.png"),
    require("./assets/panda/pleading/frame-04.png"),
  ],
};

type Props = {
  reaction?: PandaReaction;
  size?: number;
  animated?: boolean;
  /** Total time for one 4-frame cycle. 1400ms feels gentle, not frantic. */
  duration?: number;
  /** Maximum time in milliseconds to keep animating before stopping (e.g. 20000ms for AI chat) */
  maxDuration?: number;
  style?: StyleProp<ViewStyle>;
};

export function Panda({
  reaction = "happy",
  size = 80,
  animated = true,
  duration = 1400,
  maxDuration,
  style,
}: Props) {
  const progress = useSharedValue(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === "active");
  const [timedOut, setTimedOut] = useState(false);

  const frames = FRAMES[reaction] || FRAMES.happy;

  // Clamp sizes: 56–96 px for animated hero pandas, or at least 32px for static avatars
  const effectiveSize = animated ? Math.max(56, Math.min(96, size)) : Math.max(32, size);

  // Check device reduced-motion setting
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      setReduceMotion(enabled);
    });

    return () => {
      sub.remove();
    };
  }, []);

  // Pause animation when screen or app is not active
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      setIsAppActive(nextState === "active");
    });

    return () => {
      sub.remove();
    };
  }, []);

  // Handle optional max animation duration (e.g. stop after 20 seconds)
  useEffect(() => {
    setTimedOut(false);
    if (maxDuration && maxDuration > 0 && animated) {
      const timer = setTimeout(() => {
        setTimedOut(true);
      }, maxDuration);
      return () => clearTimeout(timer);
    }
  }, [maxDuration, animated, reaction]);

  const shouldAnimate = animated && !reduceMotion && isAppActive && !timedOut;

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(progress);
      progress.value = 0;
      setFrameIndex(0);
      return;
    }

    progress.value = 0;
    progress.value = withRepeat(
      withTiming(4, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    const interval = setInterval(() => {
      // Four changes per cycle; JS work is intentionally minimal.
      setFrameIndex((current) => (current + 1) % frames.length);
    }, duration / frames.length);

    return () => {
      clearInterval(interval);
      cancelAnimation(progress);
    };
  }, [shouldAnimate, duration, frames.length, progress]);

  return (
    <Image
      source={frames[shouldAnimate ? frameIndex : 0]}
      resizeMode="contain"
      accessibilityLabel={`Panda ${reaction}`}
      style={[{ width: effectiveSize, height: effectiveSize }, style]}
    />
  );
}

export default Panda;
