import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deployed at https://tnguyen-smc.github.io/baptism/
// If the repo is renamed, change REPO_NAME. Custom domain at the root → USE_CUSTOM_DOMAIN = true.
const REPO_NAME = "baptism";
const USE_CUSTOM_DOMAIN = false;

export default defineConfig({
  plugins: [react()],
  base: USE_CUSTOM_DOMAIN ? "/" : `/${REPO_NAME}/`,
});
