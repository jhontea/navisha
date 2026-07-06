import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = "Loading" }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#0f766e" size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  label: {
    color: "#4b5563",
    fontSize: 15,
    fontWeight: "600",
  },
});
