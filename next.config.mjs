/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true,
    domains: ['localhost'],
  },
  
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Полностью игнорируем эти модули в браузере
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^(bufferutil|utf-8-validate)$/,
        })
      );
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        bufferutil: false,
        'utf-8-validate': false,
      };
    }
    return config;
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:3001 http://localhost:3001;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;