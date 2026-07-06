import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AppCard } from "../../../components/ui/AppCard";
import { colors, radii } from "../../../lib/theme";

export function TripPreviewCard() {
  return (
    <AppCard>
      <LinearGradient
        colors={colors.brandGradient}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.cover}
      >
        <View style={styles.coverContent}>
          <Text style={styles.coverLabel}>Upcoming trip</Text>
          <Text style={styles.coverTitle}>Bali slow weekend</Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons color="#ffffff" name="map-marker-outline" size={15} />
            <Text style={styles.coverMeta}>Ubud, Seminyak, Canggu</Text>
          </View>
        </View>
      </LinearGradient>
      <View style={styles.stats}>
        <Stat icon="calendar-blank-outline" label="Dates" value="Jul 12-15" />
        <Stat icon="airplane" label="Transport" value="2 legs" />
        <Stat icon="wallet-outline" label="Budget" value="Rp 4.2M" />
      </View>
    </AppCard>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons color={colors.primary} name={icon} size={17} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    minHeight: 148,
    overflow: "hidden",
  },
  coverContent: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 7,
    padding: 16,
  },
  coverLabel: {
    color: "#bfdbfe",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  coverTitle: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 31,
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  coverMeta: {
    color: "#eff6ff",
    fontSize: 14,
    fontWeight: "700",
  },
  stats: {
    flexDirection: "row",
    gap: 8,
  },
  stat: {
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    flex: 1,
    gap: 4,
    padding: 10,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  statValue: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "900",
  },
});
