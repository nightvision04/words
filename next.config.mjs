/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['tailwindui.com'],
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 300, 
        aggregateTimeout: 301, 
      };
    }
    return config;
  },
  reactStrictMode: true,
};

export default nextConfig;