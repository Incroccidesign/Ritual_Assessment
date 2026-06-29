import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./types/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        night: "#0F1115",
        bone: "#F3EFE6",
        graphite: "#2A2F38",
        violet: "#6F5BFF",
        orange: "#FF6A2B",
        mint: "#6EF2C2",
        blue: "#5EA5FF",
        yellow: "#FFD166",
        rose: "#FF7BA7"
      },
      fontFamily: {
        heading: ["var(--font-sora)", "Sora", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "sans-serif"]
      },
      boxShadow: {
        live: "0 0 0 1px rgba(243,239,230,0.12), 0 24px 80px rgba(0,0,0,0.42)"
      }
    }
  },
  plugins: []
};

export default config;
