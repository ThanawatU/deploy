import tailwindcssVite from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      apiBase: "http://34.126.177.64:3000/api/",
      // apiBase:"https://painamnae-backend.onrender.com/api/",
      googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
    },
  },
  devServer: {
    port: 3001,
  },
  plugins: ["~/plugins/api.client.js"],
  vite: {
    plugins: [tailwindcssVite()],
  },

  css: [
    'leaflet/dist/leaflet.css',
    '~/assets/css/input.css',
  ],
  build: {
    transpile: ['leaflet']
  },
});
