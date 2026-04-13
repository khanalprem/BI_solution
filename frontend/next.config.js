/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'echarts', 'date-fns'],
  },
}

module.exports = nextConfig
