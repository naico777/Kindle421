import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "tmp/**", "next-env.d.ts", "tsconfig.tsbuildinfo"],
  },
  ...nextVitals,
];

export default eslintConfig;
