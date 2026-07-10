import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: "#f4f8f5",
          100: "#e6f0e8",
          700: "#2f6f55",
          900: "#17392c"
        }
      }
    }
  },
  plugins: []
};

export default config;
