import { Redirect } from "expo-router";

import { LoadingScreen } from "../src/components/ui/LoadingScreen";
import { useAuthStore } from "../src/features/auth/store";

export default function IndexRoute() {
  const { isHydrating, user } = useAuthStore();

  if (isHydrating) {
    return <LoadingScreen label="Preparing Navisha" />;
  }

  return <Redirect href={user ? "/trips" : "/login"} />;
}
