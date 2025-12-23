/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        dns: false,
        http2: false,
        'aws-crt': false,
        'perf_hooks': false
      };
    }
    return config;
  },
  env: {
    NEXT_PUBLIC_KRAKEN_API_KEY: process.env.KRAKEN_API_KEY,
    NEXT_PUBLIC_KRAKEN_API_SECRET: process.env.KRAKEN_API_SECRET,
  }
};

module.exports = nextConfig; 