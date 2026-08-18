/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // THE EXPORT ROUTE READS ITS FONTS OFF DISK, and a serverless bundle only
  // carries the files the tracer can see being imported. Nothing imports a
  // .woff2, so without this the fonts are simply not deployed and every
  // exported document silently loses its typefaces — Arabic worst of all, which
  // degrades to boxes rather than to a different-looking face.
  outputFileTracingIncludes: {
    "/api/studios/[slug]/quality/pdf": ["./src/fonts/**"],
  },
};

export default nextConfig;
