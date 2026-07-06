import { PropsWithChildren } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, radii } from "../../lib/theme";

interface ButtonProps extends PropsWithChildren {
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress?: (event: GestureResponderEvent) => void;
  variant?: "primary" | "secondary";
}

export function Button({
  children,
  icon: Icon,
  onPress,
  variant = "primary",
}: ButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={colors.brandGradient}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.content}>
        {Icon ? (
          <MaterialCommunityIcons
            color={isPrimary ? "#ffffff" : colors.foreground}
            name={Icon}
            size={18}
          />
        ) : null}
        <Text style={isPrimary ? styles.primaryText : styles.secondaryText}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radii.sm,
    minHeight: 48,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  primary: {
    backgroundColor: colors.primaryDark,
  },
  secondary: {
    backgroundColor: colors.card,
    borderColor: colors.subtle,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "800",
  },
});
