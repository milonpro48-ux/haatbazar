/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { colors: { background: "hsl(var(--background))", foreground: "hsl(var(--foreground))", card: "hsl(var(--card))", muted: "hsl(var(--muted))", "muted-foreground": "hsl(var(--muted-foreground))" } } },
  plugins: []
};
