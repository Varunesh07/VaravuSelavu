import React, { useEffect, useState, useRef } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Image,
  ImageSourcePropType,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export type PandaReaction =
  | 'happy'
  | 'crying'
  | 'thinking'
  | 'sleeping'
  | 'celebrating'
  | 'shocked'
  | 'pleading';

const FRAMES: Record<PandaReaction, ImageSourcePropType[]> = {
  happy: [
    require('./assets/panda/happy/frame-01.png'),
    require('./assets/panda/happy/frame-02.png'),
    require('./assets/panda/happy/frame-03.png'),
    require('./assets/panda/happy/frame-04.png'),
  ],
  crying: [
    require('./assets/panda/crying/frame-01.png'),
    require('./assets/panda/crying/frame-02.png'),
    require('./assets/panda/crying/frame-03.png'),
    require('./assets/panda/crying/frame-04.png'),
  ],
  thinking: [
    require('./assets/panda/thinking/frame-01.png'),
    require('./assets/panda/thinking/frame-02.png'),
    require('./assets/panda/thinking/frame-03.png'),
    require('./assets/panda/thinking/frame-04.png'),
  ],
  sleeping: [
    require('./assets/panda/sleeping/frame-01.png'),
    require('./assets/panda/sleeping/frame-02.png'),
    require('./assets/panda/sleeping/frame-03.png'),
    require('./assets/panda/sleeping/frame-04.png'),
  ],
  celebrating: [
    require('./assets/panda/celebrating/frame-01.png'),
    require('./assets/panda/celebrating/frame-02.png'),
    require('./assets/panda/celebrating/frame-03.png'),
    require('./assets/panda/celebrating/frame-04.png'),
  ],
  shocked: [
    require('./assets/panda/shocked/frame-01.png'),
    require('./assets/panda/shocked/frame-02.png'),
    require('./assets/panda/shocked/frame-03.png'),
    require('./assets/panda/shocked/frame-04.png'),
  ],
  pleading: [
    require('./assets/panda/pleading/frame-01.png'),
    require('./assets/panda/pleading/frame-02.png'),
    require('./assets/panda/pleading/frame-03.png'),
    require('./assets/panda/pleading/frame-04.png'),
  ],
};

type Props = {
  reaction?: PandaReaction;
  size?: number;
  animated?: boolean;
  /** Maximum time in milliseconds to keep animating before stopping (e.g. 20000ms for AI chat) */
  maxDuration?: number;
  style?: StyleProp<ViewStyle>;
};

