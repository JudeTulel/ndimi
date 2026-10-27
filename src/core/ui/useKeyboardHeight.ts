import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height of the on-screen keyboard, 0 when it is closed.
 *
 * Edge-to-edge is enabled, and from Android 15 the framework no longer shrinks the
 * window for `adjustResize` under it. That leaves `KeyboardAvoidingView` inert on
 * Android (its `padding`/`height` behaviours are driven by the resize), so screens
 * have to react to the keyboard themselves.
 *
 * iOS reports the same way, so one hook covers both.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS emits `keyboardWillChangeFrame` before the animation; Android only has
    // the `did` events, which land after it. Both are subscribed so neither
    // platform has to special-case in the caller.
    const show = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(show, (event) => {
      // On iOS the frame is present for hide events too, with `screenY` off the
      // bottom of the window; subtracting gives 0 in that case.
      const end = event.endCoordinates;
      const visible = end.screenY < (end.screenY + end.height);
      setHeight(visible ? end.height : 0);
    });
    const hideSub = Keyboard.addListener(hide, () => {
      if (Platform.OS !== 'ios') setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
