import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { colors, radii } from "../../lib/theme";

export function AppCard({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.subtle,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
});
