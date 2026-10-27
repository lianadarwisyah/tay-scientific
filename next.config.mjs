/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Loaded as normal Node packages on the server (not bundled): Excel export and email
  serverExternalPackages: ["exceljs", "nodemailer"],
};
export default nextConfig;
