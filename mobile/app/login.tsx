import { Link } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "../src/components/ui/Button";
import { useAuthStore } from "../src/features/auth/store";
import { colors, radii } from "../src/lib/theme";

export default function LoginScreen() {
  const setUser = useAuthStore((state) => state.setUser);

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <LinearGradient
          colors={colors.brandGradient}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.logoMark}
        >
          <MaterialCommunityIcons color="#ffffff" name="compass-outline" size={28} />
        </LinearGradient>
        <Text style={styles.eyebrow}>Navisha mobile</Text>
        <Text style={styles.title}>Plan your journey. Own your adventure.</Text>
        <Text style={styles.body}>
          A calmer way to build trips, scan the day, open routes, and keep
          your budget close while moving.
        </Text>
        <Button
          icon="map-marker-path"
          onPress={() =>
            setUser({
              id: "phase-1-preview",
              email: "preview@navisha.local",
              name: "Phase 1 Preview",
              avatar_url: "",
            })
          }
        >
          Preview mobile shell
        </Button>
        <Link href="/trips" asChild>
          <Button variant="secondary">Open trips shell</Button>
        </Link>
        <Text style={styles.caption}>
          Google login connects in Phase 2. This screen is a product-style shell
          for previewing the mobile direction.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  panel: {
    gap: 16,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.md,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: colors.foreground,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 39,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
