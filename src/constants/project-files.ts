/**
 * Common project file names used for init and project detection.
 */
export const PROJECT_FILE = {
  PACKAGE_JSON: "package.json",
  TSCONFIG_JSON: "tsconfig.json",
  CARGO_TOML: "Cargo.toml",
  GO_MOD: "go.mod",
  PYPROJECT_TOML: "pyproject.toml",
  REQUIREMENTS_TXT: "requirements.txt",
  MAKEFILE: "Makefile",
  DOCKERFILE: "Dockerfile",
  DOCKER_COMPOSE_YML: "docker-compose.yml",
  DOCKER_COMPOSE_YAML: "docker-compose.yaml",
  TOADSTOOL_MD: "TOADSTOOL.md",
  ENV_SAMPLE: ".env.sample",
} as const;

export type ProjectFile = (typeof PROJECT_FILE)[keyof typeof PROJECT_FILE];

/** Files used to detect project type in init-generator. */
export const IMPORTANT_PROJECT_FILES: ProjectFile[] = [
  PROJECT_FILE.PACKAGE_JSON,
  PROJECT_FILE.TSCONFIG_JSON,
  PROJECT_FILE.CARGO_TOML,
  PROJECT_FILE.GO_MOD,
  PROJECT_FILE.PYPROJECT_TOML,
  PROJECT_FILE.REQUIREMENTS_TXT,
  PROJECT_FILE.MAKEFILE,
  PROJECT_FILE.DOCKERFILE,
  PROJECT_FILE.DOCKER_COMPOSE_YML,
  PROJECT_FILE.DOCKER_COMPOSE_YAML,
];

export const {
  PACKAGE_JSON,
  TSCONFIG_JSON,
  CARGO_TOML,
  GO_MOD,
  PYPROJECT_TOML,
  REQUIREMENTS_TXT,
  MAKEFILE,
  DOCKERFILE,
  DOCKER_COMPOSE_YML,
  DOCKER_COMPOSE_YAML,
  TOADSTOOL_MD,
  ENV_SAMPLE,
} = PROJECT_FILE;
