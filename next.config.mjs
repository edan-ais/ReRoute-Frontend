/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // No experimental.appDir — it is now default
  experimental: {
    // leave empty or remove entirely
  },

  // Netlify support for image optimization (optional)
  images: {
    unoptimized: true
  }
};

export default nextConfig;
