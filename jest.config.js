import * as fs from "fs";
import { pathsToModuleNameMapper } from "ts-jest";

const tsconfig = JSON.parse(fs.readFileSync("./tsconfig.json", "utf-8"));

/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: "node",
  moduleNameMapper: {
    ...pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
      prefix: "<rootDir>/",
    }),
    "package.json": "<rootDir>/package.json",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  transformIgnorePatterns: ["node_modules/(?!(p-event|p-timeout)/)"],
};
