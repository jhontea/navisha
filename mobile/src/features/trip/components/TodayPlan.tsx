import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { AppCard } from "../../../components/ui/AppCard";
import { colors, radii } from "../../../lib/theme";

const items = [
  {
    icon: "coffee-outline",
    time: "09:00",
    title: "Breakfast near Campuhan Ridge",
  },
  { icon: "bank-outline", time: "11:30", title: "Museum and market walk" },
  {
    icon: "silverware-fork-knife",
    time: "19:00",
    title: "Seafood dinner reservation",
  },
];

export function TodayPlan() {
  return (
    <AppCard>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Today preview</Text>
      <Text style={styles.badge}>Day 2</Text>
      </View>
      {items.map((item) => {
        return (
          <View key={item.time} style={styles.item}>
            <View style={styles.itemIcon}>
              <MaterialCommunityIcons
                color={colors.primary}
                name={
                  item.icon as React.ComponentProps<
                    typeof MaterialCommunityIcons
                  >["name"]
                }
                size={17}
              />
            </View>
            <View style={styles.itemText}>
              <Text style={styles.time}>{item.time}</Text>
              <Text style={styles.title}>{item.title}</Text>
            </View>
          </View>
        );
      })}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heading: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  item: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  itemIcon: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  itemText: {
    flex: 1,
  },
  time: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
});
