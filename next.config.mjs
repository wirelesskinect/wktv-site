/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      // Serve the new WKTV design pages (in /public) for these addresses.
      // Signup, login, pay, dashboard, renew, support form and admin stay as app pages.
      beforeFiles: [
        { source: '/', destination: '/home.html' },
        { source: '/troubleshooting', destination: '/troubleshooting.html' },
        { source: '/help', destination: '/support.html' },
      ],
    };
  },
};

export default nextConfig;
