import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const allowAll = env.ALLOW_ALL_HOSTS === "true";
  const extraHosts = (env.ALLOWED_HOSTS || "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  const allowedHosts: true | string[] = allowAll
    ? true
    : ["localhost", "127.0.0.1", ...extraHosts];

  return {
    server: {
      host: "::",
      port: 8080,
      allowedHosts,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
