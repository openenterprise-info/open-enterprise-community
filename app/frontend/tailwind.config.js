export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy:   { DEFAULT: "#1e1b4b", light: "#312e81", dark: "#13103a" },
        indigo: { DEFAULT: "#4f46e5", light: "#6366f1", dark: "#4338ca" },
        slate:  { DEFAULT: "#64748b", light: "#94a3b8", lighter: "#f1f5f9" }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
