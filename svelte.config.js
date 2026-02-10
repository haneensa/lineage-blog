import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // Use static adapter for GitHub Pages
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '200.html' // SPA fallback
    }),
    // Base path for GitHub Pages
    paths: {
      base: '/lineage-blog'
    }
  }
};

export default config;

