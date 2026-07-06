import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, radii } from "../../lib/theme";

export function AppHeader() {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.kicker}>Navisha</Text>
        <Text style={styles.title}>Good morning, Ahmad</Text>
      </View>
      <View style={styles.actions}>
        <View style={styles.iconButton}>
          <MaterialCommunityIcons
            color={colors.foreground}
            name="bell-outline"
            size={19}
          />
        </View>
        <LinearGradient
          colors={colors.brandGradient}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.avatar}
        >
          <MaterialCommunityIcons color="#ffffff" name="account-outline" size={19} />
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 31,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.subtle,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
});
