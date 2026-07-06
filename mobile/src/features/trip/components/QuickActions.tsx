import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, radii } from "../../../lib/theme";

const actions = [
  {
    icon: "notebook-edit-outline",
    label: "Itinerary",
    bg: colors.primarySoft,
    fg: colors.primary,
  },
  {
    icon: "map-marker-radius-outline",
    label: "Maps",
    bg: colors.skySoft,
    fg: colors.sky,
  },
  {
    icon: "wallet-outline",
    label: "Budget",
    bg: colors.greenSoft,
    fg: colors.green,
  },
  {
    icon: "sparkles",
    label: "AI Draft",
    bg: colors.auroraSoft,
    fg: colors.aurora,
  },
];

export function QuickActions() {
  return (
    <View style={styles.grid}>
      {actions.map((action) => {
        return (
          <View
            accessibilityRole="button"
            key={action.label}
            style={[styles.action, { backgroundColor: action.bg }]}
          >
            <MaterialCommunityIcons
              color={action.fg}
              name={
                action.icon as React.ComponentProps<
                  typeof MaterialCommunityIcons
                >["name"]
              }
              size={21}
            />
            <Text style={[styles.label, { color: action.fg }]}>
              {action.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  action: {
    alignItems: "center",
    borderRadius: radii.sm,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 9,
    minHeight: 86,
    justifyContent: "center",
    padding: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "900",
  },
});
