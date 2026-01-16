# Tools

This directory contains helper scripts for local development and quality assurance.

## run-quality-gates.ps1

This PowerShell script automates running the full suite of quality gates for the `app/` project. It includes running linting, formatting checks, type checks, unit tests, E2E tests, formpack validation, and the production build.

### Parameters

The script accepts several parameters to customize its behavior:

| Parameter           | Description                                                 | Default                      |
| ------------------- | ----------------------------------------------------------- | ---------------------------- |
| `-AppSubdir`        | Subdirectory containing the target `package.json`           | "app"                        |
| `-UnitCommand`      | npm script for unit tests (e.g., "test:unit")               | "npm test"                   |
| `-E2eCommand`       | npm script for E2E tests                                    | "test:e2e"                   |
| `-E2eRuns`          | How many times to run E2E tests (find flakiness)                            | 3                            |
| `-DockerImagePort`  | Port for Docker image smoke test                            | 18080                        |
| `-ComposePort`      | Port for Docker Compose smoke test                          | 8080                         |
| `-SkipComposeChecks`| Skip `docker compose` checks                                | (not set)                    |
| `-SkipDockerChecks` | Skip `docker build` and `docker run` checks                 | (not set)                    |
| `-KeepDockerRunning`| If set, container keeps running after checks                | (not set)                    |
