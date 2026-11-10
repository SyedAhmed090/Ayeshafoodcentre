// Tailwind runs as a PostCSS plugin so the production build can use Webpack (Hostinger kills Turbopack's CSS workers).
const config = {
  plugins: { "@tailwindcss/postcss": {} },
};

export default config;
