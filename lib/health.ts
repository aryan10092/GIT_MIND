export type HealthCheck = {
  label: string;
  passed: boolean;
  points: number;
  tip: string;
};

export type HealthResult = {
  score: number;
  maxScore: number;
  checks: HealthCheck[];
  suggestions?: string | null;
};

const README_PATTERN = /^(readme(\.(md|txt|rst))?)$/i;
const LICENSE_PATTERN = /^license(\.(md|txt))?$/i;
const TEST_PATH_PATTERN =
  /(^|\/)(tests?|__tests__|spec)(\/|$)|\.(test|spec)\.[a-z0-9]+$/i;

function hasReadme(paths: string[]) {
  return paths.some((path) => {
    const name = path.split("/").pop() ?? path;
    return README_PATTERN.test(name);
  });
}

function hasTests(paths: string[]) {
  return paths.some((path) => TEST_PATH_PATTERN.test(path));
}

function hasCi(paths: string[]) {
  return paths.some((path) => path.startsWith(".github/workflows/"));
}

function hasEnvExample(paths: string[]) {
  return paths.some(
    (path) =>
      path === ".env.example" ||
      path.endsWith("/.env.example") ||
      path === "env.example",
  );
}

function hasLicense(paths: string[]) {
  return paths.some((path) => {
    const name = path.split("/").pop() ?? path;
    return LICENSE_PATTERN.test(name);
  });
}

export function computeHealth(
  paths: string[],
  fileCount: number,
): HealthResult {
  const checks: HealthCheck[] = [
    {
      label: "README",
      passed: hasReadme(paths),
      points: 20,
      tip: "Add a README.md explaining setup and usage.",
    },
    {
      label: "Tests",
      passed: hasTests(paths),
      points: 25,
      tip: "Add a tests/ folder or *.test.* files.",
    },
    {
      label: "CI pipeline",
      passed: hasCi(paths),
      points: 15,
      tip: "Add GitHub Actions under .github/workflows/.",
    },
    {
      label: ".env.example",
      passed: hasEnvExample(paths),
      points: 10,
      tip: "Document required env vars in .env.example.",
    },
    {
      label: "Reasonable size",
      passed: fileCount < 500,
      points: 15,
      tip: "Large repos are harder to maintain and onboard.",
    },
    {
      label: "License",
      passed: hasLicense(paths),
      points: 15,
      tip: "Add a LICENSE file for open source clarity.",
    },
  ];

  const score = checks
    .filter((check) => check.passed)
    .reduce((total, check) => total + check.points, 0);

  return {
    score,
    maxScore: 100,
    checks,
  };
}

export function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function getScoreLabel(score: number) {
  if (score >= 80) return "Healthy";
  if (score >= 50) return "Needs work";
  return "At risk";
}
