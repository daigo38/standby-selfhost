/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercelでのファイルアップロード制限を調整
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
}

module.exports = nextConfig
