"use client";

import { useEffect, useState, useCallback } from "react";
import { isNative, getPlatform } from "@stewardtrack/native-bridge";

interface KeyboardInfo {
  isVisible: boolean;
  keyboardHeight: number;
}

interface KeyboardHandlerProps {
  /** Callback when keyboard shows */
  onKeyboardShow?: (height: number) => void;
  /** Callback when keyboard hides */
  onKeyboardHide?: () => void;
  /** Apply padding to body when keyboard is visible */
  adjustBodyPadding?: boolean;
}

/**
 * KeyboardHandler
 *
 * Manages keyboard behavior on native platforms:
 * - Tracks keyboard visibility and height
 * - Adjusts layout when keyboard appears
 * - Provides keyboard accessory bar handling
 */
export function KeyboardHandler({
  onKeyboardShow,
  onKeyboardHide,
  adjustBodyPadding = false,
}: KeyboardHandlerProps) {
  useEffect(() => {
    if (!isNative()) return;

    const setupKeyboardListeners = async () => {
      try {
        const { Keyboard } = await import("@capacitor/keyboard");

        const showListener = await Keyboard.addListener("keyboardWillShow", (info) => {
          if (adjustBodyPadding) {
            document.body.style.paddingBottom = `${info.keyboardHeight}px`;
          }
          onKeyboardShow?.(info.keyboardHeight);
        });

        const hideListener = await Keyboard.addListener("keyboardWillHide", () => {
          if (adjustBodyPadding) {
            document.body.style.paddingBottom = "0px";
          }
          onKeyboardHide?.();
        });

        return () => {
          showListener.remove();
          hideListener.remove();
        };
      } catch (error) {
        console.error("Failed to set up keyboard listeners:", error);
      }
    };

    const cleanup = setupKeyboardListeners();
    return () => {
      cleanup.then((fn) => fn?.());
      if (adjustBodyPadding) {
        document.body.style.paddingBottom = "0px";
      }
    };
  }, [onKeyboardShow, onKeyboardHide, adjustBodyPadding]);

  return null;
}

/**
 * Hook to track keyboard state
 */
export function useKeyboard(): KeyboardInfo {
  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    isVisible: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    if (!isNative()) return;

    const setupKeyboardListeners = async () => {
      try {
        const { Keyboard } = await import("@capacitor/keyboard");

        const showListener = await Keyboard.addListener("keyboardWillShow", (info) => {
          setKeyboardInfo({
            isVisible: true,
            keyboardHeight: info.keyboardHeight,
          });
        });

        const hideListener = await Keyboard.addListener("keyboardWillHide", () => {
          setKeyboardInfo({
            isVisible: false,
            keyboardHeight: 0,
          });
        });

        return () => {
          showListener.remove();
          hideListener.remove();
        };
      } catch (error) {
        console.error("Failed to set up keyboard listeners:", error);
      }
    };

    const cleanup = setupKeyboardListeners();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, []);

  return keyboardInfo;
}

/**
 * Hook to control keyboard programmatically
 */
export function useKeyboardControl() {
  const show = useCallback(async () => {
    if (!isNative()) return;

    try {
      const { Keyboard } = await import("@capacitor/keyboard");
      await Keyboard.show();
    } catch (error) {
      console.error("Failed to show keyboard:", error);
    }
  }, []);

  const hide = useCallback(async () => {
    if (!isNative()) return;

    try {
      const { Keyboard } = await import("@capacitor/keyboard");
      await Keyboard.hide();
    } catch (error) {
      console.error("Failed to hide keyboard:", error);
    }
  }, []);

  const setAccessoryBarVisible = useCallback(async (visible: boolean) => {
    if (!isNative() || getPlatform() !== "ios") return;

    try {
      const { Keyboard } = await import("@capacitor/keyboard");
      await Keyboard.setAccessoryBarVisible({ isVisible: visible });
    } catch (error) {
      console.error("Failed to set accessory bar visibility:", error);
    }
  }, []);

  const setScroll = useCallback(async (enabled: boolean) => {
    if (!isNative()) return;

    try {
      const { Keyboard } = await import("@capacitor/keyboard");
      await Keyboard.setScroll({ isDisabled: !enabled });
    } catch (error) {
      console.error("Failed to set keyboard scroll:", error);
    }
  }, []);

  return {
    show,
    hide,
    setAccessoryBarVisible,
    setScroll,
  };
}
