import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Easing, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const webUrl = process.env.EXPO_PUBLIC_WEB_URL;
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 300, fade: true });

const hideWebNotificationControl = `
  (function () {
    var id = "executor-mobile-hide-web-notifications";
    if (document.getElementById(id)) return true;
    var style = document.createElement("style");
    style.id = id;
    style.textContent = 'button[aria-label="Notification settings"] { display: none !important; }';
    document.documentElement.appendChild(style);
    return true;
  })();
`;
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }) });

function registrationScript(token: string) {
  if (!apiUrl) return "true;";
  return `fetch(${JSON.stringify(`${apiUrl}/api/v1/push/expo`)}, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: ${JSON.stringify(token)} }) }).catch(function (err) { console.error("[Push] Expo token registration failed:", err); }); true;`;
}
async function getExpoPushToken() {
  if (!Device.isDevice) {
    console.warn("[Push] Not a physical device, remote push tokens unavailable.");
    return null;
  }
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.status === "granted" ? existing : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") {
    console.warn("[Push] Notification permission not granted:", permission.status);
    return null;
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    console.error("[Push] Expo project ID is unavailable.");
    return null;
  }

  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    return res.data;
  } catch (err) {
    console.error("[Push] Failed to get Expo push token:", err);
    return null;
  }
}

function StartupLoader() {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.loading} accessibilityLabel="Loading Executor">
      <View style={styles.loaderMark}>
        <Animated.View
          style={[
            styles.loaderPulse,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.24] }) }],
            },
          ]}
        />
        <Image source={require("./assets/splash-icon.png")} style={styles.loaderLogo} resizeMode="contain" />
      </View>
      <Text style={styles.loaderTitle}>EXECUTOR</Text>
      <Text style={styles.loaderSubtitle}>Preparing your day</Text>
      <View style={styles.loaderTrack}>
        <Animated.View
          style={[
            styles.loaderProgress,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
              transform: [{ scaleX: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }],
            },
          ]}
        />
      </View>
    </View>
  );
}

export default function App() {
  const web = useRef<WebView>(null); const tokenRef = useRef<string | null>(null); const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false); const [loadError, setLoadError] = useState<string | null>(null); const [canGoBack, setCanGoBack] = useState(false);
  useEffect(() => {
    void (async () => {
      // Android 13 requires a notification channel before its permission
      // prompt and Expo-token registration.
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          enableVibrate: true,
          sound: "default",
          lightColor: "#14b8a6",
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
        });
      }
      const expoToken = await getExpoPushToken();
      tokenRef.current = expoToken;
      setToken(expoToken);
    })().catch((err) => console.error("[Push] Init error:", err));
    const response = Notifications.addNotificationResponseReceivedListener((event) => { const route = event.notification.request.content.data?.route; if (typeof route === "string") web.current?.injectJavaScript(`window.location.assign(${JSON.stringify(route)}); true;`); });
    const back = BackHandler.addEventListener("hardwareBackPress", () => { if (!canGoBack) return false; web.current?.goBack(); return true; });
    return () => { response.remove(); back.remove(); };
  }, [canGoBack]);
  useEffect(() => { if (loaded && token) web.current?.injectJavaScript(registrationScript(token)); }, [loaded, token]);
  if (!webUrl || !apiUrl) throw new Error("Set EXPO_PUBLIC_WEB_URL and EXPO_PUBLIC_API_URL before starting Executor Mobile.");
  return <SafeAreaView style={styles.screen} onLayout={() => { void SplashScreen.hideAsync(); }}><StatusBar style="light" /><WebView ref={web} source={{ uri: webUrl }} injectedJavaScriptBeforeContentLoaded={hideWebNotificationControl} style={styles.webview} onLoad={() => { setLoadError(null); web.current?.injectJavaScript(hideWebNotificationControl); if (tokenRef.current) web.current?.injectJavaScript(registrationScript(tokenRef.current)); }} onError={(event) => { setLoaded(true); setLoadError(event.nativeEvent.description); }} onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)} onMessage={(event) => { if (event.nativeEvent.data === "executor:native-web-ready" || event.nativeEvent.data === "executor:native-shell-ready") setLoaded(true); if (event.nativeEvent.data === "executor:native-shell-ready" && tokenRef.current) web.current?.injectJavaScript(registrationScript(tokenRef.current)); }} sharedCookiesEnabled thirdPartyCookiesEnabled javaScriptEnabled domStorageEnabled />{!loaded ? <StartupLoader /> : null}{loadError ? <View style={styles.error}><Text style={styles.errorTitle}>Could not load Executor</Text><Text style={styles.errorText}>{loadError}</Text><Pressable style={styles.retry} onPress={() => { setLoaded(false); setLoadError(null); web.current?.reload(); }}><Text style={styles.retryText}>Retry</Text></Pressable></View> : null}</SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#07060d" }, webview: { flex: 1, backgroundColor: "#07060d" }, loading: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "#07060d" }, loaderMark: { width: 180, height: 180, alignItems: "center", justifyContent: "center" }, loaderPulse: { position: "absolute", width: 152, height: 152, borderRadius: 76, borderWidth: 1, borderColor: "#5eead4", backgroundColor: "rgba(20,184,166,0.12)" }, loaderLogo: { width: 160, height: 160 }, loaderTitle: { marginTop: 18, color: "#f8fafc", fontSize: 17, fontWeight: "700", letterSpacing: 5 }, loaderSubtitle: { marginTop: 8, color: "#94a3b8", fontSize: 13, letterSpacing: 0.4 }, loaderTrack: { marginTop: 24, width: 88, height: 2, overflow: "hidden", borderRadius: 1, backgroundColor: "rgba(148,163,184,0.18)" }, loaderProgress: { width: "100%", height: "100%", borderRadius: 1, backgroundColor: "#2dd4bf" }, error: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 12, padding: 32, backgroundColor: "#07060d" }, errorTitle: { color: "#f1f5f9", fontSize: 20, fontWeight: "600" }, errorText: { color: "#94a3b8", textAlign: "center" }, retry: { borderRadius: 16, backgroundColor: "#14b8a6", paddingHorizontal: 20, paddingVertical: 12 }, retryText: { color: "#07060d", fontWeight: "700" } });
