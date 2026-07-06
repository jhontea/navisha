import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, radii } from "../../lib/theme";

const items: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  active?: boolean;
}[] = [
  { icon: "home-variant-outline", label: "Home", active: true },
  { icon: "map-marker-path", label: "Trips" },
  { icon: "plus-circle-outline", label: "Add" },
  { icon: "map-outline", label: "Map" },
  { icon: "wallet-outline", label: "Budget" },
];

export function BottomNav() {
  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const color = item.active ? colors.primary : colors.muted;

        return (
          <Pressable
            accessibilityRole="button"
            key={item.label}
            style={[styles.item, item.active && styles.activeItem]}
          >
            <MaterialCommunityIcons color={color} name={item.icon} size={19} />
            <Text style={[styles.label, item.active && styles.activeLabel]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.subtle,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "space-between",
    padding: 6,
  },
  item: {
    alignItems: "center",
    borderRadius: radii.sm,
    flex: 1,
    gap: 4,
    minHeight: 54,
    justifyContent: "center",
  },
  activeItem: {
    backgroundColor: colors.auroraSoft,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
  },
  activeLabel: {
    color: colors.primary,
  },
});
