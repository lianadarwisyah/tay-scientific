import type { Config } from "tailwindcss";

// Colours come from CSS variables (see globals.css). The site uses a minimal neutral palette;
// the Careers page switches to the Tay blue palette with the .theme-careers class.
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bench: v("bench"),
        ink: v("ink"),
        brand: { DEFAULT: v("brand"), dark: v("brand-dark"), deep: v("brand-deep"), soft: v("brand-soft") },
        accent: { DEFAULT: v("accent"), dark: v("accent-dark") },
        line: v("line"),
        mist: v("mist"),
        slate: v("slate"),
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
