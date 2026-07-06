import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader } from "../../src/components/shell/AppHeader";
import { BottomNav } from "../../src/components/shell/BottomNav";
import { Button } from "../../src/components/ui/Button";
import { Screen } from "../../src/components/ui/Screen";
import { useAuthStore } from "../../src/features/auth/store";
import { QuickActions } from "../../src/features/trip/components/QuickActions";
import { TodayPlan } from "../../src/features/trip/components/TodayPlan";
import { TripPreviewCard } from "../../src/features/trip/components/TripPreviewCard";
import { apiConfig } from "../../src/lib/api";
import { colors } from "../../src/lib/theme";

export default function TripsScreen() {
  const { clearUser } = useAuthStore();

  return (
    <Screen footer={<BottomNav />}>
      <AppHeader />
      <TripPreviewCard />
      <QuickActions />
      <TodayPlan />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API target</Text>
        <Text style={styles.mono}>{apiConfig.baseUrl}</Text>
        <Text style={styles.body}>
          This is still placeholder data. Phase 2 connects login, then Phase 4
          replaces this shell with real trips from the Go API.
        </Text>
      </View>

      <Button icon="plus-circle-outline">Start planning preview</Button>
      <Link href="/login" asChild>
        <Button variant="secondary" onPress={clearUser}>
          Back to login
        </Button>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    borderColor: colors.subtle,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    backgroundColor: colors.card,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "800",
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  mono: {
    color: colors.foreground,
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 20,
  },
});
