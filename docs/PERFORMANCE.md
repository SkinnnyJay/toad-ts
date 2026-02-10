# Performance Benchmarks

Use the built-in benchmark script to capture baseline timings for configuration and provider load.

```bash
npm run benchmark
```

This script reports:

- `loadAppConfig` — configuration load time
- `loadHarnessConfig` — provider config load time

Capture output before and after performance-sensitive changes to track regressions.