export function Panda({
  reaction = 'happy',
  size = 76,
  animated = true,
  maxDuration,
  style,
}: Props) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const [timedOut, setTimedOut] = useState(false);
  const prevReactionRef = useRef<PandaReaction | null>(null);

  // Reanimated shared values for smooth physics-based movement
  const translateY = useSharedValue(0);
  const rotateZ = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const opacity = useSharedValue(1);

  const frames = FRAMES[reaction] || FRAMES.happy;

  // Clamp sizes: 56–96 px for animated hero pandas, or 32px minimum for static avatars
  const effectiveSize = animated ? Math.max(56, Math.min(96, size)) : Math.max(32, size);

  // Compensate for ~40px transparent padding in 256x256 PNGs so character visually matches effectiveSize
  const visualScale = 1.25;

  // Check device reduced-motion setting
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });

    return () => {
      sub.remove();
    };
  }, []);

  // Pause animation when app is not active / backgrounded
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      setIsAppActive(nextState === 'active');
    });

    return () => {
      sub.remove();
    };
  }, []);

  // Handle optional max animation duration (e.g. stop after 20s for AI chat)
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

  // Slow frame cycling: change frame slowly every 2.5 seconds to keep expression lively without jitter
  useEffect(() => {
    if (!shouldAnimate) {
      setFrameIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [shouldAnimate, frames.length, reaction]);

  // Event Reaction & Smooth Reanimated Movement
  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(translateY);
      cancelAnimation(rotateZ);
      cancelAnimation(scaleX);
      cancelAnimation(scaleY);
      cancelAnimation(opacity);

      translateY.value = 0;
      rotateZ.value = 0;
      scaleX.value = 1;
      scaleY.value = 1;
      opacity.value = 1;
      return;
    }

    // 1. Crossfade & Spring Pop on mood change (~200ms quick squash and stretch)
    const isMoodChange = prevReactionRef.current !== null && prevReactionRef.current !== reaction;
    prevReactionRef.current = reaction;

    if (isMoodChange) {
      opacity.value = 0.35;
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });

      // Quick squash and stretch pop
      scaleX.value = withSequence(
        withTiming(1.15, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(0.92, { duration: 110, easing: Easing.out(Easing.quad) }),
        withSpring(1.0, { damping: 12, stiffness: 200 })
      );
      scaleY.value = withSequence(
        withTiming(0.86, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(1.12, { duration: 110, easing: Easing.out(Easing.quad) }),
        withSpring(1.0, { damping: 12, stiffness: 200 })
      );
    }

    // 2. Continuous soft idle movement per mood
    const idleDelay = isMoodChange ? 220 : 0;
    const startIdleTimer = setTimeout(() => {
      cancelAnimation(translateY);
      cancelAnimation(rotateZ);

      switch (reaction) {
        case 'happy':
          // Gentle bounce
          translateY.value = withRepeat(
            withTiming(-5, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
          );
          scaleY.value = withRepeat(
            withTiming(1.03, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
          );
          break;

        case 'thinking':
          // Slow float with subtle tilt
          translateY.value = withRepeat(
            withTiming(-6, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );
          rotateZ.value = withRepeat(
            withTiming(2.5, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );
          break;

        case 'sleeping':
          // Slow rhythmic breathing
          scaleY.value = withRepeat(
            withTiming(1.04, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );
          scaleX.value = withRepeat(
            withTiming(0.97, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );
          translateY.value = withRepeat(
            withTiming(2, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );
          break;

        case 'celebrating':
          // Slightly bigger, upbeat bounce with small wiggle
          translateY.value = withRepeat(
            withTiming(-9, { duration: 700, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
          );
          rotateZ.value = withRepeat(
            withTiming(3, { duration: 700, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
          );
          scaleY.value = withRepeat(
            withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
          );
          break;

        case 'crying':
          // Very small sad sway
          rotateZ.value = withRepeat(
            withTiming(2, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );
          translateY.value = withRepeat(
            withTiming(1.5, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );
          break;

        case 'pleading':
          // Very small questioning sway
          rotateZ.value = withRepeat(
            withTiming(-2, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );
          translateY.value = withRepeat(
            withTiming(-2, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
          );
          break;

        case 'shocked':
          // One brief small pop then settles
          scaleX.value = withSequence(
            withTiming(1.14, { duration: 130, easing: Easing.out(Easing.quad) }),
            withSpring(1.0, { damping: 10, stiffness: 220 })
          );
          scaleY.value = withSequence(
            withTiming(1.14, { duration: 130, easing: Easing.out(Easing.quad) }),
            withSpring(1.0, { damping: 10, stiffness: 220 })
          );
          translateY.value = withSequence(
            withTiming(-4, { duration: 130 }),
            withSpring(0, { damping: 10, stiffness: 220 })
          );
          break;
      }
    }, idleDelay);

    return () => {
      clearTimeout(startIdleTimer);
      cancelAnimation(translateY);
      cancelAnimation(rotateZ);
      cancelAnimation(scaleX);
      cancelAnimation(scaleY);
      cancelAnimation(opacity);
    };
  }, [shouldAnimate, reaction]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { rotateZ: `${rotateZ.value}deg` },
        { scaleX: scaleX.value },
        { scaleY: scaleY.value },
      ],
    };
  });

  return (
    <View
      style={[
        {
          width: effectiveSize,
          height: effectiveSize,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        },
        style,
      ]}
    >
      <Animated.View style={animatedStyle}>
        <Image
          source={frames[frameIndex] || frames[0]}
          resizeMode="contain"
          accessibilityLabel={`Panda ${reaction}`}
          style={{
            width: effectiveSize * visualScale,
            height: effectiveSize * visualScale,
          }}
        />
      </Animated.View>
    </View>
  );
}

export default Panda;
