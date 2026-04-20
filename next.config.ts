import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_LIFE_API_ENABLED: process.env.LIFE_API_ENABLED ?? "false",
  },
  // Bundle the local ZIP → plans lookup and CMS plan-detail gz files into the
  // Medicare plans serverless function. Next's file tracer can only see files
  // reached by static `import`, so runtime fs.createReadStream paths must be
  // declared here or Vercel deploys them without the data and the route 500s.
  outputFileTracingIncludes: {
    "/api/medicare/plans": [
      "./data/zip_backend_plans.json.gz",
      "./data/extracted_cms.json.gz",
    ],
    "/medicare/[planId]": [
      "./data/extracted_cms.json.gz",
    ],
  },
};

export default nextConfig;
