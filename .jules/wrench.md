# Wrench's Journal - Critical Learnings

## 2025-05-14 - Directory Enforcement and Parallel Output

Learning: Running orchestration scripts from the wrong directory can lead to subtle path resolution errors in child processes, especially when using relative paths or `npx`.
Action: Always verify the current working directory at the start of the script and provide clear instructions on how to run it correctly.

Learning: Parallel execution of multiple gates with `stdio: 'inherit'` leads to interleaved, confusing output that makes debugging failures difficult.
Action: Implement a `--serial` (or `--sequential`) flag to allow developers to see clean, ordered output when investigating failures.

Learning: In CI/CD or long quality gate runs, a final summary table is essential to quickly identify which gate failed, as the failure might be buried far up in the logs.
Action: Always print a consolidated summary of all tasks (passed and failed) at the end of the script execution.
