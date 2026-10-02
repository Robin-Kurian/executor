import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const webUrl = process.env.EXPO_PUBLIC_WEB_URL;
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
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
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

function registrationScript(token: string) {
  if (!apiUrl) return "true;";
  return `fetch(${JSON.stringify(`${apiUrl}/api/v1/push/expo`)}, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: ${JSON.stringify(token)} }) }).then(function (res) { console.log("[Push] Expo token registered with API, status:", res.status); }).catch(function (err) { console.error("[Push] Expo token registration failed:", err); }); true;`;
}
async function getPushTokens() {
  if (!Device.isDevice) {
    console.warn("[Push] Not a physical device, remote push tokens unavailable.");
    return { expoToken: null, fcmToken: null };
  }
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.status === "granted" ? existing : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") {
    console.warn("[Push] Notification permission not granted:", permission.status);
    return { expoToken: null, fcmToken: null };
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    "27e35af0-efc0-413c-b9a7-d66b391ce1c7";

  let expoToken: string | null = null;
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    expoToken = res.data;
    console.log("==================================================");
    console.log("[Push] EXPO PUSH TOKEN:", expoToken);
  } catch (err) {
    console.error("[Push] Failed to get Expo push token:", err);
  }

  let fcmToken: string | null = null;
  try {
    const res = await Notifications.getDevicePushTokenAsync();
    fcmToken = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    console.log("[Push] NATIVE FCM REGISTRATION TOKEN (Firebase Console):", fcmToken);
    console.log("==================================================");
  } catch (err) {
    console.error("[Push] Failed to get native FCM token:", err);
  }

  return { expoToken, fcmToken };
}
export default function App() {
  const web = useRef<WebView>(null); const tokenRef = useRef<string | null>(null); const [token, setToken] = useState<string | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false); const [loadError, setLoadError] = useState<string | null>(null); const [canGoBack, setCanGoBack] = useState(false);
  useEffect(() => {
    void (async () => {
      // Android 13 requires a notification channel before its permission
      // prompt and Expo-token registration.
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", { name: "Default", importance: Notifications.AndroidImportance.HIGH });
      }
      const { expoToken, fcmToken: nativeFcm } = await getPushTokens();
      tokenRef.current = expoToken;
      setToken(expoToken);
      setFcmToken(nativeFcm);
    })().catch((err) => console.error("[Push] Init error:", err));
    const response = Notifications.addNotificationResponseReceivedListener((event) => { const route = event.notification.request.content.data?.route; if (typeof route === "string") web.current?.injectJavaScript(`window.location.assign(${JSON.stringify(route)}); true;`); });
    const back = BackHandler.addEventListener("hardwareBackPress", () => { if (!canGoBack) return false; web.current?.goBack(); return true; });
    return () => { response.remove(); back.remove(); };
  }, [canGoBack]);
  useEffect(() => { if (loaded && token) web.current?.injectJavaScript(registrationScript(token)); }, [loaded, token]);
  if (!webUrl || !apiUrl) throw new Error("Set EXPO_PUBLIC_WEB_URL and EXPO_PUBLIC_API_URL before starting Executor Mobile.");
  return <SafeAreaView style={styles.screen}><StatusBar style="light" /><WebView ref={web} source={{ uri: webUrl }} injectedJavaScriptBeforeContentLoaded={hideWebNotificationControl} style={styles.webview} onLoad={() => { setLoaded(true); setLoadError(null); web.current?.injectJavaScript(hideWebNotificationControl); if (tokenRef.current) web.current?.injectJavaScript(registrationScript(tokenRef.current)); }} onLoadEnd={() => setLoaded(true)} onError={(event) => { setLoaded(true); setLoadError(event.nativeEvent.description); }} onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)} onMessage={(event) => { if (event.nativeEvent.data === "executor:native-shell-ready" && tokenRef.current) web.current?.injectJavaScript(registrationScript(tokenRef.current)); }} sharedCookiesEnabled thirdPartyCookiesEnabled javaScriptEnabled domStorageEnabled />{!loaded ? <View style={styles.loading}><ActivityIndicator color="#14b8a6" size="large" /></View> : null}{loadError ? <View style={styles.error}><Text style={styles.errorTitle}>Could not load Executor</Text><Text style={styles.errorText}>{loadError}</Text><Pressable style={styles.retry} onPress={() => { setLoaded(false); setLoadError(null); web.current?.reload(); }}><Text style={styles.retryText}>Retry</Text></Pressable></View> : null}</SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#07060d" }, webview: { flex: 1, backgroundColor: "#07060d" }, loading: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "#07060d" }, error: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 12, padding: 32, backgroundColor: "#07060d" }, errorTitle: { color: "#f1f5f9", fontSize: 20, fontWeight: "600" }, errorText: { color: "#94a3b8", textAlign: "center" }, retry: { borderRadius: 16, backgroundColor: "#14b8a6", paddingHorizontal: 20, paddingVertical: 12 }, retryText: { color: "#07060d", fontWeight: "700" } });
