import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "sysken-pay-admin",
    compatibilityDate: "2026-11-17",
    observability: {
      enabled: true,
    },
    assets: {
      notFoundHandling: "single-page-application",
    },
    domains: [
      {
        hostname: "admin.pay.sysken.net",
        production: true,
        previews: false,
      },
    ],
    previewUrls: false,
    env: {
      ASSETS: {
        type: "assets",
      },
    },
  },
});
