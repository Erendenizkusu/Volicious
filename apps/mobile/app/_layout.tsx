import { Stack } from "expo-router";
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from "@expo-google-fonts/hanken-grotesk";
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import {
  Fraunces_600SemiBold,
  Fraunces_500Medium_Italic,
} from "@expo-google-fonts/fraunces";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { colors } from "@/lib/theme";
import { initClientId } from "@/lib/clientId";

SplashScreen.preventAutoHideAsync();

// Maliyet güvenliği: aynı sorgu (ör. keşif → harita → geri) 5 dk boyunca yeniden çekilmez →
// gereksiz Google çağrısı + kota tüketimi olmaz. Kota yalnızca gerçekten yeni aramada harcanır.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 } },
});

export default function RootLayout() {
  const [loaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    Fraunces_600SemiBold,
    Fraunces_500Medium_Italic,
  });

  // Kalıcı cihaz kimliğini açılışta yükle (kota bu kimliğe bağlı; ilk fetch'ten önce hazır olmalı).
  useEffect(() => {
    initClientId();
  }, []);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
          }}
        />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
