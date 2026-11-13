import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        card: "var(--color-surface)",
        "card-hover": "var(--color-surface-muted)",
        border: "var(--color-border)",
        "border-light": "rgba(177, 214, 240, 0.3)",
        crm: {
          navy: "#002050",
          navyDeep: "#001433",
          navySurface: "#07285C",
          navyElevated: "#0D336E",
          lightGrey: "#DFE2E8",
          blue: "#1160B7",
          sky: "#B1D6F0",
          orangeRed: "#D24726",
          orangeRedDark: "#A9361B",
          periwinkle: "#7D9FF8",
          indigo: "#4747A1",
          coral: "#F0797E",
        },
        brand: {
          50: "#EEF5FC",
          100: "#B1D6F0",
          200: "#97BFF2",
          300: "#7D9FF8",
          400: "#4747A1",
          500: "#1160B7",
          600: "#1160B7",
          700: "#002050",
          800: "#002050",
          900: "#001433",
          950: "#001433",
        },
      },
    },
  },
  plugins: [],
};

export default config;
