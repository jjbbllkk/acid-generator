// ... imports

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env': process.env,
  },
  assetsInclude: ['**/*.md'],
  plugins: [react(), eslint({ fix: true })],
  base: '/acid-generator/', // <--- CHANGE THIS LINE
});
