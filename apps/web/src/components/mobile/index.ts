/**
 * Mobile Components
 *
 * Platform-specific UI components and handlers for native mobile support.
 * These components use Capacitor plugins when running in native containers
 * and gracefully degrade on web.
 */

// Layout and safe area handling
export {
  MobileLayoutWrapper,
  useSafeAreaInsets,
  useIsNative,
  usePlatform,
} from "./MobileLayoutWrapper";

// Navigation handling (back button, deep links)
export {
  MobileNavigationHandler,
  useAppLifecycle,
  navigateWithHaptics,
} from "./MobileNavigationHandler";

// Haptic feedback
export {
  HapticButton,
  withHaptics,
  useHapticFeedback,
} from "./HapticButton";

// Pull to refresh
export { PullToRefresh, usePullToRefresh } from "./PullToRefresh";

// Status bar control
export {
  StatusBarHandler,
  useStatusBar,
  type StatusBarStyle,
} from "./StatusBarHandler";

// Keyboard handling
export {
  KeyboardHandler,
  useKeyboard,
  useKeyboardControl,
} from "./KeyboardHandler";

// Mobile provider (combines all handlers)
export { MobileProvider } from "./MobileProvider";

// Navigation progress indicator
export {
  NavigationProgress,
  useNavigationLoading,
} from "./NavigationProgress";
