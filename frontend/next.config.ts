import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // webpack: (config) => {
  //   config.resolve.fallback = {
  //     ...config.resolve.fallback,
  //     // Prevent bundling RN-only deps
  //     "pino-pretty": false,
  //     "@react-native-async-storage/async-storage": false,
  //   };
  //   return config;
  // },
  webpack: (config) => {
    if (process.env.NODE_ENV === "development") {
      config.cache = { type: "filesystem" };
    }

    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      net: false,
      tls: false,
    };

    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };

    return config;
  },
};

export default nextConfig;
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   experimental: {
//     turbo: false, // disable turbopack
//   },
// };

// module.exports = nextConfig;

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   webpack: (config) => {
//     config.resolve.fallback = {
//       ...config.resolve.fallback,
//       // Prevent bundling RN-only deps
//       "pino-pretty": false,
//       "@react-native-async-storage/async-storage": false,
//     };
//     return config;
//   },
// };

// module.exports = nextConfig;
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   webpack: (config) => {
//     if (process.env.NODE_ENV === "development") {
//       config.cache = { type: "filesystem" };
//     }

//     config.resolve.fallback = {
//       ...(config.resolve.fallback || {}),
//       fs: false,
//       net: false,
//       tls: false,
//     };

//     config.resolve.alias = {
//       ...(config.resolve.alias || {}),
//       "@react-native-async-storage/async-storage": false,
//       "pino-pretty": false,
//     };

//     return config;
//   },
// };

// module.exports = nextConfig;
