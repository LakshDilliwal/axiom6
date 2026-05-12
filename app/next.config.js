/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  allowedDevOrigins: ['172.31.110.175'],
};
module.exports = nextConfig;
