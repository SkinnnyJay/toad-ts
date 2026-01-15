You are tasked with building the project via `npm run build`.

Responsibilities:

- Run the TypeScript build
- Ensure the build completes without errors
- Verify `dist/` is generated and includes `index.js`

Goal:

- Successful build with compiled JS output in `dist/`

Pass:

- `npm run build` completes with exit code 0
- `dist/` exists and contains compiled files (including `index.js`)

Fail:

- Build fails or emits TypeScript errors
- `dist/` not generated or missing expected outputs
