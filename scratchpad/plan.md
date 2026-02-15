# Current Execution Plan

## Phase
- Execution hardening after PLAN3 completion.

## Objectives
- Keep PLAN3 tasks at 100% completion with regression-resistant coverage.
- Continue literal-hygiene and fallback-behavior hardening where small gaps remain.
- Preserve green quality gates after each meaningful change.

## Active Workstream
1. Strengthen fallback and feature-flag behavior tests around harness/config loading.
2. Expand focused unit coverage for server and workflow edge cases.
3. Keep strict literal checks green.

## Latest Completed Increment
- Expanded known-route double-trailing parity:
  - API/core/server classifier unit suites now explicitly cover known-route
    `//`, `//?query`, and `//#hash` variants.
  - headless-server integration suite now locks these double-trailing
    semantics end-to-end for:
    - known API routes with unsupported methods (`405`)
    - known non-API routes with unsupported methods (`405`)
    - protected known non-API routes (unauthenticated `401`, authenticated
      method semantics).
- Expanded known-route method normalization parity:
  - API/core/server classifier unit suites now explicitly cover lowercase and
    whitespace-padded HTTP methods for known routes, asserting both allowed and
    method-not-allowed outcomes remain stable.
- Expanded blank-session pathname normalization parity:
  - pathname-normalization unit suite now explicitly covers plain and
    whitespace-padded `/sessions//`, `/sessions//?scope=all`,
    `/sessions//#summary` normalization to `/sessions`.
- Expanded padded blank-session base method parity:
  - core-route classifier unit suite now explicitly covers whitespace-padded
    `/sessions//`, `/sessions//?scope=all`, `/sessions//#summary` variants with
    normalized method semantics:
    - GET => `METHOD_NOT_ALLOWED`
    - POST => `UNHANDLED`
  - server-route classifier unit suite now explicitly confirms same semantics
    with `CORE_ROUTE_CLASSIFIER` attribution.
- Expanded blank-session double-trailing integration parity:
  - headless-server integration suite now explicitly covers `/sessions//`,
    `/sessions//?scope=all`, and `/sessions//#summary` for:
    - unprotected known-route method semantics (GET => 405)
    - protected auth-before-method semantics (unauthenticated => 401,
      authenticated => 405).
- Expanded blank-session base normalization parity:
  - session-route-path unit suite now explicitly asserts whitespace-padded
    blank-session base variants are rejected (`null`):
    ` /sessions// `, ` /sessions//?scope=all `, ` /sessions//#summary `.
  - core-route classifier unit suite now explicitly asserts blank-session base
    double-trailing variants normalize to `/sessions` method semantics:
    - GET => `METHOD_NOT_ALLOWED`
    - POST => `UNHANDLED`
  - server-route classifier unit suite now explicitly asserts the same
    normalized behavior with core handler attribution.
- Expanded unknown/malformed route method-normalization parity:
  - api-routes unit suite now explicitly verifies lowercase/whitespace-padded
    methods classify unknown/malformed API paths as `NOT_FOUND`.
  - core-route classifier unit suite now explicitly verifies
    lowercase/whitespace-padded methods classify unknown/malformed core/session
    paths as `UNHANDLED`.
  - server-route classifier unit suite now explicitly verifies
    lowercase/whitespace-padded methods preserve API vs core unhandled scope
    decisions for unknown/malformed paths.
- Expanded session-route parser whitespace-padded malformed parity:
  - session-route-path unit suite now explicitly covers whitespace-padded
    missing-action double-trailing variants as valid:
    ` /sessions/session-1//?scope=all `, ` /sessions/session-1//#summary `.
  - same suite now explicitly covers whitespace-padded blank-session malformed
    variants as invalid (`null`):
    ` /sessions//prompt//?tail=1 `, ` /sessions//prompt//#summary `,
    ` /sessions//messages//?tail=1 `, ` /sessions//messages//#summary `.
- Expanded malformed API double-segment whitespace-padded parity:
  - api-routes unit suite now explicitly covers whitespace-padded malformed
    double-segment API variants with GET/POST parity:
    ` /api//config `, ` /api//config/?scope=all `,
    ` /api//config//#summary `, ` /api/sessions//messages `,
    ` /api/sessions//messages/?scope=all `,
    ` /api/sessions//messages//#summary `.
  - server-route classifier suite now explicitly confirms those forms are
    API-scoped `UNHANDLED`.
  - pathname-normalization suite now explicitly confirms those forms preserve
    malformed inner separators while normalizing suffixes.
- Expanded API-root whitespace-padded malformed parity:
  - api-routes unit suite now explicitly covers whitespace-padded API-root
    variants with GET/POST parity:
    ` /api `, ` /api?scope=all `, ` /api#summary `, ` /api/ `,
    ` /api/?scope=all `, ` /api/#summary `, ` /api// `,
    ` /api//?scope=all `, ` /api//#summary `.
  - server-route classifier suite now explicitly confirms those forms are
    API-scoped `UNHANDLED`.
  - pathname-normalization suite now explicitly confirms those forms normalize
    to `/api`.
- Expanded unknown-core whitespace-padded malformed parity:
  - core-route classifier unit suite now explicitly covers whitespace-padded
    unknown-core and malformed session variants with GET/POST parity:
    ` /unknown-endpoint//?scope=all `, ` /unknown-endpoint//#summary `,
    ` /sessions/session-1//#latest `, ` /sessions/session-1//?view=full `,
    ` /sessions//prompt//#summary `, ` /sessions//messages//?tail=1 `.
  - server-route classifier unit suite now explicitly ensures those same
    whitespace-padded variants classify as core-scoped unhandled.
- Expanded unknown-api whitespace-padded malformed parity:
  - api-routes unit suite now explicitly covers whitespace-padded trailing and
    double-trailing unknown API paths with GET/POST parity:
    ` /api/does-not-exist/ `, ` /api/does-not-exist// `,
    ` /api/does-not-exist//?view=compact `,
    ` /api/does-not-exist//#summary `.
  - server-route classifier suite now explicitly covers whitespace-padded
    trailing and double-trailing unknown API paths with GET/POST parity:
    ` /api/unknown/ `, ` /api/unknown// `,
    ` /api/unknown//?scope=all `,
    ` /api/unknown//#summary `.
- Expanded pathname normalization malformed parity:
  - pathname-normalization unit suite now explicitly covers trailing and
    double-trailing normalization for:
    `/api/unknown`, `/unknown-endpoint`, `/sessions/session-1`, and
    malformed blank-segment `/sessions//prompt` forms with query/hash suffixes.
- Expanded unknown-api classifier trailing parity:
  - api-routes unit suite now includes explicit POST/GET assertions for
    unknown API-path trailing and double-trailing forms:
    `/api/does-not-exist/`, `/api/does-not-exist//`,
    `/api/does-not-exist//?view=compact`,
    `/api/does-not-exist//#summary`.
  - server-route classifier suite now includes explicit POST/GET assertions for
    unknown API route forms:
    `/api/unknown`, `/api/unknown?scope=all`, `/api/unknown#summary`,
    `/api/unknown/`, `/api/unknown/?scope=all`, `/api/unknown/#summary`,
    `/api/unknown//`, `/api/unknown//?scope=all`, `/api/unknown//#summary`.
- Expanded `/api/unknown` trailing integration parity:
  - headless-server integration suite now includes explicit unauthenticated and
    authenticated POST assertions for:
    `/api/unknown/`, `/api/unknown/?scope=all`, `/api/unknown/#summary`,
    `/api/unknown//`, `/api/unknown//?scope=all`, `/api/unknown//#summary`.
- Expanded API unknown-segment parity hardening:
  - headless-server integration suite now includes explicit unauthenticated and
    authenticated POST assertions for `/api/unknown`, `/api/unknown?scope=all`,
    and `/api/unknown#summary`.
  - api-routes classifier unit suite now includes explicit POST/GET parity for
    `/api/does-not-exist` base/padded/query/hash/trailing-query/trailing-hash
    forms.
  - server-route classifier unit suite now includes explicit POST/GET parity
    for `/api/unknown` ownership semantics.
- Expanded API-root method parity hardening:
  - headless-server integration suite now includes explicit unauthenticated and
    authenticated POST assertions for `/api` unknown variants across:
    base/query/hash, trailing query/hash, and double-trailing query/hash forms.
  - api-routes classifier unit suite now includes explicit POST/GET parity for
    `/api`, `/api?scope=all`, `/api#summary`, `/api/?scope=all`,
    `/api/#summary`, `/api//`, `/api//?scope=all`, `/api//#summary`.
  - server-route classifier unit suite now includes explicit POST/GET parity
    assertions for the same API-root variant set.
- Expanded unknown single-segment integration parity:
  - headless-server integration suite now includes explicit unauthenticated and
    authenticated POST assertions for unknown single-segment variants across:
    base/trailing, direct/trailing query, direct/trailing hash, and
    double-trailing base/query/hash forms.
- Expanded unknown single-segment trailing parity:
  - core-route classifier unit suite now includes explicit unknown single-segment
    POST/GET parity assertions for trailing base/query/hash and double-trailing
    query/hash variants (`/unknown/`, `/unknown/?scope=all`, `/unknown/#summary`,
    `/unknown//`, `/unknown//?scope=all`, `/unknown//#summary`).
  - server-route classifier unit suite now includes dedicated unknown
    single-segment trailing+double-trailing POST/GET parity assertions.
- Expanded root-unknown POST/GET parity hardening:
  - headless-server integration suite now includes explicit unauthenticated and
    authenticated POST assertions for root unknown variants:
    `/`, `/?scope=all`, and `/#summary`.
  - core-route classifier unit suite now includes explicit POST/GET assertions
    for root unknown base/query/hash variants.
  - server-route classifier unit suite now includes dedicated root unknown
    POST/GET parity assertions for base/query/hash ownership semantics.
- Expanded unknown-endpoint trailing-variant classifier parity:
  - core-route classifier unit suite now includes explicit POST/GET assertions
    for `/unknown-endpoint/`, `/unknown-endpoint/?scope=all`, and
    `/unknown-endpoint/#summary`.
  - server-route classifier unit suite now includes a dedicated unknown-endpoint
    trailing-variant test with explicit POST/GET parity assertions for the same
    path set.
- Expanded unknown-core integration POST parity:
  - headless-server integration suite now includes explicit unauthenticated and
    authenticated POST assertions for unknown non-session core route variants:
    base, trailing, direct query/hash, and double-trailing query/hash forms.
- Expanded unknown-core classifier POST/GET method parity:
  - core-route classifier unit suite now includes explicit POST parity for
    unknown base/query/hash and double-trailing malformed variants.
  - server-route classifier unit suite now includes explicit POST/GET parity
    assertions for unknown base/query/hash and double-trailing variants with
    core classifier ownership.
- Expanded missing-action session integration POST parity:
  - headless-server integration suite now includes explicit unauthenticated and
    authenticated POST assertions for missing-action session route variants:
    base, trailing, direct query/hash, and double-trailing query/hash forms.
- Expanded missing-action session classifier method parity:
  - core-route classifier unit suite now includes explicit missing-action
    POST/GET assertions for base, trailing, direct query/hash, and
    double-trailing suffix variants.
  - server-route classifier unit suite now includes explicit base/trailing and
    direct-hash POST/GET parity assertions for missing-action session routes.
- Expanded blank-session prompt trailing-path POST/GET classifier parity:
  - core-route classifier unit suite now includes explicit POST/GET assertions
    for `/sessions//prompt/` malformed prompt trailing-path form.
  - server-route classifier unit suite now includes explicit POST assertion for
    `/sessions//prompt/` alongside existing GET assertion to lock ownership
    parity.
- Expanded blank-session prompt trailing-query GET-classifier parity:
  - core-route classifier unit suite now includes explicit GET assertion for
    `/sessions//prompt/?tail=1` malformed prompt trailing-query form.
  - server-route classifier unit suite now includes explicit POST/GET
    assertions for `/sessions//prompt/?tail=1` malformed prompt
    trailing-query ownership parity.
- Expanded blank-session messages direct-segment parse-route parity:
  - session-route-path unit suite now includes explicit null-parse assertions
    for blank/whitespace session-id malformed messages routes:
    `/sessions//messages` and `/sessions/   /messages`.
- Expanded blank-session root-segment parse-route parity:
  - session-route-path unit suite now includes explicit null-parse assertions
    for blank-session root-segment malformed suffix variants:
    `/sessions//`, `/sessions//?scope=all`, `/sessions//#summary`.
- Expanded blank-session trailing-suffix parse-route parity:
  - session-route-path unit suite now includes explicit null-parse assertions
    for blank-session prompt/messages malformed trailing variants:
    `/sessions//prompt/`, `/sessions//prompt/?tail=1`,
    `/sessions//prompt/#summary`, `/sessions//messages/`,
    `/sessions//messages/?tail=1`, `/sessions//messages/#summary`.
- Expanded blank-session messages malformed POST-method parity:
  - unknown-route auth-order integration coverage now includes explicit POST
    assertions for blank-session messages malformed base/query/hash/trailing/
    double-trailing variants.
  - core/server route classifier unit suites now include explicit POST-method
    assertions for blank-session messages malformed variants, including
    trailing-hash and double-trailing suffix forms.
- Expanded blank-session prompt malformed hash GET-method parity:
  - unknown-route auth-order integration coverage now includes explicit GET
    assertions for `/sessions//prompt#summary`,
    `/sessions//prompt/#summary`, and `/sessions//prompt//#summary`.
  - core/server route classifier unit suites now include explicit GET-method
    assertions for the same blank-session prompt hash variants.
- Expanded blank-session prompt malformed direct/trailing-query GET-method parity:
  - unknown-route auth-order integration coverage now includes explicit GET
    assertions for `/sessions//prompt?tail=1` and
    `/sessions//prompt/?tail=1`.
  - core/server route classifier unit suites now include explicit GET-method
    assertions for `/sessions//prompt?tail=1` and
    `/sessions//prompt//?tail=1` malformed prompt query forms.
- Expanded blank-session prompt malformed base/trailing GET-method parity:
  - unknown-route auth-order integration coverage now includes explicit GET
    assertions for `/sessions//prompt` and `/sessions//prompt/`.
  - core/server route classifier unit suites now include explicit GET-method
    assertions for the same blank-session prompt base and trailing variants.
- Expanded malformed-api and malformed-api-session base/trailing
  GET-method parity:
  - unknown-route auth-order integration coverage now includes explicit GET
    assertions for `/api//config`, `/api//config/`,
    `/api/sessions//messages`, and `/api/sessions//messages/`.
  - api/server route classifier unit suites now include explicit GET-method
    assertions for the same malformed base and trailing variants.
- Expanded malformed-api and malformed-api-session query/trailing-query
  GET-method parity:
  - unknown-route auth-order integration coverage now includes explicit GET
    assertions for `/api//config?scope=all`, `/api//config/?scope=all`,
    `/api/sessions//messages?scope=all`, and
    `/api/sessions//messages/?scope=all`.
  - api/server route classifier unit suites now include explicit GET-method
    assertions for the same malformed direct-query and trailing-query
    variants.
- Expanded malformed-api and malformed-api-session hash/trailing-hash
  GET-method parity:
  - unknown-route auth-order integration coverage now includes explicit GET
    assertions for `/api//config#summary`, `/api//config/#summary`,
    `/api/sessions//messages#summary`, and
    `/api/sessions//messages/#summary`.
  - api/server route classifier unit suites now include explicit GET-method
    assertions for the same malformed direct-hash and trailing-hash variants.
- Expanded malformed-api and malformed-api-session double-trailing-hash
  GET-method parity:
  - unknown-route auth-order integration coverage now includes explicit GET
    assertions for `/api//config//#summary` and
    `/api/sessions//messages//#summary`.
  - api/server route classifier unit suites now include explicit GET-method
    assertions for the same malformed double-trailing-hash variants.
- Expanded malformed-api-session double-trailing-query GET-method parity:
  - unknown-route auth-order integration coverage now includes explicit GET
    assertions for `/api/sessions//messages//?scope=all`.
- Expanded malformed-api double-trailing-query GET-method parity:
  - unknown-route auth-order integration coverage now includes explicit GET
    assertions for `/api//config//?scope=all`.
- Expanded malformed-api-session double-trailing-query method parity:
  - api/server route classifier unit suites now include explicit GET-method
    assertions for `/api/sessions//messages//?scope=all`.
- Expanded malformed-api-session double-trailing-query parity:
  - unknown-route auth-order integration coverage now includes
    `/api/sessions//messages//?scope=all`.
  - api/server route classifier unit suites now include malformed API-session
    double-trailing-query parity checks.
- Expanded malformed-api double-trailing-query parity:
  - unknown-route auth-order integration coverage now includes
    `/api//config//?scope=all`.
  - api/server route classifier unit suites now include malformed API
    double-trailing-query parity checks.
- Expanded api-root double-trailing unknown parity:
  - unknown-route auth-order integration coverage now includes
    `/api//`, `/api//?scope=all`, and `/api//#summary`.
  - api/server route classifier unit suites now include API-root
    double-trailing base/query/hash parity checks.
- Expanded missing-action double-trailing parity:
  - unknown-route auth-order integration coverage now includes
    `/sessions/session-1//`, `/sessions/session-1//?scope=all`, and
    `/sessions/session-1//#summary`.
  - core/server classifier and session-route-path unit suites now include
    missing-action double-trailing base/query/hash malformed-path parity
    checks.
- Expanded blank-session double-trailing-query parity:
  - unknown-route auth-order integration coverage now includes
    `/sessions//prompt//?tail=1` and `/sessions//messages//?tail=1`.
  - core/server classifier and session-route-path unit suites now include
    double-trailing-query blank-session malformed-path parity checks.
- Expanded blank-session double-trailing unknown parity:
  - unknown-route auth-order integration coverage now includes
    `/sessions//prompt//`, `/sessions//prompt//#summary`,
    `/sessions//messages//`, and `/sessions//messages//#summary`.
  - core/server classifier and session-route-path unit suites now include
    double-trailing blank-session malformed-path parity checks.
- Expanded malformed-api-session double-trailing unknown parity:
  - unknown-route auth-order integration coverage now includes
    `/api/sessions//messages//` and `/api/sessions//messages//#summary`.
  - api/server route classifier unit suites now include malformed API-session
    double-trailing and double-trailing-hash/query parity forms.
- Expanded malformed-api double-trailing unknown parity:
  - unknown-route auth-order integration coverage now includes
    `/api//config//` and `/api//config//#summary` with canonical
    unauthenticated/authenticated ordering.
  - api/server route classifier unit suites now include
    `/api//config//` and `/api//config//#summary` malformed API parity.
- Expanded unknown-core double-trailing hash parity:
  - unknown-route auth-order integration coverage now includes
    `/unknown-endpoint//#summary` in unauthenticated/authenticated flows.
  - core/server route classifier unit suites now include
    `/unknown-endpoint//#summary` as core-unhandled parity.
- Expanded unknown-core double-trailing classifier parity:
  - core/server route classifier unit suites now include
    `/unknown-endpoint//` and `/unknown-endpoint//?scope=all`.
  - locks canonical core-unhandled classification with
    `CORE_ROUTE_CLASSIFIER` ownership.
- Expanded unknown-route double-trailing auth-order coverage:
  - unknown-route auth-before-not-found integration test now includes
    double-trailing core unknown path variants:
    - `/unknown-endpoint//`
    - `/unknown-endpoint//?scope=all`
  - locks canonical ordering semantics:
    - unauthenticated `401` + challenge
    - authenticated `404` + `NOT_FOUND`.
- Expanded unknown-root auth-order parity coverage:
  - unknown-route auth-before-not-found integration test now includes root path
    variants (`/`, `/?query`, `/#hash`) under password protection.
  - locks canonical ordering semantics:
    - unauthenticated `401` + challenge
    - authenticated `404` + `NOT_FOUND`.
- Expanded parsing-log suffix-only root normalization coverage:
  - request-error-normalization unit tests now include parsing-log assertion
    ensuring suffix-only request paths normalize to root pathname (`/`) in
    logged metadata.
- Expanded suffix-only pathname root normalization coverage:
  - pathname-normalization unit tests now explicitly lock blank/suffix-only
    path forms (`""`, `?query`, `#hash`) to root normalization.
  - request-error-normalization unit tests now explicitly lock validation-log
    pathname normalization of suffix-only request paths to `/`.
- Expanded malformed API-session trailing-query classifier parity:
  - api-routes and server-route classifier unit suites now explicitly lock
    `/api/sessions//messages/?scope=all` malformed trailing-query behavior with
    canonical API classifier ownership.
- Expanded request-url comma-separated array candidate coverage:
  - request-url unit tests now include comma-separated host candidate parsing
    assertions inside host-header array entries for:
    - invalid->valid fallback selection
    - all-invalid candidate rejection (`null`).
- Expanded request-validation malformed-path logging parity coverage:
  - request-error-normalization unit tests now include request-validation log
    normalization assertion for malformed combined-suffix path forms,
    preserving inner separators while trimming suffix metadata.
- Expanded request-url host-array fallback coverage:
  - request-url unit tests now include host-header array fallback assertions
    for:
    - mixed invalid/valid candidates (invalid hash metadata candidate followed
      by valid host)
    - all-invalid array candidates returning `null`.
- Expanded malformed-path normalization logging parity coverage:
  - pathname-normalization unit tests now lock malformed inner-separator
    preservation while stripping suffix/trailing segments.
  - request-error-normalization unit tests now lock parsing-failure logged
    path normalization for malformed combined suffix API-session paths.
- Expanded unknown-route hash parity classifier coverage:
  - core-route classifier unit tests now explicitly lock unknown endpoint
    direct query/hash unhandled behavior.
  - server-route classifier unit tests now explicitly lock malformed
    API-session hash/trailing-hash forms as API-scoped unhandled with correct
    classifier ownership.
- Expanded request-url host candidate fallback hardening:
  - request-url unit tests now include candidate-list fallback assertions for
    first-candidate invalid forms:
    - hash metadata host candidate (`example.com#summary`)
    - userinfo host candidate (`user@example.com`)
    with valid-candidate recovery.
  - added all-invalid candidate-list assertion returning `null`.
- Expanded session-route-path malformed suffix parsing coverage:
  - `parseSessionRoutePath` unit tests now include:
    - missing-action direct suffix parsing (`/sessions/:id?query`,
      `/sessions/:id#hash`) -> `{sessionId, action: undefined}`
    - malformed blank-session suffix rejection (`/sessions//prompt...`,
      `/sessions//messages...`) -> `null`.
- Expanded malformed-route unit suffix parity coverage:
  - api/core/server-route classifier unit suites now include additional
    malformed blank-session and malformed API-session suffix variants:
    - `/sessions//prompt` and `/sessions//messages` (base/query/hash/trailing)
    - `/api/sessions//messages` (query/hash/trailing-hash).
  - locks canonical classification expectations:
    - core malformed session forms -> `UNHANDLED` / `CORE_ROUTE_CLASSIFIER`
    - malformed API-session forms -> `NOT_FOUND` /
      `API_ROUTE_CLASSIFIER`.
- Expanded server-route unknown direct-query classifier coverage:
  - server-route classifier unit tests now include direct-query unhandled
    classification assertions for:
    - `/unknown-endpoint?scope=all`
    - `/sessions/:id?view=full`
    - `/api/sessions//messages?scope=all`
    - `/sessions//prompt?tail=1`.
  - locks classifier ownership guarantees:
    - core unknown and malformed session paths -> `CORE_ROUTE_CLASSIFIER`
    - malformed API session path -> `API_ROUTE_CLASSIFIER`.
- Expanded unknown-route direct-query auth-order coverage:
  - password-protected unknown-route ordering integration test
    (`applies auth checks before not-found semantics on unknown routes`)
    now includes direct-query non-trailing variants for:
    - core unknown path (`/unknown-endpoint?scope=all`)
    - malformed API path (`/api//config?scope=all`)
    - malformed API session path (`/api/sessions//messages?scope=all`)
    - missing-action session path (`/sessions/:id?scope=all`)
    - blank-session prompt path (`/sessions//prompt?tail=1`).
  - locks canonical auth-first semantics:
    - unauthenticated `401` + challenge
    - authenticated `404` (`NOT_FOUND` or `UNKNOWN_ENDPOINT` as appropriate)
    across these direct-query unknown-route variants.
- Expanded unknown-route blank-session hash auth-order coverage:
  - password-protected unknown-route ordering integration test
    (`applies auth checks before not-found semantics on unknown routes`)
    now includes hash and trailing-hash variants for:
    - blank-session prompt path (`/sessions//prompt`, `/sessions//prompt/`)
    - blank-session messages path (`/sessions//messages`,
      `/sessions//messages/`).
  - locks canonical auth-first semantics:
    - unauthenticated `401` + challenge
    - authenticated `404` (`UNKNOWN_ENDPOINT`)
    across these hash-bearing unknown-route variants.
- Expanded unknown-route malformed/missing-action hash auth-order coverage:
  - password-protected unknown-route ordering integration test
    (`applies auth checks before not-found semantics on unknown routes`)
    now includes hash and trailing-hash variants for:
    - malformed API session path (`/api/sessions//messages`,
      `/api/sessions//messages/`)
    - missing-action session path (`/sessions/:id`, `/sessions/:id/`).
  - locks canonical auth-first semantics:
    - unauthenticated `401` + challenge
    - authenticated `404` (`NOT_FOUND` or `UNKNOWN_ENDPOINT` as appropriate)
    across these hash-bearing unknown-route variants.
- Expanded protected-API session hash auth-order coverage:
  - password-protected API auth-before-method integration test
    (`applies auth checks before method-not-allowed semantics on api routes`)
    now includes hash and trailing-hash variants for:
    - `/api/sessions/:id`
    - `/api/sessions/:id/messages`.
  - locks canonical auth-first semantics:
    - unauthenticated `401` + challenge
    - authenticated `405` + `METHOD_NOT_ALLOWED`
    across hash-bearing and combined trailing-slash+hash API session routes.
- Expanded unknown-route hash auth-order coverage:
  - password-protected unknown-route ordering integration test
    (`applies auth checks before not-found semantics on unknown routes`)
    now includes hash and trailing-hash variants for:
    - API unknown root (`/api`, `/api/`)
    - core unknown endpoint (`/unknown-endpoint`, `/unknown-endpoint/`)
    - malformed API path (`/api//config`, `/api//config/`)
    - session unknown path (`/sessions/:id/unsupported`,
      `/sessions/:id/unsupported/`).
  - locks canonical auth-first semantics:
    - unauthenticated `401` + challenge
    - authenticated `404` (`NOT_FOUND` or `UNKNOWN_ENDPOINT` as appropriate)
    across these hash-bearing unknown-route variants.
- Expanded protected non-API hash auth-order coverage:
  - password-protected non-API auth-before-method integration test
    (`applies auth checks before method semantics on non-api protected routes`)
    now includes hash and trailing-hash variants for:
    - `/sessions`
    - `/sessions/:id/prompt`
    - `/sessions/:id/messages`.
  - locks canonical pre-auth `401` + auth-challenge and authenticated `405`
    ordering semantics across hash-bearing and combined trailing-slash+hash
    non-API method-guard paths.
- Expanded integration non-API hash method coverage:
  - headless-server integration test
    `returns method not allowed for known non-api routes with unsupported methods`
    now includes hash and trailing-hash variants for:
    - `/health`
    - `/sessions`
    - `/sessions/:id/prompt`
    - `/sessions/:id/messages`.
  - locks canonical `405` + `METHOD_NOT_ALLOWED` semantics across hash-bearing
    and combined trailing-slash+hash forms for known non-API method-guard
    routes.
- Expanded health hash auth-bypass coverage:
  - password-protected health-route integration test
    (`keeps health-route auth bypass semantics under password protection`)
    now includes:
    - `GET /health#summary`
    - `GET /health/#summary`
    - `POST /health#summary`
    - `POST /health/#summary`.
  - locks canonical auth-bypass semantics (`200` for GET, `405` without
    auth challenge for POST) across hash-bearing and combined trailing-hash
    health-route variants.
- Expanded protected-API hash auth-order coverage:
  - password-protected API auth-before-method integration test
    (`applies auth checks before method-not-allowed semantics on api routes`)
    now includes hash and trailing-hash variants for:
    - `/api/config` (unauthenticated `401`, authenticated `405`)
    - `/api/tui/execute-command` (unauthenticated `401`, authenticated `405`).
  - locks auth-before-method ordering semantics for hash-bearing and
    combined trailing-slash+hash normalized API method-guard paths.
- Expanded integration API hash method coverage:
  - headless-server integration test
    `returns method not allowed for known API routes with unsupported methods`
    now includes hash and trailing-hash variants for:
    - `/api/config`
    - `/api/tui/execute-command`
    - `/api/sessions/:id`
    - `/api/sessions/:id/messages`.
  - locks canonical `405` + `METHOD_NOT_ALLOWED` response semantics across
    hash-bearing and combined trailing-slash+hash API method-guard paths in
    end-to-end server behavior.
- Expanded request-error pathname combined coverage:
  - request-error-normalization unit tests now include parsing-failure log
    normalization for combined trailing-slash + hash + query pathname form
    (`/api/config/#summary?view=compact`).
  - locks canonical normalized pathname (`/api/config`) plus normalized
    handler and method metadata in parsing-failure log payloads for combined
    suffix path variants.
- Expanded request-url hash parsing coverage:
  - request-url unit tests now include:
    - request path hash parsing (`/api/files/search#latest`)
    - whitespace-wrapped trailing-slash hash path parsing
      (`/api/files/search/#latest`)
    - host-header hash metadata rejection (`example.com#summary`).
  - locks canonical request URL parsing behavior for hash-bearing paths while
    preserving host validation strictness against hash-bearing host values.
- Expanded session-route-path combined suffix coverage:
  - session-route-path unit tests now include combined trailing-slash suffix
    forms for:
    - `/sessions/:id/prompt/#latest`
    - `/sessions/:id/messages/?limit=10`
    - `/sessions/:id/#summary`
  - locks canonical parsed `{sessionId, action}` extraction behavior for prompt,
    messages, and missing-action session-id forms under combined normalized
    query/hash path variants.
- Expanded api-route execute/session hash-match coverage:
  - api-routes unit tests now include combined trailing-slash + hash forms for:
    - `matchRoute("POST", "/api/tui/execute-command/#summary")`
    - `matchRoute("GET", "/api/sessions/:id/messages/#latest")`
    - `classifyApiRoute("POST", "/api/tui/execute-command/#summary")` -> `MATCH`
    - `classifyApiRoute("GET", "/api/sessions/:id/messages/#latest")` -> `MATCH`
    - `classifyApiRoute("GET", "/api/tui/execute-command/#summary")`
      -> `METHOD_NOT_ALLOWED` + `API_ROUTE_CLASSIFIER`.
  - closes remaining trailing-hash combined coverage gap for execute-command
    and parameterized session messages match/method semantics.
- Expanded sessions trailing-hash method-guard coverage:
  - core-route classifier unit tests now include
    `GET /sessions/#summary` and lock canonical `METHOD_NOT_ALLOWED`.
  - server-route classifier unit tests now include
    `GET /sessions/#summary` in trailing-hash core-method guard assertions and
    lock canonical `METHOD_NOT_ALLOWED` + `CORE_ROUTE_CLASSIFIER`.
  - closes remaining combined trailing-slash + hash method-guard gap for the
    sessions collection route across both direct core classifier and
    server-route wrapper classification paths.
- Expanded api-routes trailing-hash combined coverage:
  - api-routes unit tests now include combined trailing-slash + hash forms for:
    - direct route matching
    - matching-route classification (`MATCH`)
    - known-route unsupported-method classification (`METHOD_NOT_ALLOWED`)
    - parameterized unsupported-method normalized form
    - unknown-route classification (`NOT_FOUND`)
    - api-root normalized form (`/api/#summary`) classification (`NOT_FOUND`)
    - malformed double-segment normalized form
      (`/api//config/#summary`) classification (`NOT_FOUND`).
  - locks canonical `API_ROUTE_CLASSIFIER` ownership and decision behavior for
    combined trailing-hash normalized API path variants.
- Expanded server-route core trailing-hash combined coverage:
  - server-route classifier unit tests now include combined
    trailing-slash + hash forms for:
    - `GET /health/#summary` -> `HEALTH_OK`
    - unsupported core methods on
      `/health/#summary`, `/sessions/:id/prompt/#latest`,
      `/sessions/:id/messages/#tail` -> `METHOD_NOT_ALLOWED` +
      `CORE_ROUTE_CLASSIFIER`
    - unknown/missing-action core forms
      `/unknown/#summary`, `/sessions/:id/#latest` -> `UNHANDLED` +
      `CORE_ROUTE_CLASSIFIER`
    - API-scope edge forms `/api/#summary`, `/api//config/#summary`
      -> `UNHANDLED` + `API_ROUTE_CLASSIFIER`.
  - locks canonical server-route classifier kind and handler ownership for
    combined trailing-hash normalized core and scoped API edge-path variants.
- Expanded core-route trailing-hash combined coverage:
  - core-route classifier unit tests now include combined
    trailing-slash + hash forms for:
    - `GET /health/#summary` -> `HEALTH_OK`
    - `POST /health/#summary` -> `METHOD_NOT_ALLOWED`
    - `GET /sessions/:id/prompt/#latest` -> `METHOD_NOT_ALLOWED`
    - `POST /sessions/:id/messages/#tail` -> `METHOD_NOT_ALLOWED`
    - `GET /sessions/:id/#latest` -> `UNHANDLED`.
  - locks canonical core-route classifier decisions across normalized
    combined trailing-hash variants for known and missing-action paths.
- Expanded server-route trailing-hash combined coverage:
  - server-route classifier unit tests now include combined
    trailing-slash + hash forms for `/api/config` in:
    - API match classification (`GET`)
    - API method-not-allowed classification (`POST`).
  - locks canonical API classifier kind and handler ownership for these
    combined normalized hash-suffixed route variants.
- Expanded api-route root trailing-query not-found coverage:
  - api-routes unit tests now include `classifyApiRoute("GET", "/api/?scope=all")`.
  - locks canonical `NOT_FOUND` + `API_ROUTE_CLASSIFIER` decision for direct
    API-route classifier root trailing-query input.
- Expanded core-route health combined-suffix coverage:
  - core-route classifier unit tests now include
    `GET /health/?check=true` combined trailing-slash + query form.
  - locks canonical `HEALTH_OK` decision for combined normalized health route
    input.
- Expanded server-route missing-action combined coverage:
  - server-route classifier unit tests now include missing-action session
    combined trailing-slash+query variants for both GET and POST methods.
  - locks canonical `UNHANDLED` classification with
    `CORE_ROUTE_CLASSIFIER` ownership for those combined normalized
    missing-action path forms.
- Expanded pathname-normalization combined non-root coverage:
  - pathname-normalization unit tests now include non-root combined
    trailing-slash + query/hash + whitespace forms (for example
    `/api/config/?view=...`, `/api/config/#...`, padded combined form).
  - locks canonical normalized output (`/api/config`) for these combined
    non-root path variants.
- Expanded server-route core combined-suffix coverage:
  - server-route classifier unit tests now include combined
    trailing-slash+query forms for core-route method guards:
    - `/health/?check=true` (POST)
    - `/sessions/?scope=all` (GET)
    - `/sessions/:id/prompt/?scope=all` (GET)
    - `/sessions/:id/messages/?scope=all` (POST)
    and unknown-core unhandled path:
    - `/unknown/?scope=all`.
  - locks canonical server-route classification kind + core classifier handler
    ownership for these combined normalized core-route path forms.
- Expanded api-routes combined-suffix unit coverage:
  - api-routes unit tests now include combined trailing-slash+query forms for:
    - direct matchRoute matching
    - known-path method-not-allowed classification
    - parameterized known-path method-not-allowed classification
    - unknown-path not-found classification
    - malformed-path not-found classification.
  - locks classifier handler ownership and decision kind stability for combined
    normalized API route forms.
- Expanded core-route classifier combined-suffix coverage:
  - core-route classifier unit tests now include combined
    trailing-slash+query forms for:
    - health method guard (`POST /health/?check=true`)
    - sessions method guard (`GET /sessions/?scope=all`)
    - prompt/messages method guards with combined suffixes
    - missing-action session unhandled path (`/sessions/:id/?view=full`).
  - locks canonical method-not-allowed/unhandled decisions for these combined
    normalized core-route forms.
- Expanded server-route classifier combined-path coverage:
  - server-route classifier unit tests now include combined
    trailing-slash+query API path forms for:
    - API match classification
    - API method-not-allowed classification
    - API-root unhandled scoping
    - malformed API double-segment unhandled scoping.
  - locks classifier handler ownership and route-kind decisions for those
    combined normalized forms.
- Expanded protected-api execute-command auth-order coverage:
  - protected API auth-before-method integration now includes
    `/api/tui/execute-command` unsupported-method variants for base, trailing,
    query, and trailing+query paths.
  - locks pre-auth `401` + challenge and authenticated `405`
    method-not-allowed semantics for all normalized execute-command variants.
- Expanded non-api method query+trailing coverage:
  - non-API method-not-allowed integration now includes combined
    trailing-slash+query variants for `/health`, `/sessions`,
    `/sessions/:id/prompt`, and `/sessions/:id/messages` unsupported-method
    paths.
  - locks canonical `405` method-not-allowed semantics across combined
    normalized non-API route forms.
- Expanded API method query+trailing coverage:
  - API method-not-allowed integration now includes combined
    trailing-slash+query variants for `/api/config`,
    `/api/tui/execute-command`, `/api/sessions/:id`, and
    `/api/sessions/:id/messages` unsupported-method paths.
  - locks canonical `405` method-not-allowed semantics across combined
    normalized API route forms.
- Expanded protected-api query+trailing auth-order coverage:
  - protected API auth-before-method integration now includes combined
    trailing-slash+query variants for `/api/config`, `/api/sessions/:id`, and
    `/api/sessions/:id/messages` unsupported-method paths.
  - locks pre-auth `401` + challenge and authenticated `405`
    method-not-allowed semantics across combined normalized API route forms.
- Expanded health query auth-bypass coverage:
  - health-route password-protection integration now includes query and
    trailing-slash+query variants for both GET success and unsupported POST
    method semantics.
  - locks no-auth-challenge bypass behavior with canonical `200`/`405`
    responses across combined normalized health route forms.
- Expanded non-api query+trailing auth-order coverage:
  - non-api protected-route auth-order integration now includes combined
    trailing-slash+query variants for sessions, prompt, and messages routes.
  - locks pre-auth `401` + challenge and authenticated `405`
    method-not-allowed semantics across combined normalized route forms.
- Expanded unknown-route query+trailing auth-order coverage:
  - unknown-route auth-order integration now includes combined
    trailing-slash+query variants for API/core/session unknown routes and
    malformed API/session paths.
  - locks pre-auth `401` + challenge and authenticated `404` semantics across
    combined normalized route forms.
- Expanded unknown-route query auth-order coverage:
  - unknown-route auth-order integration now includes query-suffixed variants
    for API and malformed/unknown session paths.
  - locks pre-auth `401` + challenge and authenticated `404` semantics across
    normalized query-suffixed forms.
- Expanded unknown-route trailing auth-order coverage:
  - unknown-route auth-order integration now includes trailing-slash variants
    for API/core unknown paths plus malformed API/session unknown routes.
  - locks pre-auth `401` + challenge and authenticated `404` semantics across
    normalized trailing forms.
- Expanded non-api auth-order trailing route variants coverage:
  - non-api protected-route auth-order integration now explicitly checks
    trailing-slash prompt/messages unauthenticated `401` behavior and trailing
    sessions authenticated `405` behavior.
- Expanded non-api auth-order trailing-slash coverage:
  - non-api protected-route auth-order integration now includes unauthenticated
    trailing-slash variants for `/sessions`, prompt, and messages routes.
  - locks consistent `401` + challenge pre-auth behavior before method
    semantics on normalized trailing-slash paths.
- Expanded non-api auth-order method coverage:
  - password-protected non-api auth-before-method test now covers session
    prompt/messages variants with unauthenticated `401` checks and
    authenticated canonical `405` assertions.
- Expanded unknown-route auth-order malformed session coverage:
  - password-protected unknown-route ordering test now includes malformed
    session variants (`/sessions//prompt`, `/sessions//messages`) with locked
    unauthenticated `401` challenge and authenticated `404` +
    `UNKNOWN_ENDPOINT` semantics.
- Expanded unknown-route auth-order malformed API coverage:
  - password-protected unknown-route ordering test now includes malformed API
    variants (`/api//config`, `/api/sessions//messages`) with explicit
    unauthenticated `401` challenge and authenticated `404` assertions.
- Expanded core-route missing-action normalization coverage:
  - added classifier assertions proving `/sessions/:id` missing-action routes
    remain `UNHANDLED` across trailing-slash and query/hash normalized forms.
- Expanded malformed API scope classifier coverage:
  - added server-route classifier unit assertions proving malformed API
    double-segment paths remain API-scoped unhandled routes
    (`API_ROUTE_CLASSIFIER`) rather than core-scoped fallthrough.
- Expanded unknown-route auth-order coverage for session paths:
  - password-protected not-found ordering test now includes session unknown
    and missing-action route variants with explicit unauthenticated (`401`) and
    authenticated (`404` + `UNKNOWN_ENDPOINT`) assertions.
- Expanded missing-action session-subroute integration coverage:
  - unsupported session-subroute test now locks `/sessions/:id` and
    `/sessions/:id/` behavior (for unsupported GET/POST) to canonical
    `404` + `UNKNOWN_ENDPOINT`.
- Expanded malformed API-route coverage:
  - added unit and integration assertions that double-segment API paths
    (for example `/api//config`, `/api/sessions//messages`) remain not-found
    and do not regress into method-not-allowed semantics.
- Expanded malformed session-subroute integration coverage:
  - added blank-segment route assertions in unsupported session-subroute
    integration tests for:
    `/sessions//prompt`, `/sessions//messages`,
    `/sessions/:id//prompt`, `/sessions/:id//messages`.
  - locked canonical `404` + `UNKNOWN_ENDPOINT` semantics for these malformed
    path shapes.
- Refactored headless-server session route dispatch parsing:
  - session-resource path detection and `parseSessionRoutePath(...)` now run
    once per request and feed both prompt/messages route branches.
  - removed duplicate per-branch session-route parsing while preserving
    response semantics.
- Expanded API auth-order coverage for parameterized routes:
  - password-protected integration test now validates `401` before
    method-semantics and authenticated `405` outcomes for:
    `/api/sessions/:id` and `/api/sessions/:id/messages/`.
- Expanded parameterized API method semantics coverage:
  - added unit assertions that `classifyApiRoute(...)` returns
    method-not-allowed for unsupported methods on parameterized endpoints.
  - added integration assertions proving headless-server `405` behavior for:
    `/api/sessions/:id` and `/api/sessions/:id/messages` including
    trailing-slash variants.
- Consolidated API route classification to single-pass resolution:
  - introduced shared resolver in `api-routes.ts` that determines
    method/path match and known-path status in one loop.
  - removed duplicate route-array scans and redundant pathname normalization
    between `matchRoute(...)` and `classifyApiRoute(...)`.
- Hardened slash-only pathname normalization:
  - `normalizeRoutePathname(...)` now canonicalizes slash-only non-root inputs
    (for example `///`, `////?x=1`) to root `/` instead of empty path output.
  - added focused unit assertions for slash-only query/hash variants.
- Expanded API trailing-slash method semantics coverage:
  - integration now verifies trailing-slash variants of `/api/config` and
    `/api/tui/execute-command` preserve canonical `405`
    method-not-allowed responses for unsupported methods.
- Expanded non-API trailing-slash method semantics coverage:
  - integration now verifies trailing-slash variants of `/sessions`,
    `/sessions/:id/prompt`, and `/sessions/:id/messages` keep canonical
    `405` method-not-allowed responses for unsupported methods.
- Expanded health-route auth-bypass coverage for trailing-slash variants:
  - password-protected integration test now asserts `/health/` retains bypass
    semantics for both successful `GET` and unsupported-method `405` responses
    without auth challenge headers.
- Expanded trailing-slash known-route integration coverage:
  - added headless-server integration assertions proving trailing-slash
    variants for `/health`, `/api/config`, `/sessions`, session prompt, and
    session messages routes execute successfully.
  - locks end-to-end behavior for newly normalized dispatch path semantics.
- Added trailing-slash route normalization hardening:
  - `normalizeRoutePathname(...)` now strips trailing path separators for
    non-root routes while preserving root normalization.
  - headless-server now normalizes parsed pathnames once per request and uses
    normalized values for auth bypass, route classification, and route dispatch.
  - expanded unit/integration coverage for trailing-slash route semantics across
    core/API/session/headless routing paths.
- Added health-route auth-bypass integration coverage hardening:
  - added integration assertions under password protection proving `/health`
    remains auth-bypassed for both `GET` success and unsupported-method `405`
    responses (without auth challenge headers).
- Added auth-before-not-found integration hardening:
  - expanded headless-server integration coverage asserting auth challenge
    precedes not-found semantics on unknown API + core routes when server
    password is enabled.
  - verified authenticated fallback remains canonical `404` + `NOT_FOUND`.
- Expanded headless API-root not-found integration coverage:
  - added integration assertions for `/api`, `/api?scope=all`, and `/api/`
    returning stable `404` + `NOT_FOUND` payloads.
  - coverage locks external behavior while classifier internals evolve.
- Added API-root route scope classification hardening:
  - introduced `SERVER_PATH.API` constant and route-classifier helper to treat
    both `/api` and `/api/*` as API-scoped paths.
  - expanded server-route classifier coverage for `/api` and
    query/hash-suffixed `/api` path handling.
  - re-ran headless-server integration coverage to confirm end-to-end behavior.
- Added server-auth health-path bypass regression coverage:
  - added focused unit test proving `checkServerAuth(...)` does not bypass auth
    based on `req.url` (including `/health`), preserving bypass ownership in
    headless-server routing only.
  - re-ran headless-server integration coverage to validate end-to-end
    semantics remain unchanged.
- Added request-error logging pathname normalization hardening:
  - request parse/validation log context now reuses shared route-pathname
    normalization (trim + query/hash stripping).
  - added focused request-error normalization tests for query/hash logging
    normalization behavior.
- Added shared route-pathname normalization hardening:
  - new `normalizeRoutePathname(...)` strips query/hash suffixes and trims
    whitespace for classifier-facing path inputs.
  - core/API/server route classifiers and session-route parsing now reuse shared
    pathname normalization.
  - added focused unit coverage for helper behavior plus query/hash suffixed
    route classification.
- Expanded classifier padded-path test coverage:
  - added explicit method-not-allowed and not-found coverage for padded API
    pathnames in `classifyApiRoute`.
  - added server-route classifier coverage for padded API known path with wrong
    method.
- Added core/api classifier pathname trim normalization:
  - `classifyCoreRoute`, `matchRoute`, and `classifyApiRoute` now normalize
    surrounding pathname whitespace before route matching.
  - added unit coverage in core and API classifier tests for padded pathnames.
- Added server-route classifier pathname trim hardening:
  - classifier now trims incoming pathname text before core/api route
    classification.
  - added route classifier coverage for API pathnames with surrounding
    whitespace.
- Expanded request-url IPv6 host handling coverage:
  - added direct utility coverage for bracketed IPv6 host parsing and malformed
    bracket rejection.
  - added route-level API file-search coverage for bracketed IPv6 hosts and
    malformed-bracket fallback behavior.
- Added request-parse classification punctuation-insensitivity hardening:
  - canonical parse error classification now tolerates terminal-period
    variation in canonical messages.
  - classification now maps both punctuated and non-punctuated canonical
    variants to stable server error responses.
  - expanded request-error normalization tests for no-period canonical inputs.
- Added request-url host label validation hardening:
  - request URL host candidates now enforce valid IP/hostname label formats in
    addition to existing metadata checks.
  - malformed host labels are rejected and, when possible, parser falls forward
    to later valid host candidates.
  - expanded request-url and API file-search coverage for invalid hostname label
    rejection and candidate fallback.
- Added content-encoding parameter normalization hardening:
  - request-body preflight now treats `identity` content-encoding values with
    RFC parameter suffixes (e.g. `identity;q=1.0`) as supported.
  - mixed identity segments with parameters remain accepted while unsupported
    encodings still reject.
  - expanded request-body unit coverage for parameterized identity encodings.
- Added server runtime bracketed-IPv6 host normalization hardening:
  - runtime host normalization now accepts bracketed IPv6 hosts (e.g. `[::1]`)
    and canonicalizes them to plain IPv6 for server bind compatibility.
  - malformed bracketed host values now cleanly fallback to env/default hosts.
  - extracted IPv6 protocol version value to shared limits constants to satisfy
    strict literal policy.
  - expanded server-config tests for bracketed IPv6 normalization/fallback.
- Added session-messages schema non-blank session-id hardening:
  - `sessionMessagesRequestSchema` now rejects whitespace-only session id
    payloads.
  - expanded schema tests to cover blank session-id rejection.
- Added session-route parser segment normalization hardening:
  - parser now trims incoming route path text and rejects blank/missing
    `sessionId` or blank action segments.
  - malformed blank-segment routes now short-circuit to null route parse.
  - expanded session-route tests for blank segment rejection and whitespace
    wrapped path parsing.
- Added server runtime host validation hardening:
  - runtime host normalization now rejects invalid host strings (schemes,
    malformed host metadata) and falls back to env/default hosts.
  - valid IPv4/IPv6/hostname values remain supported.
  - expanded server-config tests for invalid host fallback and IPv6 acceptance.
- Added request-body whitespace-only empty-body fallback hardening:
  - JSON parse helper now treats whitespace-only bodies as empty for routes
    that provide `emptyBodyValue`.
  - preserved strict syntax-error behavior for whitespace-only bodies when no
    empty-body fallback is configured.
  - expanded request-body unit coverage for both fallback and strict branches.
- Added server-auth bearer-token payload hardening:
  - bearer-scheme headers without token payload now return
    `AUTHORIZATION_REQUIRED` instead of misclassifying as invalid credentials.
  - expanded auth tests for bare bearer scheme and whitespace-only bearer token
    payload handling.
- Added server request schema non-blank string hardening:
  - whitespace-only `cwd`, `title`, and `prompt` values are now rejected by
    shared server request schemas.
  - non-blank padded values remain valid without lossy trimming.
  - expanded server-type schema tests for blank-only rejection behavior.
- Added request-url host metadata validation hardening:
  - host candidates containing path/query/fragment/userinfo metadata are now
    rejected instead of being silently coerced by URL base parsing.
  - parser still supports comma-delimited host candidate fallback by accepting
    the first valid host candidate.
  - expanded request-url + api search route tests for malformed host metadata
    rejection and fallback behavior.
- Added server runtime host/port resolution hardening:
  - host values are now trimmed and blank hosts no longer override valid env or
    default hosts.
  - port parsing now enforces integer range bounds (1-65535), trims string
    values, and falls back from invalid overrides to valid env ports.
  - expanded unit coverage for host trimming/fallback and strict port
    normalization behavior.
- Added server-auth single-entry authorization-array support:
  - auth normalization now accepts one authorization array value (while still
    rejecting ambiguous multi-entry arrays).
  - expanded server-auth unit coverage for accepted single-entry arrays and
    rejected multi-entry arrays.
- Added request-url multi-host candidate parsing hardening:
  - request URL parser now supports comma-delimited host header candidates and
    array entries while preserving malformed-host rejection behavior.
  - added route-level and direct request-url coverage for comma-delimited host
    parsing and invalid-leading-candidate recovery.
- Added request-url host-header array normalization hardening:
  - request URL parsing now safely handles unexpected array-shaped host headers
    and falls back to localhost for blank array entries.
  - added focused unit coverage for array host headers (valid and blank).
- Added request-error case-insensitive canonical matching hardening:
  - canonical parse-error classification now matches case-variant string/object
    message inputs in addition to padded variants.
  - added focused unit coverage for uppercase canonical message handling.
- Added JSON response undefined-payload serialization hardening:
  - `sendJsonResponse(...)` now canonicalizes `JSON.stringify(undefined)` to
    `"null"` so content-length/header emission remains safe and deterministic.
  - added focused unit coverage for undefined payloads with
    `includeContentLength`.
- Added shared JSON-response header-key normalization hardening:
  - `sendJsonResponse(...)` now trims incoming custom header names before
    managed-header filtering and output emission.
  - padded `content-type` / `content-length` custom headers are now stripped
    correctly, and non-managed custom header keys are normalized without
    surrounding whitespace.
  - added focused unit coverage for padded managed/custom header inputs.
- Added request-error detail extraction hardening:
  - parse-error detail mapping now preserves numeric/boolean/bigint `message`
    payloads from thrown objects instead of degrading to generic object strings.
  - expanded request-error normalization unit coverage for numeric message
    payload handling.
- Added request parsing-log handler normalization hardening:
  - request parse/validation log metadata now trims handler names and omits
    blank handler values from telemetry payloads.
  - added logging coverage for padded and blank handler inputs.
- Added request parsing-log method fallback hardening:
  - request parse/validation log metadata now falls back to `UNKNOWN` when
    method input is blank/whitespace.
  - added logging coverage for blank-method normalization behavior.
- Added request parsing-log pathname fallback hardening:
  - request parse/validation log metadata now falls back to `/` when pathname
    input is blank/whitespace.
  - added logging coverage for blank-path normalization behavior.
- Added request-error canonical-message trimming hardening:
  - classification now matches canonical request parse-error messages even when
    surrounding whitespace is present in string/object error shapes.
  - expanded request-error normalization coverage for padded canonical message
    inputs.
- Added request-error normalization robustness hardening:
  - parser error classification now recognizes canonical messages from string
    throws and message-bearing objects, not only `Error` instances.
  - normalized parse-error detail payloads now surface message-bearing object
    messages consistently.
  - expanded unit coverage for string/object error inputs.
- Added server HTTP method normalization direct coverage:
  - created focused unit tests for `normalizeHttpMethod(...)` covering
    lowercase, padded, and already-uppercase method normalization behavior.
  - closed remaining direct unit-coverage gap for
    `src/server/http-method-normalization.ts`.
- Added NutJS allowlist-enforcement smoke coverage hardening:
  - added policy parsing unit coverage for unsupported enabled-flag values.
  - added smoke-level `not_allowlisted` assertion confirming excluded actions
    short-circuit with no capability/diagnostics metadata and no action run.
- Added NutJS early-gate boundary coverage hardening:
  - added unit assertions ensuring `disabled` and `not_allowlisted` outcomes
    do not attach capability/diagnostics metadata.
  - added smoke-level `disabled` execution assertion confirming feature-flag-off
    path short-circuits before action invocation.
- Added NutJS unsupported-platform diagnostics hardening:
  - expanded permission diagnostics unit coverage to assert unsupported
    platforms do not trigger missing-permission classification.
  - added smoke-level unsupported-platform simulation assertions ensuring
    capability no-op outcomes carry fully non-applicable diagnostics metadata.
- Added NutJS no-op diagnostics coverage hardening:
  - extended unsupported-platform capability-noop unit assertions to validate
    all diagnostics statuses are `not_applicable`.
  - added smoke-level assertion that allowlisted actions resolving `null` still
    report `executed` outcomes.
- Added NutJS missing-permission helper extraction:
  - added shared `hasMissingNutJsPermissions(...)` utility to centralize
    missing-permission classification from diagnostics payloads.
  - execution gate now reuses the shared helper instead of duplicating status
    comparisons inline.
  - added diagnostics unit coverage for helper semantics across missing and
    unknown states.
- Added NutJS capability helper dead-code cleanup:
  - removed unused `withNutJsCapabilityNoop(...)` wrapper from
    `nutjs-capability.utils.ts` after gate-level short-circuit hardening made
    it redundant.
  - trimmed obsolete unit coverage and kept capability-detection assertions.
- Added NutJS executed-outcome null-result hardening:
  - removed redundant post-capability no-op wrapper invocation in
    `runNutJsActionWithGate(...)` so successful action executions that resolve
    `null` still return `executed` outcome.
  - added focused unit coverage asserting `executed` outcome + `executed: true`
    when allowlisted actions resolve `null`.
- Added NutJS capability-noop diagnostics enrichment hardening:
  - `runNutJsActionWithGate(...)` now includes permission diagnostics metadata
    even when capability detection returns `capability_noop`.
  - added unit coverage for Linux runtime-missing no-op diagnostics assertions
    and unsupported-platform diagnostics presence.
  - extended NutJS smoke coverage to assert diagnostics metadata on capability
    no-op outcomes.
- Added wildcard precedence canonicalization hardening:
  - normalized allowlist output now collapses to `["*"]` when wildcard is
    present.
  - added focused coverage for wildcard collapse while preserving explicit
    dedupe-order coverage.
- Added allowlist deduplication hardening:
  - NutJS allowlist normalization now deduplicates repeated entries while
    preserving first-seen order.
  - unit coverage added for duplicate explicit/wildcard allowlist entries with
    mixed casing.
- Added typed NutJS stage API hardening:
  - introduced explicit `NutJsExecutionStage` type for fallback-stage values.
  - updated gate fallback precedence accessor to typed stage array return.
  - added uniqueness assertion to prevent duplicated stage entries in fallback
    precedence constants.
- Added wildcard allowlist normalization execution hardening:
  - unit coverage now verifies padded wildcard allowlist entries still permit
    action execution under normalized action-id casing.
- Added NutJS allowlist normalization coverage hardening:
  - unit coverage now validates trimmed/case-folded allowlist parsing and
    padded-uppercase enabled-flag truthy parsing.
  - execution-path coverage now verifies allowlisted actions execute with
    normalized env inputs.
- Added smoke-level cross-platform permission simulation hardening:
  - NutJS smoke e2e now simulates macOS accessibility denial and Windows low
    integrity diagnostics paths.
  - both simulations assert `permission_missing` plus diagnostics status
    metadata.
- Added cross-platform permission diagnostics gate assertion hardening:
  - unit coverage now asserts explicit `permission_missing` outcomes for:
    - macOS accessibility denied diagnostics,
    - Windows low-integrity diagnostics.
  - added diagnostics-status assertions for both new cross-platform missing
    permission paths.
- Added NutJS diagnostics assertion hardening:
  - unit coverage now asserts diagnostics status metadata for executed and
    permission-missing outcomes.
  - Linux smoke coverage now asserts diagnostics metadata in addition to
    permission-missing outcome.
- Added Linux-specific NutJS permission smoke hardening:
  - NutJS smoke e2e now asserts `permission_missing` outcome on Linux when
    runtime is enabled without display backend env.
  - preserves cross-platform smoke semantics by conditionally applying the
    Linux-only assertion.
- Added permission-aware NutJS execution gating hardening:
  - `runNutJsActionWithGate(...)` now enforces permission diagnostics before
    runtime action execution and emits `permission_missing` outcome when
    diagnostics report explicit missing permissions.
  - unknown/not-applicable diagnostics remain non-blocking, preserving
    deterministic execution behavior on platforms without explicit probes.
  - expanded focused coverage in
    `__tests__/unit/utils/nutjs-execution-gate.utils.unit.test.ts` and
    `__tests__/e2e/skippable.nutjs-smoke.e2e.test.ts`.
  - updated fallback-precedence docs to reflect permission-stage enforcement.
- Added repeated explicit cursor connect-failure integration coverage:
  - headless integration now verifies consecutive explicit `harnessId:
    "cursor-cli"` session requests return canonical server-error responses when
    cursor command connect checks fail
  - validates explicit `mock` session creation still succeeds after repeated
    explicit cursor connect-failure requests
- Added repeated default cursor-disabled integration coverage:
  - headless integration now verifies repeated default `/sessions` requests
    return canonical adapter-not-registered responses when `defaultHarness` is
    `cursor-cli` and cursor adapter is disabled
  - validates explicit `mock` session creation still succeeds after repeated
    default-route adapter-not-registered responses
- Added repeated adapter-not-registered integration coverage:
  - headless integration now verifies consecutive default `/sessions` requests
    return canonical adapter-not-registered responses when `defaultHarness` is
    `cursor-cli` but cursor adapter is disabled
  - validates explicit `mock` session creation still succeeds after repeated
    adapter-not-registered responses in the same runtime
- Added harness-registry cursor-disable unit coverage:
  - registry factory tests now assert `createHarnessRegistry(...)` excludes
    `cursor-cli` when cursor is disabled while still including `mock` when
    `includeMock` remains enabled
- Added repeated cursor-not-configured integration coverage:
  - headless integration now verifies consecutive explicit `cursor-cli`
    requests return canonical harness-not-configured responses when cursor is
    disabled in default harness config
  - validates explicit `mock` session creation still succeeds after repeated
    cursor-not-configured requests in the same runtime
- Added repeated cursor connect-failure integration coverage:
  - headless integration now verifies consecutive default cursor-harness
    failures return canonical server errors in the same runtime
  - validates explicit `mock` session creation still succeeds after repeated
    cursor connection failures
- Added harness-registry normalization unit coverage:
  - registry factory unit tests now assert `createHarnessRegistry(...)` omits
    mock adapter entries when `includeMock: false`
  - added wrapper-level assertions for padded/case-insensitive cursor env-flag
    parsing behavior in `isCursorHarnessEnabled(...)`
- Added cursor default-config disablement integration coverage:
  - headless integration now verifies that with cursor disabled in default
    harness configuration, explicit `cursor-cli` requests return canonical
    harness-not-configured responses
  - validates explicit `mock` session creation still succeeds in the same
    server instance under default-config cursor disablement
- Added harness-registry factory fallback unit coverage:
  - harness registry factory unit tests now cover `includeMock: false`
    adapter-list behavior
  - added explicit unsupported cursor env-flag fallback assertions to lock
    default-value behavior in `isCursorHarnessEnabled(...)`
  - normalized adapter id assertions to shared harness constants
- Added default cursor disabled partial-availability integration coverage:
  - headless integration now verifies default session creation fails with
    canonical adapter-not-registered response when `defaultHarness` is
    `cursor-cli` but cursor adapter is disabled
  - validates explicit `mock` session creation still succeeds in the same
    server instance under that default-harness failure condition
- Added default cursor connect-failure integration coverage:
  - headless integration now verifies default-harness session creation returns
    canonical server error when `cursor-cli` is default and connection checks
    fail
  - validates server continuity by successfully creating an explicit `mock`
    session immediately after the failed default cursor path
- Added partial harness-availability integration coverage:
  - headless integration now verifies disabled `cursor-cli` adapter returns
    canonical adapter-not-registered responses while configured `mock` harness
    remains operational in the same server instance
  - locks mixed harness availability behavior for feature-flagged adapter
    disablement scenarios
- Added cursor feature-flag adapter-disable integration coverage:
  - headless integration now verifies that when `cursor-cli` is configured as
    default harness but cursor adapter is disabled by env flag, session create
    returns canonical adapter-not-registered response
  - locks config + registry feature-flag boundary behavior for cursor harness
    selection
- Added cursor connect-failure resilience integration coverage:
  - headless integration now verifies cursor harness connect failures return
    canonical server errors when cursor feature flag is enabled with a missing
    cursor command
  - validates server remains responsive by successfully creating a follow-up
    `mock` harness session after the cursor failure path
- Added malformed harness-config JSON fallback integration coverage:
  - headless integration now verifies startup falls back to default harness
    config when `harnesses.json` exists but contains malformed JSON
  - validates successful session creation via fallback `mock` harness under
    malformed JSON config conditions
- Added missing-default-harness fallback integration coverage:
  - headless integration now verifies startup falls back to default harness
    config when `defaultHarness` points to an unknown harness id
  - validates successful session creation via fallback `mock` harness under
    unmatched default-harness configuration
- Added empty harness-config fallback integration coverage:
  - headless integration now verifies startup falls back to default harness
    config when configured harnesses map is empty
  - validates successful session creation via fallback `mock` harness under
    empty harness-config conditions
- Added boolean env-flag parser coverage:
  - added focused unit tests for `parseBooleanEnvFlag(...)` truthy/falsey/
    unsupported input variants, including padded and case-insensitive values
- Added default-harness cursor feature-flag parsing coverage:
  - padded truthy cursor flag values now covered for harness inclusion behavior
  - falsey/invalid cursor flag variants now covered for harness exclusion
    behavior even with cursor command/args overrides
- Added harness-config fallback-on-load-failure integration coverage:
  - headless integration now verifies startup falls back to default harness
    config when configured harness file is invalid
  - validates successful session creation via fallback `mock` harness
    under invalid harness-config conditions
- Added unregistered-adapter create-session integration coverage:
  - headless integration now verifies configured default harnesses without a
    registered adapter return `404` adapter-not-registered errors
  - added isolated temp project/home harness-config setup in integration
    coverage to lock runtime adapter lookup failure semantics
- Added unknown-harness create-session integration coverage:
  - headless integration now verifies canonical but unconfigured harness ids
    return `404` with formatted harness-not-configured message
  - locks unresolved harness-selection semantics at session-creation boundary
- Added empty harness-id message parity hardening:
  - create-session harness-id schema now emits canonical invalid-id message for
    empty string values (parity with padded/whitespace-only values)
  - expanded server-types unit and headless integration coverage for empty
    harness-id request handling
- Added harness-id validation message unification hardening:
  - shared canonical harness-id validation message constant now reused across
    harness error formatting and server request schema validation
  - create-session schema now emits deterministic harness-id validation message
  - expanded unit/integration coverage for message propagation in schema +
    headless bad-request payloads
- Added session-request harness-id canonicalization hardening:
  - shared harness-id utility added for canonical-id checks/normalization
  - create-session request schema now rejects padded/blank harness ids at
    validation boundary
  - harness config id validation now reuses shared harness-id helper for
    consistent semantics
  - expanded harness utility + server schema + headless integration coverage
- Added strict explicit CLI harness-id validation hardening:
  - explicit CLI harness-id selection now requires canonical ids
    (padded/whitespace-only ids reject)
  - exact explicit harness-id selection continues to resolve normally
  - expanded harness-config unit coverage for exact vs padded/blank explicit
    CLI harness-id behavior
- Added default-harness id validation hardening:
  - project/user `defaultHarness` values now reject whitespace-only and padded
    ids via shared invalid-id validation
  - prevents silent fallback/coercion when defaults are malformed in config
  - expanded harness-config unit coverage for project/user default-id
    validation failures
- Added explicit blank CLI harness-id guard hardening:
  - whitespace-only explicit CLI harness-id values now reject with invalid-id
    diagnostics instead of silently falling back to defaults
  - preserved trimmed lookup behavior for padded-but-valid explicit ids
  - expanded harness config unit coverage for explicit blank CLI id rejection
- Added invalid harness-id config guard hardening:
  - harness-config loader now rejects harness ids with leading/trailing
    whitespace (including whitespace-only ids)
  - added explicit invalid harness-id formatter for standardized diagnostics
  - expanded harness config/error-message unit coverage for invalid-id paths
- Added harness-id whitespace normalization hardening:
  - harness id resolver now trims CLI/user/project harness-id inputs before
    applying precedence
  - whitespace-only defaults now correctly fall through to single-harness
    auto-selection behavior
  - explicit CLI harness-id selection now trims before harness lookup
  - expanded harness config unit coverage for whitespace/default/id edge cases
- Added API not-found boundary propagation hardening:
  - server route classifier now only runs API classification for `/api/` paths
  - API not-found outcomes now propagate classifier handler metadata directly
    into server `UNHANDLED` classification decisions
  - added focused unit coverage for `/api` root path classification to lock
    core-unhandled behavior
- Added API classifier boundary metadata hardening:
  - extracted shared classifier handler constants to
    `server-route-classifier-handlers`
  - `classifyApiRoute(...)` now returns explicit classifier handler ids for
    method-not-allowed and not-found outcomes
  - server route classifier now reuses API classifier metadata for API
    method-not-allowed classification
  - expanded `api-routes.unit` assertions for classifier metadata
- Added api/core classifier handler IDs:
  - route classifier now returns explicit `api_route_classifier` /
    `core_route_classifier` ids for method-not-allowed + unhandled outcomes
  - headless validation telemetry now uses classifier-provided handler ids for
    finer-grained diagnostics
- Added route-classifier/method-guard validation telemetry:
  - headless route-classifier method-not-allowed/not-found paths now emit shared
    validation telemetry with handler id `route_classifier`
  - hook IPC non-POST method guard now emits shared validation telemetry with
    handler id `method_guard`
- Added headless session validation handler identifiers:
  - session create/prompt schema validation failures now include explicit
    handler ids in shared validation telemetry (`session_create`, `session_prompt`)
  - added integration coverage for invalid prompt payload schema path
- Added file-search validation telemetry parity:
  - search-files query/url validation failures now emit shared standardized
    validation telemetry
  - extends validation diagnostics parity to non-JSON API validation paths
- Added shared request-validation telemetry parity:
  - introduced shared validation telemetry helper and reused it for hook IPC
    schema-invalid payloads and headless zod-validation failures
  - expanded unit coverage for validation telemetry helper + hook schema-invalid
    warning assertions under standardized telemetry schema
- Added shared request-parse telemetry helper:
  - introduced shared parse-failure logging helper and source constants
  - standardized warning metadata keys for API/headless/hook parse failures
  - expanded unit assertions for shared telemetry schema behavior
- Added API parse-failure diagnostics parity:
  - API TUI handlers now emit structured warning diagnostics for request-body
    parse failures, aligned with hook IPC/headless diagnostics behavior
  - shared parse-error details helper added and reused for API + hook IPC paths
  - expanded TUI handler coverage for request stream `error`/`aborted` failures
- Added headless route-local parse handling hardening:
  - body parse failures for session creation/prompt routes are now handled in
    localized route-level catch blocks with contextual warning diagnostics
  - preserved shared parse-error normalization while tightening control-flow
    boundaries for request parsing
- Added shared request-error normalization utility:
  - centralized request body parse error normalization/classification for server
    entrypoints
  - refactored API routes, hook IPC, and headless server to reuse shared logic
  - added focused unit coverage for classification behavior
- Added hook IPC shared response helper adoption:
  - hook IPC endpoint now uses shared `sendJsonResponse`/`sendErrorResponse`
    helpers instead of local response serialization functions
  - preserves canonical response semantics and reduces duplicated response code
- Added hook IPC invalid-body diagnostics hardening:
  - hook IPC now emits structured warnings for request-body parse failures while
    preserving canonical 400 response mappings
  - added focused assertions for warning metadata across malformed JSON,
    oversized body, and parser-rejection stream failure paths
- Added hook IPC request-stream failure mapping coverage:
  - added focused unit coverage for aborted-stream and stream-error parser
    rejection paths in hook IPC endpoint handling
  - locks canonical `400 INVALID_REQUEST` response behavior for non-size body
    reader lifecycle failures
- Added CLI env-command blank fallback hardening:
  - Claude and Cursor runtime command resolution now trims env command inputs
    and falls back to harness defaults for whitespace-only overrides
  - added focused unit coverage for blank-command env behavior in:
    - `claude-cli-harness.unit.test.ts`
    - `cursor-cli-connection.unit.test.ts`
- Added hook IPC request-body parser hardening:
  - switched hook IPC body parsing to shared request parser helper
  - added oversized payload coverage with canonical request-body-too-large response
- Added hook IPC non-object payload coverage hardening:
  - locked canonical invalid-request behavior for array and primitive JSON payloads
    sent to hook IPC endpoint
- Added SSE pre-closed response cleanup hardening:
  - events stream now proactively cleans up immediately when response is already ended/destroyed
  - added focused unit coverage for pre-closed response path
- Added file-search key-normalization hardening:
  - query key matching now normalizes key names for duplicate detection across case variants
  - added coverage for uppercase keys, mixed-case duplicate rejection, and encoded-separator values
- Added mixed-chunk request-body decoding hardening:
  - unified UTF-8 decode path now handles both string and buffer chunks
  - added mixed chunk and malformed partial-buffer ordering coverage
- Added auth-header type hardening in server auth middleware:
  - normalized authorization values now require a single non-empty string
  - array/empty header values now map to canonical authorization-required failures
  - added focused unit coverage for header-shape edge cases
- Added harness env-expansion validation hardening:
  - expanded harness configs are now re-validated after env substitution
  - added focused coverage for env-map merge precedence and missing-command expansion failure
- Added default harness env-override hardening:
  - command overrides now trim whitespace and fall back to defaults when blank
  - explicit empty-string args overrides now resolve to empty argument arrays
  - added focused unit coverage in `default-harness-config.unit.test.ts`
- Added server infrastructure test coverage:
  - `server-config` runtime resolution behavior
  - `server-types` request/event schema contracts
  - `eventsStream` SSE lifecycle and unsubscribe cleanup
- Added headless-server integration edge coverage:
  - unknown endpoints and unsupported subroutes
  - missing session prompt behavior
- Added route/auth parity coverage:
  - route matcher coverage for `/api/tui/submit-prompt`
  - integration coverage for raw-token server authorization flow
- Added headless request validation hardening:
  - integration coverage for schema-rejection and oversized-body behavior
  - server runtime fix mapping oversized-body errors to `400` responses
- Added unknown-session message retrieval coverage:
  - integration assertion for `/sessions/:id/messages` empty-list behavior
- Added API method semantics hardening:
  - known `/api/*` unsupported methods now return `405`
  - integration coverage for canonical method-not-allowed response
- Added API route body parsing hardening:
  - request body limit enforcement aligned to server max-body config
  - integration coverage for invalid JSON and oversized payload behavior
- Added auth/method-ordering hardening:
  - integration coverage confirming auth challenge precedence on protected API routes
- Added direct handler error-path hardening:
  - TUI route handlers now return explicit 400s for parse/read failures
  - unit coverage added for invalid JSON and oversized payload direct invocation
- Added non-API method semantics hardening:
  - known non-API routes now emit canonical 405 responses for unsupported methods
  - integration coverage added for health/sessions method validation paths
- Added parser deduplication hardening:
  - extracted shared server request-body utility
  - refactored headless + api route parsing to use shared implementation
  - added direct utility unit coverage
- Added non-API auth-ordering validation:
  - integration coverage locking auth-before-method semantics for `/sessions`
- Added method-guard refactor:
  - extracted centralized core-route method validation helper in headless server
  - preserved semantics validated by integration coverage
- Added request-error normalization:
  - direct TUI route parse failures now return canonical invalid-request payloads
  - targeted unit/integration coverage updated for exact canonical error expectations
- Added API route classification abstraction:
  - centralized API route outcome classification (match/method-not-allowed/not-found)
  - headless server now consumes classification helper instead of ad-hoc route probing
- Added core route classification abstraction:
  - centralized non-API route method classification for headless dispatch
  - dedicated unit coverage for health/sessions/prompt/messages route decisions
- Added session path parser abstraction:
  - centralized parsing for `/sessions/:id/:action` paths
  - reused in headless dispatch and core route classifier
- Added unified server route classification abstraction:
  - composed core + api route classification outcomes in one helper
  - headless server now uses unified route classifier decision pipeline
- Added shared HTTP response helpers:
  - extracted JSON/error response writer behavior into shared server utility
  - refactored headless + API route modules to reuse response helpers
  - added focused unit coverage for header/body semantics
- Added auth response deduplication:
  - refactored server auth middleware to reuse shared error response helper
  - removed duplicated unauthorized response serialization logic
  - preserved Bearer/raw-token auth semantics with existing unit+integration coverage
- Added hook IPC request hardening:
  - standardized method/invalid-payload/server-error responses for hook IPC HTTP endpoint
  - added top-level request failure handling with canonical server error payload
  - expanded hook IPC unit coverage for method, malformed JSON, and thrown-handler paths
- Added default harness fallback coverage:
  - created focused unit coverage for `createDefaultHarnessConfig`
  - validated cursor feature-flag gating for unset and numeric-truthy env paths
  - validated environment argument override parsing for default harness commands
- Added HTTP response helper header hardening:
  - response helper now enforces JSON content-type even when custom headers are passed
  - added focused coverage for custom-header merge semantics
  - validated downstream auth usage remains correct
- Added harness config selection edge coverage:
  - locked single-harness auto-selection behavior when no default is provided
  - locked no-default error behavior when multiple harnesses are configured
  - locked explicit unknown harness-id failure path formatting
- Added hook IPC schema-error coverage:
  - extended hook IPC unit tests to cover schema-invalid JSON payloads
  - validated canonical invalid-request response mapping remains stable
- Added API agents integration contract coverage:
  - strengthened `/api/agents` integration assertions for defaultHarnessId semantics
  - now validates default harness id is present and corresponds to a returned agent id
- Added request-body byte-size correctness hardening:
  - request body size checks now use utf-8 byte counts instead of string length
  - added utility coverage for multibyte overflow, chunked reads, and stream error path
- Added strict session-subroute parsing hardening:
  - session route parser now rejects extra path segments beyond expected shape
  - added coverage to lock unknown-endpoint behavior for over-segmented session routes
  - moved segment-limit literal into shared limits config to keep strict literal checks green
- Added headless invalid-JSON response normalization:
  - syntax-error handling now returns canonical invalid-request response payload
  - aligned non-API invalid JSON behavior with existing API route canonical mapping
- Added request-body chunk accounting hardening:
  - request-body helper now measures bytes directly from incoming chunk type (string/buffer)
  - added focused coverage for buffer chunk inputs and exact-byte-limit acceptance
- Added repo workflow remote parsing hardening:
  - repo workflow parser now recognizes ssh protocol remotes (ssh://...)
  - added coverage for ssh-protocol remote owner/repo extraction behavior
- Added auth bearer-scheme robustness hardening:
  - server auth now accepts case-insensitive bearer scheme prefixes
  - preserved raw-token support and canonical unauthorized response behavior
- Added repo checks-status classification hardening:
  - repo workflow check classification now treats queued checks as pending
  - repo workflow check classification now treats cancelled checks as failing
- Added auth header whitespace hardening:
  - server auth now trims authorization header and extracted token values
  - tolerant handling for bearer/raw token values with surrounding whitespace
- Added repo checks pending-state parity hardening:
  - repo checks classifier now recognizes explicit `pending` status as pending
  - added unit coverage to lock pending-status mapping behavior
- Added ssh remote trailing-slash parsing hardening:
  - repo remote parser now accepts scp-style ssh remotes with trailing slash suffix
  - added unit coverage to lock owner/repo extraction for this remote variant
- Added response-helper managed-header sanitization hardening:
  - response helper now strips case-variant managed content headers from custom inputs
  - added unit coverage to lock content-type/content-length header precedence behavior
- Added request-body single-settlement hardening:
  - request-body reader now guards resolve/reject to settle exactly once
  - added chunk-overflow coverage for multi-chunk max-body enforcement path
- Added remote-url scheme-case parsing hardening:
  - repo remote parser now accepts uppercase HTTPS/SSH scheme variants
  - added workflow info unit coverage for uppercase HTTPS remotes
- Added repo-workflow literal hygiene hardening:
  - extracted GH checks JSON field list into named constant
  - replaced raw PR-state/review-decision literals with domain constants
- Added git-protocol remote parsing hardening:
  - repo remote parser now supports `git://host/owner/repo.git` URLs
  - added workflow info unit coverage for git protocol remotes
- Added request-stream abort/close hardening:
  - request-body helper now rejects aborted/prematurely closed streams
  - listener cleanup added to avoid stale handlers after settlement
- Added scp-SSH custom-user parsing hardening:
  - repo parser now accepts scp ssh remotes with non-`git` user prefixes
  - added workflow info unit coverage for `alice@host:owner/repo.git`
- Added uppercase `.GIT` suffix remote parsing hardening:
  - repo parser now normalizes case-variant `.git` suffixes
  - added workflow info unit coverage for `.../repo.GIT` remotes
- Added scp-remote no-user parsing hardening:
  - repo parser now accepts scp-style remotes without explicit user prefix
  - added workflow info unit coverage for `host:owner/repo.git` remotes
- Added uppercase SSH protocol parsing coverage:
  - added workflow info unit coverage for `SSH://...` protocol-case variant remotes
- Added git+ssh remote parsing hardening:
  - repo parser now accepts `git+ssh://...` remote URLs
  - added workflow info unit coverage for git+ssh protocol remotes
- Added SSE close-unsubscribe idempotency hardening:
  - events stream close handler now uses one-time listener semantics
  - added unit coverage for duplicate close-event safety
- Added check-status whitespace normalization hardening:
  - repo workflow checks parser now trims status/conclusion fields before classification
  - added unit coverage for whitespace-padded pending/failing check states
- Added UTF-8 BOM JSON parsing hardening:
  - request-body JSON parser now strips leading UTF-8 BOM before parsing
  - added unit coverage for BOM-prefixed JSON and BOM-only empty-body fallback
- Added search-files host-header fallback hardening:
  - file-search URL parser now defaults to localhost when host header is absent
  - added unit coverage for hostless request parsing path
- Added UTF-8 split-chunk decoding hardening:
  - request-body reader now uses StringDecoder for buffer chunk boundaries
  - added unit coverage for multi-byte UTF-8 split across buffer chunks
- Added HTTP-method normalization hardening for route classifiers:
  - shared method normalizer now canonicalizes trim+case for route matching
  - added unit coverage for lowercase/padded method handling across classifiers
- Added file-search query-trim hardening:
  - file-search now rejects whitespace-only query values
  - added unit coverage for whitespace-only and trimmed-query behavior
- Added SSE response-close cleanup hardening:
  - events stream now unsubscribes on response close in addition to request close
  - added unit coverage for response-close cleanup path
- Added PR status normalization hardening:
  - PR state/review decision parsing now trims + validates against known values
  - added unit coverage for padded and unsupported review-decision values
- Added strict file-search query decoding hardening:
  - query parameter decoding now validates malformed percent-encoding sequences
  - added unit coverage for malformed encoded query rejection path
- Added PR status timeout/options coverage hardening:
  - added unit assertions for GH CLI timeout + cwd wiring in PR status lookups
  - expanded PR status unit coverage alongside normalization behavior
- Added events-stream error-path cleanup hardening:
  - SSE subscriptions now clean up on request/response error events
  - added unit coverage for response-error and request-error cleanup paths
- Added file-search plus-decoding contract coverage:
  - locked behavior that `q=readme+notes` decodes to `readme notes`
  - expanded focused file-search unit coverage without changing runtime behavior
- Added events-stream aborted-request cleanup hardening:
  - SSE subscriptions now clean up when request emits `aborted`
  - added unit coverage for aborted + close event idempotency
- Added events-stream write-failure cleanup hardening:
  - SSE update writes now fail-safe and trigger cleanup when response write throws
  - added unit coverage for write-failure cleanup behavior
- Added events-stream stale-callback guard hardening:
  - SSE callback now no-ops after cleanup to prevent writes from stale listeners
  - added unit coverage locking post-cleanup callback behavior
- Added repo-workflow normalization hardening:
  - derive status now trims state/review-decision fields before comparisons
  - added unit coverage for padded merged state and approved decision inputs
- Added file-search duplicate-query hardening:
  - search route now rejects duplicated `q` params as invalid requests
  - added unit coverage for duplicated query-parameter behavior
- Added file-search encoded-key hardening:
  - search route now decodes query-parameter names with strict decoding
  - supports encoded `q` key and rejects malformed encoded parameter names
- Added headless file-search integration hardening:
  - added end-to-end coverage for file-search duplicate/encoded/malformed query keys
  - locks server-level response semantics for these file-search edge cases
- Added shared request-url parser hardening:
  - extracted safe URL parsing helper with malformed-host/URL null fallback
  - reused parser in headless server + file-search route handling
- Added missing-request-url hardening:
  - shared parser now returns null for missing request URLs
  - file-search route now returns canonical invalid-request for missing url input
- Added request-url whitespace normalization hardening:
  - shared parser now trims url/host inputs before URL construction
  - preserves valid parsing for whitespace-padded host/url request values
- Added request-target strictness hardening:
  - shared parser now rejects non-origin-form request targets (absolute URLs)
  - file-search route now returns invalid-request for absolute request targets
- Added protocol-relative request-target hardening:
  - shared parser now rejects `//...` request targets explicitly
  - file-search route now returns invalid-request for protocol-relative targets
- Added non-origin-form integration coverage:
  - headless integration now validates absolute/protocol-relative request-target
    rejection through raw HTTP request paths
- Added repo-workflow check-field type hardening:
  - check-field normalizer now safely handles non-string GH check payload fields
  - added unit coverage for malformed check-status payload shapes
- Added repeated unknown-harness continuity hardening:
  - headless integration now validates repeated explicit unknown harness requests
    return canonical harness-not-configured responses
  - verifies explicit mock session creation succeeds after repeated unknown-harness
    failures in the same server runtime
- Added repeated default custom-adapter continuity hardening:
  - headless integration now validates repeated default-route requests when
    configured default harness points to an unregistered custom adapter id
  - verifies canonical adapter-not-registered responses persist across repeats
    and explicit mock sessions remain operational in the same runtime
- Added repeated fallback mock continuity hardening:
  - headless integration now validates repeated explicit mock session creation
    when harness-file loading fails and server falls back to default harness config
  - verifies fallback-path repeated success semantics and distinct generated
    session ids across consecutive requests
- Added repeated fallback-trigger continuity hardening:
  - headless integration now validates repeated explicit mock session creation
    for fallback paths triggered by empty harness config and missing configured
    default harness id
  - verifies repeated fallback-trigger requests produce successful responses
    and distinct generated session ids in both scenarios
- Added repeated merge-override fallback continuity hardening:
  - headless integration now validates repeated explicit mock session creation
    when project/user merged harness config selects a missing user default id
    and server falls back to default harness config
  - verifies repeated fallback requests return successful responses and distinct
    session ids in the same runtime
- Added repeated merged-runtime override continuity hardening:
  - headless integration now validates repeated default session failures when
    project/user merged config preserves `cursor-cli` id but user override sets
    cursor command to an invalid runtime value
  - verifies canonical repeated server-error responses and follow-up explicit
    mock session continuity in the same runtime
- Added repeated merged env-expansion override continuity hardening:
  - headless integration now validates repeated explicit mock sessions when
    merged project/user override keeps `mock` id but command env-expands to an
    empty runtime value
  - verifies fallback-to-default behavior remains stable across repeated
    requests with distinct valid session ids
- Added repeated merged cwd-override continuity hardening:
  - headless integration now validates repeated explicit mock sessions when
    merged project/user override keeps `mock` id but `cwd` env-expands to an
    empty runtime value
  - verifies fallback-to-default behavior remains stable across repeated
    requests with distinct valid session ids
- Added repeated merged blank-command override continuity hardening:
  - headless integration now validates repeated explicit mock sessions when
    merged project/user override keeps `mock` id but command is blank
  - verifies fallback-to-default behavior remains stable across repeated
    requests with distinct valid session ids
- Added repeated merged env-map continuity hardening:
  - headless integration now validates repeated default-route sessions when
    merged project/user overrides keep valid harness id + command/cwd but env
    values expand to empty strings
  - verifies merged config remains valid without fallback and repeated default
    requests return successful distinct session ids
- Added merged env-map prompt continuity hardening:
  - headless integration now validates repeated session creation plus prompt
    submission flows under merged env-map empty-expansion overrides
  - verifies downstream prompt handling remains successful while merged config
    stays valid and avoids fallback
- Added merged env-map mixed-request continuity hardening:
  - headless integration now validates mixed default + explicit session creation
    sequences in the same runtime under merged env-map empty-expansion overrides
  - verifies mixed-path session creations and follow-up prompt submission remain
    successful while merged config stays valid and avoids fallback
- Added merged env-map mixed-validation continuity hardening:
  - headless integration now validates mixed explicit/default session-create
    ordering with invalid prompt payload rejection under merged env-map
    empty-expansion configuration
  - verifies subsequent valid prompt and trailing session creation remain
    successful after validation failure in the same runtime
- Added merged env-map repeated invalid-cycle continuity hardening:
  - headless integration now validates repeated invalid prompt payload cycles
    across multiple sessions under merged env-map empty-expansion configuration
  - verifies validation rejection stability plus valid prompt recovery and
    trailing session creation continuity in the same runtime
- Added merged env-map websocket continuity hardening:
  - headless integration now validates websocket session-created event stream
    stability while mixed create/invalid-prompt/valid-prompt cycles run under
    merged env-map empty-expansion configuration
  - verifies websocket emits distinct session-created events for each created
    session id without destabilizing server continuity
- Added merged env-map state-update stream continuity hardening:
  - headless integration now validates concurrent `/api/events` SSE delivery
    of repeated `STATE_UPDATE` events while merged env-map mixed validation
    cycles execute
  - verifies combined websocket `SESSION_CREATED` and SSE `STATE_UPDATE`
    continuity in the same runtime
- Added merged env-map SSE reconnect continuity hardening:
  - headless integration now validates `/api/events` teardown + reconnect
    behavior after invalid prompt validation and subsequent valid prompt
  - verifies repeated `STATE_UPDATE` delivery across first and second SSE
    stream connections in the same runtime
- Added merged env-map interleaved stream reconnect hardening:
  - headless integration now validates interleaved websocket + `/api/events`
    reconnect cycles across longer mixed validation sequences
  - verifies first and second websocket/SSE connection pairs both receive
    expected `SESSION_CREATED` and `STATE_UPDATE` events in the same runtime
- Added merged env-map alternating reconnect hardening:
  - headless integration now validates repeated reconnect cycles with
    alternating default and explicit `mock` harness create requests
  - verifies each alternating cycle preserves websocket `SESSION_CREATED` and
    SSE `STATE_UPDATE` continuity plus prompt validation recovery behavior
- Added merged env-map alternating burst reconnect hardening:
  - headless integration now validates alternating reconnect cycles where each
    cycle includes repeated invalid prompt payload bursts before recovery
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
    persist alongside repeated bad-request validation and valid-prompt recovery
- Added merged env-map mixed-close reconnect hardening:
  - headless integration now validates alternating reconnect cycles with mixed
    websocket close timing (before vs after prompt recovery)
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity
    remains stable across mixed close-order cycles
- Added merged env-map jitter reconnect hardening:
  - headless integration now validates extended reconnect cycles with mixed
    close timing and reconnect jitter before session creation
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    validation recovery stability across all jittered cycles
- Added merged env-map alternating burst-size reconnect hardening:
  - headless integration now validates extended reconnect cycles that alternate
    default/explicit harness requests while varying invalid-prompt burst sizes
    per cycle
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    prompt validation recovery stability across all burst-size permutations
- Added merged env-map variable SSE cadence reconnect hardening:
  - headless integration now validates reconnect cycles where SSE stream
    teardown/reconnect cadence varies per cycle while session create requests
    continue alternating default/explicit harness paths
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    invalid-prompt burst recovery stability across all cadence permutations
- Added merged env-map dual cadence reconnect hardening:
  - headless integration now validates reconnect cycles where websocket and SSE
    reconnect cadence both vary per cycle while alternating default/explicit
    session create requests continue
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    invalid-prompt burst recovery stability across combined cadence permutations
- Added merged env-map reconnect-order inversion hardening:
  - headless integration now validates alternating reconnect-order inversion per
    cycle (SSE-first vs websocket-first) while dual websocket/SSE cadence
    variation remains active
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    invalid-prompt burst recovery stability under both reconnect orders
- Added merged env-map reconnect-order jitter hardening:
  - headless integration now validates reconnect-order inversion with per-cycle
    jitter variation for stream-open ordering and create cadence
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    invalid-prompt burst recovery stability under jittered reconnect-order
    permutations
- Added merged env-map reconnect-order asymmetric burst hardening:
  - headless integration now validates longer reconnect-order inversion runs
    with asymmetric invalid-prompt burst sizes mapped to stream-open order path
    (`SSE-first` vs `websocket-first`)
  - verifies websocket `SESSION_CREATED` and SSE `STATE_UPDATE` continuity plus
    valid-prompt recovery stability under asymmetric burst pressure
- Added merged env-map reconnect-order cadence expansion hardening:
  - reconnect-order inversion coverage now expands per-order-path create
    cadence in one runtime (`SSE-first` lower cadence, `websocket-first`
    higher cadence) while preserving dual stream assertions
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable across expanded cadence
- Added merged env-map reconnect-order jitter expansion hardening:
  - reconnect-order inversion cadence coverage now applies explicit per-order-
    path jitter arrays for stream-open sequencing and create timing
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    jitter expansion by order path
- Added merged env-map reconnect-order segment asymmetry hardening:
  - reconnect-order inversion cadence coverage now applies asymmetric websocket
    vs SSE reconnect segment counts per order path in the same runtime
  - `SSE-first` cycles run fewer websocket segments and more SSE segments,
    while `websocket-first` cycles invert that segment split
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    jitter + segment-count asymmetry by order path
- Added merged env-map reconnect-order jitter amplitude asymmetry hardening:
  - reconnect-order segment-asymmetry coverage now applies asymmetric
    websocket vs SSE segment-open jitter amplitudes per order path
  - `SSE-first` cycles use lower websocket jitter + higher SSE jitter, while
    `websocket-first` cycles invert that jitter amplitude split
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + jitter-amplitude asymmetry by order path
- Added merged env-map reconnect-order create-jitter asymmetry hardening:
  - reconnect-order jitter-amplitude coverage now applies asymmetric
    create-jitter amplitudes per order path
  - `SSE-first` cycles use lower create-jitter amplitude, while
    `websocket-first` cycles use higher create-jitter amplitude
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry by order path
- Added merged env-map reconnect-order recovery-jitter asymmetry hardening:
  - reconnect-order create-jitter coverage now applies asymmetric invalid-
    prompt recovery jitter amplitudes per order path
  - `SSE-first` cycles use lower recovery jitter amplitude, while
    `websocket-first` cycles use higher recovery jitter amplitude
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry by order path
- Added merged env-map reconnect-order burst-spacing asymmetry hardening:
  - reconnect-order recovery-jitter coverage now applies asymmetric invalid-
    prompt burst spacing amplitudes per order path
  - `SSE-first` cycles use lower invalid-burst spacing, while
    `websocket-first` cycles use higher invalid-burst spacing
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry by order
    path
- Added merged env-map reconnect-order post-recovery delay asymmetry hardening:
  - reconnect-order burst-spacing coverage now applies asymmetric valid-prompt
    post-recovery delay amplitudes per order path
  - `SSE-first` cycles use lower post-recovery delays, while
    `websocket-first` cycles use higher post-recovery delays
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry by order path
- Added merged env-map reconnect-order cycle-cooldown asymmetry hardening:
  - reconnect-order post-recovery delay coverage now applies asymmetric cycle-
    end cooldown jitter amplitudes per order path
  - `SSE-first` cycles use lower cycle cooldown jitter, while
    `websocket-first` cycles use higher cycle cooldown jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry by order path
- Added merged env-map reconnect-order close-delay asymmetry hardening:
  - reconnect-order cycle-cooldown coverage now applies asymmetric websocket
    and SSE close-delay amplitudes per order path
  - `SSE-first` cycles use lower websocket/SSE close-delay amplitudes, while
    `websocket-first` cycles use higher close-delay amplitudes
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry by order path
- Added merged env-map reconnect-order close-interleave asymmetry hardening:
  - reconnect-order close-delay coverage now applies asymmetric close-
    interleave timing between websocket and SSE segment completion handlers
  - `SSE-first` cycles use lower close-interleave delays, while
    `websocket-first` cycles use higher close-interleave delays
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry by order path
- Added merged env-map reconnect-order post-close create scheduling asymmetry hardening:
  - reconnect-order close-interleave coverage now applies asymmetric post-close
    create scheduling jitter per order path
  - `SSE-first` cycles use lower post-close create jitter, while
    `websocket-first` cycles use higher post-close create jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry by order path
- Added merged env-map reconnect-order post-close prompt scheduling asymmetry hardening:
  - reconnect-order post-close create scheduling coverage now applies
    asymmetric post-close prompt scheduling jitter per order path
  - `SSE-first` cycles use lower post-close prompt jitter, while
    `websocket-first` cycles use higher post-close prompt jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry by order path
- Added merged env-map reconnect-order post-close recovery scheduling asymmetry hardening:
  - reconnect-order post-close prompt scheduling coverage now applies
    asymmetric post-close recovery scheduling jitter per order path
  - `SSE-first` cycles use lower post-close recovery jitter, while
    `websocket-first` cycles use higher post-close recovery jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry by order path
- Added merged env-map reconnect-order post-close cycle transition asymmetry hardening:
  - reconnect-order post-close recovery scheduling coverage now applies
    asymmetric post-close cycle transition jitter per order path
  - `SSE-first` cycles use lower post-close cycle transition jitter, while
    `websocket-first` cycles use higher post-close cycle transition jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry by order path
- Added merged env-map reconnect-order post-close segment-open gating asymmetry hardening:
  - reconnect-order post-close cycle transition coverage now applies
    asymmetric post-close segment-open gating jitter per order path
  - `SSE-first` cycles use lower post-close segment-open gating jitter, while
    `websocket-first` cycles use higher post-close segment-open gating jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry by order path
- Added merged env-map reconnect-order post-close segment-rearm asymmetry hardening:
  - reconnect-order post-close segment-open gating coverage now applies
    asymmetric post-close segment-rearm jitter per order path
  - `SSE-first` cycles use lower post-close segment-rearm jitter, while
    `websocket-first` cycles use higher post-close segment-rearm jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry by
    order path
- Added merged env-map reconnect-order post-close invalid-burst ramp asymmetry hardening:
  - reconnect-order post-close segment-rearm coverage now applies asymmetric
    post-close invalid-burst ramp jitter per order path
  - `SSE-first` cycles use lower post-close invalid-burst ramp jitter, while
    `websocket-first` cycles use higher post-close invalid-burst ramp jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry by order path
- Added merged env-map reconnect-order post-close valid-prompt ramp asymmetry hardening:
  - reconnect-order post-close invalid-burst ramp coverage now applies
    asymmetric post-close valid-prompt ramp jitter per order path
  - `SSE-first` cycles use lower post-close valid-prompt ramp jitter, while
    `websocket-first` cycles use higher post-close valid-prompt ramp jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry by order path
- Added merged env-map reconnect-order post-close recovery-confirm asymmetry hardening:
  - reconnect-order post-close valid-prompt ramp coverage now applies
    asymmetric post-close recovery-confirm jitter per order path
  - `SSE-first` cycles use lower post-close recovery-confirm jitter, while
    `websocket-first` cycles use higher post-close recovery-confirm jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry by order path
- Added merged env-map reconnect-order post-close recovery-settle asymmetry hardening:
  - reconnect-order post-close recovery-confirm coverage now applies
    asymmetric post-close recovery-settle jitter per order path
  - `SSE-first` cycles use lower post-close recovery-settle jitter, while
    `websocket-first` cycles use higher post-close recovery-settle jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry by order path
- Added merged env-map reconnect-order post-close cycle-handoff asymmetry hardening:
  - reconnect-order post-close recovery-settle coverage now applies asymmetric
    post-close cycle-handoff jitter per order path
  - `SSE-first` cycles use lower post-close cycle-handoff jitter, while
    `websocket-first` cycles use higher post-close cycle-handoff jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry by order path
- Added merged env-map reconnect-order post-close cycle-cooldown handoff asymmetry hardening:
  - reconnect-order post-close cycle-handoff coverage now applies asymmetric
    post-close cycle-cooldown handoff jitter per order path
  - `SSE-first` cycles use lower post-close cycle-cooldown handoff jitter,
    while `websocket-first` cycles use higher post-close cycle-cooldown
    handoff jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry by order path
- Added merged env-map reconnect-order post-close cycle-transition handoff asymmetry hardening:
  - reconnect-order post-close cycle-cooldown handoff coverage now applies
    asymmetric post-close cycle-transition handoff jitter per order path
  - `SSE-first` cycles use lower post-close cycle-transition handoff jitter,
    while `websocket-first` cycles use higher post-close cycle-transition
    handoff jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    by order path
- Added merged env-map reconnect-order post-close segment-open handoff asymmetry hardening:
  - reconnect-order post-close cycle-transition handoff coverage now applies
    asymmetric post-close segment-open handoff jitter per order path
  - `SSE-first` cycles use lower post-close segment-open handoff jitter, while
    `websocket-first` cycles use higher post-close segment-open handoff jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry by order path
- Added merged env-map reconnect-order post-close segment-rearm handoff asymmetry hardening:
  - reconnect-order post-close segment-open handoff coverage now applies
    asymmetric post-close segment-rearm handoff jitter per order path
  - `SSE-first` cycles use lower post-close segment-rearm handoff jitter,
    while `websocket-first` cycles use higher post-close segment-rearm handoff
    jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst handoff asymmetry hardening:
  - reconnect-order post-close segment-rearm handoff coverage now applies
    asymmetric post-close prompt-burst handoff jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst handoff jitter, while
    `websocket-first` cycles use higher post-close prompt-burst handoff jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry by order
    path
- Added merged env-map reconnect-order post-close prompt-burst recovery-settle asymmetry hardening:
  - reconnect-order post-close prompt-burst handoff coverage now applies
    asymmetric post-close prompt-burst recovery-settle jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-settle
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-settle jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-confirm asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-settle coverage now
    applies asymmetric post-close prompt-burst recovery-confirm jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-confirm
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-confirm jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-handoff asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-confirm coverage now
    applies asymmetric post-close prompt-burst recovery-handoff jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-handoff
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-handoff jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry by
    order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-cooldown asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-handoff coverage now
    applies asymmetric post-close prompt-burst recovery-cooldown jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-cooldown
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-cooldown jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-drift asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-cooldown coverage now
    applies asymmetric post-close prompt-burst recovery-drift jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-drift
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-drift jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-transition asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-drift coverage now
    applies asymmetric post-close prompt-burst recovery-transition jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-transition
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-transition jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-checkpoint asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-transition coverage now
    applies asymmetric post-close prompt-burst recovery-checkpoint jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-checkpoint
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-checkpoint jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-finalize asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-checkpoint coverage now
    applies asymmetric post-close prompt-burst recovery-finalize jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-finalize
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-finalize jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry by order
    path
- Added merged env-map reconnect-order post-close prompt-burst recovery-anchor asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-finalize coverage now
    applies asymmetric post-close prompt-burst recovery-anchor jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-anchor
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-anchor jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-seal asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-anchor coverage now
    applies asymmetric post-close prompt-burst recovery-seal jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-seal jitter,
    while `websocket-first` cycles use higher post-close prompt-burst
    recovery-seal jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-guard asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-seal coverage now applies
    asymmetric post-close prompt-burst recovery-guard jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-guard
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-guard jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-lock asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-guard coverage now applies
    asymmetric post-close prompt-burst recovery-lock jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-lock jitter,
    while `websocket-first` cycles use higher post-close prompt-burst
    recovery-lock jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-bolt asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-lock coverage now applies
    asymmetric post-close prompt-burst recovery-bolt jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-bolt jitter,
    while `websocket-first` cycles use higher post-close prompt-burst
    recovery-bolt jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-clamp asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-bolt coverage now applies
    asymmetric post-close prompt-burst recovery-clamp jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-clamp
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-clamp jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-brace asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-clamp coverage now applies
    asymmetric post-close prompt-burst recovery-brace jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-brace
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-brace jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-latch asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-brace coverage now applies
    asymmetric post-close prompt-burst recovery-latch jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-latch
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-latch jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-rivet asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-latch coverage now applies
    asymmetric post-close prompt-burst recovery-rivet jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-rivet
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-rivet jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-pin asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-rivet coverage now applies
    asymmetric post-close prompt-burst recovery-pin jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pin jitter,
    while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pin jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry by order
    path
- Added merged env-map reconnect-order post-close prompt-burst recovery-stud asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pin coverage now applies
    asymmetric post-close prompt-burst recovery-stud jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-stud jitter,
    while `websocket-first` cycles use higher post-close prompt-burst
    recovery-stud jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-spike asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-stud coverage now applies
    asymmetric post-close prompt-burst recovery-spike jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-spike
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-spike jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-notch asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-spike coverage now applies
    asymmetric post-close prompt-burst recovery-notch jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-notch
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-notch jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-groove asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-notch coverage now applies
    asymmetric post-close prompt-burst recovery-groove jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-groove
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-groove jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-ridge asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-groove coverage now applies
    asymmetric post-close prompt-burst recovery-ridge jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-ridge
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-ridge jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-crest asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-ridge coverage now applies
    asymmetric post-close prompt-burst recovery-crest jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-crest
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-crest jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-peak asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-crest coverage now applies
    asymmetric post-close prompt-burst recovery-peak jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-peak jitter,
    while `websocket-first` cycles use higher post-close prompt-burst recovery-
    peak jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry by order
    path
- Added merged env-map reconnect-order post-close prompt-burst recovery-summit asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-peak coverage now applies
    asymmetric post-close prompt-burst recovery-summit jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-summit
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-summit jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-apex asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-summit coverage now applies
    asymmetric post-close prompt-burst recovery-apex jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-apex jitter,
    while `websocket-first` cycles use higher post-close prompt-burst recovery-
    apex jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-crown asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-apex coverage now applies
    asymmetric post-close prompt-burst recovery-crown jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-crown jitter,
    while `websocket-first` cycles use higher post-close prompt-burst recovery-
    crown jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-tiara asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-crown coverage now applies
    asymmetric post-close prompt-burst recovery-tiara jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-tiara jitter,
    while `websocket-first` cycles use higher post-close prompt-burst recovery-
    tiara jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-diadem asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-tiara coverage now applies
    asymmetric post-close prompt-burst recovery-diadem jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-diadem
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-diadem jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-coronet asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-diadem coverage now applies
    asymmetric post-close prompt-burst recovery-coronet jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-coronet
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-coronet jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-circlet asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-coronet coverage now applies
    asymmetric post-close prompt-burst recovery-circlet jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-circlet
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-circlet jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry by order
    path
- Added merged env-map reconnect-order post-close prompt-burst recovery-band asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-circlet coverage now
    applies asymmetric post-close prompt-burst recovery-band jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-band jitter,
    while `websocket-first` cycles use higher post-close prompt-burst
    recovery-band jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-bangle asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-band coverage now applies
    asymmetric post-close prompt-burst recovery-bangle jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-bangle
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-bangle jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-bracelet asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-bangle coverage now
    applies asymmetric post-close prompt-burst recovery-bracelet jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-bracelet
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-bracelet jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-anklet asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-bracelet coverage now
    applies asymmetric post-close prompt-burst recovery-anklet jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-anklet
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-anklet jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry + post-close prompt-burst recovery-anklet asymmetry by order
    path
- Added merged env-map reconnect-order post-close prompt-burst recovery-toe-ring asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-anklet coverage now
    applies asymmetric post-close prompt-burst recovery-toe-ring jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-toe-ring
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-toe-ring jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry + post-close prompt-burst recovery-anklet asymmetry + post-close
    prompt-burst recovery-toe-ring asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-charm asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-toe-ring coverage now
    applies asymmetric post-close prompt-burst recovery-charm jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-charm
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-charm jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry + post-close prompt-burst recovery-anklet asymmetry + post-close
    prompt-burst recovery-toe-ring asymmetry + post-close prompt-burst
    recovery-charm asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-pendant asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-charm coverage now
    applies asymmetric post-close prompt-burst recovery-pendant jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pendant
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pendant jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry + post-close prompt-burst recovery-anklet asymmetry + post-close
    prompt-burst recovery-toe-ring asymmetry + post-close prompt-burst
    recovery-charm asymmetry + post-close prompt-burst recovery-pendant
    asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-locket asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pendant coverage now
    applies asymmetric post-close prompt-burst recovery-locket jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-locket
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-locket jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry + post-close prompt-burst recovery-anklet asymmetry + post-close
    prompt-burst recovery-toe-ring asymmetry + post-close prompt-burst
    recovery-charm asymmetry + post-close prompt-burst recovery-pendant
    asymmetry + post-close prompt-burst recovery-locket asymmetry by order
    path
- Added merged env-map reconnect-order post-close prompt-burst recovery-medallion asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-locket coverage now
    applies asymmetric post-close prompt-burst recovery-medallion jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-medallion
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-medallion jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry + post-close prompt-burst recovery-anklet asymmetry + post-close
    prompt-burst recovery-toe-ring asymmetry + post-close prompt-burst
    recovery-charm asymmetry + post-close prompt-burst recovery-pendant
    asymmetry + post-close prompt-burst recovery-locket asymmetry + post-close
    prompt-burst recovery-medallion asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-amulet asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-medallion coverage now
    applies asymmetric post-close prompt-burst recovery-amulet jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-amulet
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-amulet jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry + post-close prompt-burst recovery-anklet asymmetry + post-close
    prompt-burst recovery-toe-ring asymmetry + post-close prompt-burst
    recovery-charm asymmetry + post-close prompt-burst recovery-pendant
    asymmetry + post-close prompt-burst recovery-locket asymmetry + post-close
    prompt-burst recovery-medallion asymmetry + post-close prompt-burst
    recovery-amulet asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-talisman asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-amulet coverage now
    applies asymmetric post-close prompt-burst recovery-talisman jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-talisman
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-talisman jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry + post-close prompt-burst recovery-anklet asymmetry + post-close
    prompt-burst recovery-toe-ring asymmetry + post-close prompt-burst
    recovery-charm asymmetry + post-close prompt-burst recovery-pendant
    asymmetry + post-close prompt-burst recovery-locket asymmetry + post-close
    prompt-burst recovery-medallion asymmetry + post-close prompt-burst
    recovery-amulet asymmetry + post-close prompt-burst recovery-talisman
    asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-totem asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-talisman coverage now
    applies asymmetric post-close prompt-burst recovery-totem jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-totem
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-totem jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry + post-close prompt-burst recovery-anklet asymmetry + post-close
    prompt-burst recovery-toe-ring asymmetry + post-close prompt-burst
    recovery-charm asymmetry + post-close prompt-burst recovery-pendant
    asymmetry + post-close prompt-burst recovery-locket asymmetry + post-close
    prompt-burst recovery-medallion asymmetry + post-close prompt-burst
    recovery-amulet asymmetry + post-close prompt-burst recovery-talisman
    asymmetry + post-close prompt-burst recovery-totem asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-relic asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-totem coverage now
    applies asymmetric post-close prompt-burst recovery-relic jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-relic
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-relic jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry + post-close prompt-burst recovery-anklet asymmetry + post-close
    prompt-burst recovery-toe-ring asymmetry + post-close prompt-burst
    recovery-charm asymmetry + post-close prompt-burst recovery-pendant
    asymmetry + post-close prompt-burst recovery-locket asymmetry + post-close
    prompt-burst recovery-medallion asymmetry + post-close prompt-burst
    recovery-amulet asymmetry + post-close prompt-burst recovery-talisman
    asymmetry + post-close prompt-burst recovery-totem asymmetry + post-close
    prompt-burst recovery-relic asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-sigil asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-relic coverage now
    applies asymmetric post-close prompt-burst recovery-sigil jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-sigil
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-sigil jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry + post-close prompt-burst recovery-anklet asymmetry + post-close
    prompt-burst recovery-toe-ring asymmetry + post-close prompt-burst
    recovery-charm asymmetry + post-close prompt-burst recovery-pendant
    asymmetry + post-close prompt-burst recovery-locket asymmetry + post-close
    prompt-burst recovery-medallion asymmetry + post-close prompt-burst
    recovery-amulet asymmetry + post-close prompt-burst recovery-talisman
    asymmetry + post-close prompt-burst recovery-totem asymmetry + post-close
    prompt-burst recovery-relic asymmetry + post-close prompt-burst recovery-
    sigil asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-glyph asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-sigil coverage now
    applies asymmetric post-close prompt-burst recovery-glyph jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-glyph
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-glyph jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under combined cadence +
    segment-count asymmetry + stream-open jitter asymmetry + create-jitter
    asymmetry + recovery-jitter asymmetry + burst-spacing asymmetry + post-
    recovery delay asymmetry + cycle-cooldown asymmetry + close-delay
    asymmetry + close-interleave asymmetry + post-close create scheduling
    asymmetry + post-close prompt scheduling asymmetry + post-close recovery
    scheduling asymmetry + post-close cycle transition asymmetry + post-close
    segment-open gating asymmetry + post-close segment-rearm asymmetry +
    post-close invalid-burst ramp asymmetry + post-close valid-prompt ramp
    asymmetry + post-close recovery-confirm asymmetry + post-close recovery-
    settle asymmetry + post-close cycle-handoff asymmetry + post-close cycle-
    cooldown handoff asymmetry + post-close cycle-transition handoff asymmetry
    + post-close segment-open handoff asymmetry + post-close segment-rearm
    handoff asymmetry + post-close prompt-burst handoff asymmetry + post-close
    prompt-burst recovery-settle asymmetry + post-close prompt-burst recovery-
    confirm asymmetry + post-close prompt-burst recovery-handoff asymmetry +
    post-close prompt-burst recovery-cooldown asymmetry + post-close prompt-
    burst recovery-drift asymmetry + post-close prompt-burst recovery-
    transition asymmetry + post-close prompt-burst recovery-checkpoint
    asymmetry + post-close prompt-burst recovery-finalize asymmetry + post-
    close prompt-burst recovery-anchor asymmetry + post-close prompt-burst
    recovery-seal asymmetry + post-close prompt-burst recovery-guard asymmetry
    + post-close prompt-burst recovery-lock asymmetry + post-close prompt-
    burst recovery-bolt asymmetry + post-close prompt-burst recovery-clamp
    asymmetry + post-close prompt-burst recovery-brace asymmetry + post-close
    prompt-burst recovery-latch asymmetry + post-close prompt-burst recovery-
    rivet asymmetry + post-close prompt-burst recovery-pin asymmetry + post-
    close prompt-burst recovery-stud asymmetry + post-close prompt-burst
    recovery-spike asymmetry + post-close prompt-burst recovery-notch
    asymmetry + post-close prompt-burst recovery-groove asymmetry + post-close
    prompt-burst recovery-ridge asymmetry + post-close prompt-burst recovery-
    crest asymmetry + post-close prompt-burst recovery-peak asymmetry + post-
    close prompt-burst recovery-summit asymmetry + post-close prompt-burst
    recovery-apex asymmetry + post-close prompt-burst recovery-crown asymmetry
    + post-close prompt-burst recovery-tiara asymmetry + post-close prompt-
    burst recovery-diadem asymmetry + post-close prompt-burst recovery-coronet
    asymmetry + post-close prompt-burst recovery-circlet asymmetry + post-
    close prompt-burst recovery-band asymmetry + post-close prompt-burst
    recovery-bangle asymmetry + post-close prompt-burst recovery-bracelet
    asymmetry + post-close prompt-burst recovery-anklet asymmetry + post-close
    prompt-burst recovery-toe-ring asymmetry + post-close prompt-burst
    recovery-charm asymmetry + post-close prompt-burst recovery-pendant
    asymmetry + post-close prompt-burst recovery-locket asymmetry + post-close
    prompt-burst recovery-medallion asymmetry + post-close prompt-burst
    recovery-amulet asymmetry + post-close prompt-burst recovery-talisman
    asymmetry + post-close prompt-burst recovery-totem asymmetry + post-close
    prompt-burst recovery-relic asymmetry + post-close prompt-burst recovery-
    sigil asymmetry + post-close prompt-burst recovery-glyph asymmetry + post-
    close prompt-burst recovery-rune asymmetry by order path
- Added merged env-map reconnect-order post-close prompt-burst recovery-rune asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-glyph coverage now
    applies asymmetric post-close prompt-burst recovery-rune jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-rune jitter,
    while `websocket-first` cycles use higher post-close prompt-burst
    recovery-rune jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-insignia asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-rune coverage now applies
    asymmetric post-close prompt-burst recovery-insignia jitter per order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-insignia
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-insignia jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-emblem asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-insignia coverage now
    applies asymmetric post-close prompt-burst recovery-emblem jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-emblem
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-emblem jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-badge asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-emblem coverage now
    applies asymmetric post-close prompt-burst recovery-badge jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-badge
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-badge jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-banner asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-badge coverage now
    applies asymmetric post-close prompt-burst recovery-banner jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-banner
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-banner jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-standard asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-banner coverage now
    applies asymmetric post-close prompt-burst recovery-standard jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-standard
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-standard jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-flag asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-standard coverage now
    applies asymmetric post-close prompt-burst recovery-flag jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-flag
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-flag jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-pennant asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-flag coverage now
    applies asymmetric post-close prompt-burst recovery-pennant jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pennant
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pennant jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-guidon asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pennant coverage now
    applies asymmetric post-close prompt-burst recovery-guidon jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-guidon
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-guidon jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-burgee asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-guidon coverage now
    applies asymmetric post-close prompt-burst recovery-burgee jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-burgee
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-burgee jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-streamer asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-burgee coverage now
    applies asymmetric post-close prompt-burst recovery-streamer jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-streamer
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-streamer jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-pennon asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-streamer coverage now
    applies asymmetric post-close prompt-burst recovery-pennon jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pennon
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pennon jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-ensign asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pennon coverage now
    applies asymmetric post-close prompt-burst recovery-ensign jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-ensign
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-ensign jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-gonfalon asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-ensign coverage now
    applies asymmetric post-close prompt-burst recovery-gonfalon jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-gonfalon
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-gonfalon jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-oriflamme asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-gonfalon coverage now
    applies asymmetric post-close prompt-burst recovery-oriflamme jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-oriflamme
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-oriflamme jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-vexillum asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-oriflamme coverage now
    applies asymmetric post-close prompt-burst recovery-vexillum jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-vexillum
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-vexillum jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-labarum asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-vexillum coverage now
    applies asymmetric post-close prompt-burst recovery-labarum jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-labarum
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-labarum jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-draco asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-labarum coverage now
    applies asymmetric post-close prompt-burst recovery-draco jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-draco
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-draco jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-signum asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-draco coverage now
    applies asymmetric post-close prompt-burst recovery-signum jitter per order
    path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-signum
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-signum jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-vexiloid asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-signum coverage now
    applies asymmetric post-close prompt-burst recovery-vexiloid jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-vexiloid
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-vexiloid jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-banderole asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-vexiloid coverage now
    applies asymmetric post-close prompt-burst recovery-banderole jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-banderole
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-banderole jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-pennoncelle asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-banderole coverage now
    applies asymmetric post-close prompt-burst recovery-pennoncelle jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pennoncelle
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pennoncelle jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-streameret asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pennoncelle coverage now
    applies asymmetric post-close prompt-burst recovery-streameret jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-streameret
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-streameret jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-guidonet asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-streameret coverage now
    applies asymmetric post-close prompt-burst recovery-guidonet jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-guidonet
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-guidonet jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-cornette asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-guidonet coverage now
    applies asymmetric post-close prompt-burst recovery-cornette jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-cornette
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-cornette jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-fanion asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-cornette coverage now
    applies asymmetric post-close prompt-burst recovery-fanion jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-fanion
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-fanion jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-chapeau asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-fanion coverage now
    applies asymmetric post-close prompt-burst recovery-chapeau jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-chapeau
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-chapeau jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-banneret asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-chapeau coverage now
    applies asymmetric post-close prompt-burst recovery-banneret jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-banneret
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-banneret jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-baucan asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-banneret coverage now
    applies asymmetric post-close prompt-burst recovery-baucan jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-baucan
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-baucan jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-gonfanon asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-baucan coverage now
    applies asymmetric post-close prompt-burst recovery-gonfanon jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-gonfanon
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-gonfanon jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-ribband asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-gonfanon coverage now
    applies asymmetric post-close prompt-burst recovery-ribband jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-ribband
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-ribband jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-pencel asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-ribband coverage now
    applies asymmetric post-close prompt-burst recovery-pencel jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pencel
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pencel jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-ribbonet asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pencel coverage now
    applies asymmetric post-close prompt-burst recovery-ribbonet jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-ribbonet
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-ribbonet jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-tassel asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-ribbonet coverage now
    applies asymmetric post-close prompt-burst recovery-tassel jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-tassel
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-tassel jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-inescutcheon asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-tassel coverage now
    applies asymmetric post-close prompt-burst recovery-inescutcheon jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-inescutcheon
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-inescutcheon jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-escarbuncle asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-inescutcheon coverage now
    applies asymmetric post-close prompt-burst recovery-escarbuncle jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-escarbuncle
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-escarbuncle jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-roundel asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-escarbuncle coverage now
    applies asymmetric post-close prompt-burst recovery-roundel jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-roundel
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-roundel jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-billette asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-roundel coverage now
    applies asymmetric post-close prompt-burst recovery-billette jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-billette
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-billette jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-lozenge asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-billette coverage now
    applies asymmetric post-close prompt-burst recovery-lozenge jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-lozenge
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-lozenge jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-fusil asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-lozenge coverage now
    applies asymmetric post-close prompt-burst recovery-fusil jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-fusil
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-fusil jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-mascle asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-fusil coverage now
    applies asymmetric post-close prompt-burst recovery-mascle jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-mascle
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-mascle jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-rustre asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-mascle coverage now
    applies asymmetric post-close prompt-burst recovery-rustre jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-rustre
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-rustre jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-annulet asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-rustre coverage now
    applies asymmetric post-close prompt-burst recovery-annulet jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-annulet
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-annulet jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-torteau asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-annulet coverage now
    applies asymmetric post-close prompt-burst recovery-torteau jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-torteau
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-torteau jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-bezant asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-torteau coverage now
    applies asymmetric post-close prompt-burst recovery-bezant jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-bezant
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-bezant jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-plate asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-bezant coverage now
    applies asymmetric post-close prompt-burst recovery-plate jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-plate
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-plate jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-pellet asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-plate coverage now
    applies asymmetric post-close prompt-burst recovery-pellet jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pellet
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pellet jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-hurt asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pellet coverage now
    applies asymmetric post-close prompt-burst recovery-hurt jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-hurt
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-hurt jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-pomme asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-hurt coverage now
    applies asymmetric post-close prompt-burst recovery-pomme jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pomme
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pomme jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-golpe asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pomme coverage now
    applies asymmetric post-close prompt-burst recovery-golpe jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-golpe
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-golpe jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-ogress asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-golpe coverage now
    applies asymmetric post-close prompt-burst recovery-ogress jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-ogress
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-ogress jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-fountain asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-ogress coverage now
    applies asymmetric post-close prompt-burst recovery-fountain jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-fountain
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-fountain jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-gurges asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-fountain coverage now
    applies asymmetric post-close prompt-burst recovery-gurges jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-gurges
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-gurges jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-barry asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-gurges coverage now
    applies asymmetric post-close prompt-burst recovery-barry jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-barry
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-barry jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-bend asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-barry coverage now
    applies asymmetric post-close prompt-burst recovery-bend jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-bend
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-bend jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-flaunches asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-bend coverage now
    applies asymmetric post-close prompt-burst recovery-flaunches jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-flaunches
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-flaunches jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-pale asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-flaunches coverage now
    applies asymmetric post-close prompt-burst recovery-pale jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pale
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pale jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-fess asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pale coverage now
    applies asymmetric post-close prompt-burst recovery-fess jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-fess
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-fess jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-chevron asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-fess coverage now
    applies asymmetric post-close prompt-burst recovery-chevron jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-chevron
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-chevron jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-chief asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-chevron coverage now
    applies asymmetric post-close prompt-burst recovery-chief jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-chief
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-chief jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-pall asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-chief coverage now
    applies asymmetric post-close prompt-burst recovery-pall jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pall
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pall jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-saltire asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pall coverage now
    applies asymmetric post-close prompt-burst recovery-saltire jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-saltire
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-saltire jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-pile asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-saltire coverage now
    applies asymmetric post-close prompt-burst recovery-pile jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pile
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pile jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-cross asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pile coverage now
    applies asymmetric post-close prompt-burst recovery-cross jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-cross
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-cross jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-fret asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-cross coverage now
    applies asymmetric post-close prompt-burst recovery-fret jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-fret
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-fret jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-gyron asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-fret coverage now
    applies asymmetric post-close prompt-burst recovery-gyron jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-gyron
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-gyron jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-orle asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-gyron coverage now
    applies asymmetric post-close prompt-burst recovery-orle jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-orle
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-orle jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-tressure asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-orle coverage now
    applies asymmetric post-close prompt-burst recovery-tressure jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-tressure
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-tressure jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-trefoil asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-tressure coverage now
    applies asymmetric post-close prompt-burst recovery-trefoil jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-trefoil
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-trefoil jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-label asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-trefoil coverage now
    applies asymmetric post-close prompt-burst recovery-label jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-label
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-label jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-motto asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-label coverage now
    applies asymmetric post-close prompt-burst recovery-motto jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-motto
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-motto jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-supporter asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-motto coverage now
    applies asymmetric post-close prompt-burst recovery-supporter jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-supporter
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-supporter jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-compartment asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-supporter coverage now
    applies asymmetric post-close prompt-burst recovery-compartment jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-compartment
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-compartment jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-torse asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-compartment coverage now
    applies asymmetric post-close prompt-burst recovery-torse jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-torse
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-torse jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-caparison asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-torse coverage now
    applies asymmetric post-close prompt-burst recovery-caparison jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-caparison
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-caparison jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-pavilion asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-caparison coverage now
    applies asymmetric post-close prompt-burst recovery-pavilion jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-pavilion
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-pavilion jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-livery asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-pavilion coverage now
    applies asymmetric post-close prompt-burst recovery-livery jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-livery
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-livery jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-escutcheon asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-livery coverage now
    applies asymmetric post-close prompt-burst recovery-escutcheon jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-escutcheon
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-escutcheon jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-mantling asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-escutcheon coverage now
    applies asymmetric post-close prompt-burst recovery-mantling jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-mantling
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-mantling jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-helm asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-mantling coverage now
    applies asymmetric post-close prompt-burst recovery-helm jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-helm
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-helm jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-cartouche asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-helm coverage now
    applies asymmetric post-close prompt-burst recovery-cartouche jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-cartouche
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-cartouche jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Added merged env-map reconnect-order post-close prompt-burst recovery-vamplate asymmetry hardening:
  - reconnect-order post-close prompt-burst recovery-cartouche coverage now
    applies asymmetric post-close prompt-burst recovery-vamplate jitter per
    order path
  - `SSE-first` cycles use lower post-close prompt-burst recovery-vamplate
    jitter, while `websocket-first` cycles use higher post-close prompt-burst
    recovery-vamplate jitter
  - verifies websocket `SESSION_CREATED`, SSE `STATE_UPDATE`, asymmetric burst
    rejection, and valid-prompt recovery remain stable under the expanded
    stacked reconnect-order asymmetry matrix
- Completed P0 backlog item B01 deterministic shell-session teardown hardening:
  - added deterministic shell-session dispose behavior that rejects active and
    queued commands
  - hardened Windows dispose path to force `SIGTERM` + `SIGKILL` teardown for
    `cmd.exe /K` lifecycle cleanup
  - added `ShellSessionManager.dispose()` and chat runtime cleanup wiring to
    dispose shell sessions during runtime unmount/replacement
  - added focused unit coverage in
    `__tests__/unit/tools/shell-session.unit.test.ts` for active+queued
    dispose rejection semantics and Windows forced-teardown signals
- Completed P0 backlog item B02 detached process-tree cleanup hardening:
  - added `killTreeFn` injection support in
    `src/core/cli-agent/cli-agent-process-runner.ts` to make process-tree
    cleanup behavior explicit and testable
  - hardened Windows process-tree teardown with bounded-timeout
    `taskkill /PID <pid> /T /F` and direct child-kill fallback
  - preserved POSIX detached process-group kill semantics while enforcing
    deterministic fallback behavior when process-tree kill paths fail
  - expanded
    `__tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts`
    with detached spawn semantics coverage and cross-platform fallback kill
    assertions for streaming disconnect cleanup
- Completed P0 backlog item B03 terminal session retention/eviction hardening:
  - added bounded `TerminalManager` session capacity with configurable
    `maxSessions` and default `LIMIT.TERMINAL_SESSION_MAX_SESSIONS`
  - implemented deterministic eviction of oldest completed sessions before
    admitting new sessions at capacity
  - added explicit limit rejection when all retained sessions are active and no
    completed sessions are safe to evict
  - added focused unit coverage in
    `__tests__/unit/tools/terminal-manager.unit.test.ts` for eviction and
    hard-cap behavior under active/completed session mixes
- Completed P0 backlog item B04 Hook IPC transport fallback hardening:
  - added deterministic unix-socket startup fallback to HTTP in
    `src/core/cursor/hook-ipc-server.ts` for socket path/permission edge failures
  - updated shutdown cleanup semantics to key off active endpoint transport
    instead of configured transport after fallback
  - expanded
    `__tests__/unit/core/cursor/hook-ipc-server.unit.test.ts` with explicit
    unix-socket failure fallback coverage and HTTP fallback roundtrip assertions
- Completed P0 backlog item B05 Linux clipboard reliability hardening:
  - updated `src/utils/clipboard/clipboard.utils.ts` to prefer `wl-copy` on
    Wayland sessions and avoid X11 clipboard command attempts in headless mode
  - added centralized display/session env keys in `src/constants/env-keys.ts`
    (`DISPLAY`, `WAYLAND_DISPLAY`, `XDG_SESSION_TYPE`)
  - added focused clipboard unit coverage in
    `__tests__/unit/utils/clipboard.utils.unit.test.ts` for Wayland preference,
    X11 fallback, and headless no-spawn behavior
- Completed P0 backlog item B06 path-escape detection hardening:
  - added shared traversal detection utility in
    `src/utils/pathEscape.utils.ts`
  - updated `TerminalHandler` and `TerminalManager` path-escape validation to
    normalize separators and detect Windows/mixed traversal payloads
    (e.g. `..\\`, `..\\nested/../evil`)
  - expanded unit coverage in
    `__tests__/unit/core/terminal-handler.unit.test.ts` and
    `__tests__/unit/tools/terminal-manager.unit.test.ts` for Windows-style and
    mixed-separator rejection semantics
- Completed P0 backlog item B07 canonical path containment hardening:
  - added shared `isPathWithinBase` utility in
    `src/utils/pathContainment.utils.ts` using canonical relative-path
    containment checks with win32 case-insensitive normalization
  - replaced naive `startsWith` containment checks in terminal/shell/fs path
    resolution flows (`TerminalHandler`, `TerminalManager`, `ShellSession`,
    `FsHandler`)
  - added focused unit coverage for sibling-prefix rejection and win32
    case-insensitive containment behavior across terminal/shell/fs paths
- Completed P0 backlog item B08 signal-handler lifecycle hardening:
  - updated `src/core/cli-agent/cli-agent-process-runner.ts` to detach
    SIGINT/SIGTERM listeners automatically when streaming child lifecycle
    cleanup completes
  - expanded
    `__tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts`
    with repeated streaming lifecycle assertions that listener counts return to
    baseline after each run
- Completed P0 backlog item B09 timeout kill escalation hardening:
  - updated `src/core/cli-agent/cli-agent-process-runner.ts` timeout path to
    start termination with `SIGTERM` and escalate to `SIGKILL` when needed
  - added close-aware signal/wait helper semantics and explicit warning path for
    processes that remain alive after escalation
  - expanded
    `__tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts`
    with timeout escalation assertions (`SIGTERM` -> `SIGKILL`)
- Completed P0 backlog item B10 Hook IPC HTTP local-origin lock down:
  - hardened `src/core/cursor/hook-ipc-server.ts` to enforce local-only HTTP
    host binding and reject disallowed host headers / non-local remote origins
  - added explicit forbidden origin response semantics and constants updates in
    `src/config/limits.ts`, `src/constants/http-status.ts`, and
    `src/constants/server-response-messages.ts`
  - expanded hook IPC and http-status unit coverage for local-host fallback and
    origin-guard behavior
- Completed P0 backlog item B11 strict request-body memory bounds hardening:
  - hardened `src/server/request-body.ts` with preflight content-length and
    content-encoding validation before stream accumulation
  - added bounded request-body read duration using
    `SERVER_BODY_READ_TIMEOUT_MS` (`src/config/server.ts`,
    `src/config/limits.ts`)
  - added guarded request stream draining on rejection to avoid retaining
    unread payload bytes in failure paths
  - expanded coverage in:
    - `__tests__/unit/server/request-body.unit.test.ts`
    - `__tests__/unit/server/api-route-tui-handlers.unit.test.ts`
    - `__tests__/integration/server/headless-server.integration.test.ts`
    for compressed-body rejection, malformed header handling, timeout behavior,
    and endpoint-level invalid-request mapping consistency
- Completed P0 backlog item B12 in-memory session message cap hardening:
  - added `LIMIT.SESSION_MESSAGES_MAX_IN_MEMORY` and enforced per-session
    retention bounds in `src/store/app-store.ts` append path
  - evicts oldest messages for capped sessions from `state.messages` while
    preserving message retention for other sessions
  - expanded `__tests__/unit/store/app-store.unit.test.ts` with deterministic
    eviction-order and cross-session isolation assertions
- Completed P0 backlog item B13 bounded retry jitter hardening:
  - enhanced shared `retryWithBackoff` utility with bounded jitter controls
    (configurable jitter ratio + deterministic random hook for tests)
  - integrated bounded retry+jitter behavior into diff-worker bridge requests
    in `src/utils/diff/diff-worker-client.ts`
  - added retry jitter constants in `src/config/limits.ts`
  - expanded `__tests__/unit/utils/retry-with-backoff.unit.test.ts` with
    bounded jitter coverage
- Completed P0 backlog item B14 SQLite timeout/cancellation hardening:
  - added statement/transaction timeout wrappers in
    `src/store/persistence/sqlite-storage.ts` and transaction timeout usage in
    snapshot save flow
  - added worker-request timeout/cancellation + worker restart recovery logic in
    `src/store/persistence/sqlite-provider.ts`
  - added SQLite timeout constants in `src/config/timeouts.ts`
  - added focused worker-timeout restart unit coverage in
    `__tests__/unit/store/sqlite-provider.unit.test.ts`
- Follow-up stabilization on B14:
  - switched snapshot save flow to interactive Prisma transaction callback
    timeout path (compatible with current Prisma overloads) while retaining
    timeout semantics.
- Completed P0 backlog item B15 startup non-blocking update-check hardening:
  - added deferred and deduplicated background update-check scheduler in
    `src/utils/update-check.ts`
  - switched CLI startup paths to `scheduleUpdateCheck()` to avoid critical path
    blocking behavior
  - expanded `__tests__/unit/utils/update-check.unit.test.ts` coverage for
    scheduler dedupe and rejection resilience
- Completed P0 backlog item B16 provider parser-buffer cap hardening:
  - added shared capped parser buffer helper in
    `src/core/providers/stream-parser-buffer.ts`
  - applied capped chunk parsing across Anthropic/OpenAI/OpenAI-compatible/
    Ollama stream adapters
  - added parser buffer size constant in `src/config/limits.ts`
  - added focused unit coverage in
    `__tests__/unit/core/stream-parser-buffer.unit.test.ts`
- Completed P0 backlog item B17 background-task lifecycle retention hardening:
  - added completed-task retention pruning in
    `src/store/background-task-store.ts`
  - enforced completed-task max-entry and TTL retention limits via
    `src/config/limits.ts`
  - added focused unit coverage in
    `__tests__/unit/store/background-task-store.unit.test.ts`
- Completed P0 backlog item B18 spawned-process concurrency guard hardening:
  - added shared global process concurrency utility in
    `src/utils/process-concurrency.utils.ts`
  - enforced process slot limits in cli-agent runner, terminal manager,
    interactive shell, terminal handler, and search rg spawn paths
  - added process concurrency limit constant in `src/config/limits.ts`
  - added focused unit coverage in
    `__tests__/unit/utils/process-concurrency.utils.unit.test.ts`
- Completed P0 backlog item B19 clipboard pipe bounds/stall hardening:
  - added payload-size cap and child stall timeout/termination guard in
    `src/utils/clipboard/clipboard.utils.ts`
  - added clipboard pipe limits in `src/config/limits.ts`
  - expanded clipboard unit coverage for oversized payload and stalled child
    behavior in `__tests__/unit/utils/clipboard.utils.unit.test.ts`
- Completed P0 backlog item B20 crash-safe temp artifact cleanup hardening:
  - added shared temp artifact registry/cleanup utility in
    `src/utils/temp-artifact-cleanup.utils.ts`
  - registered Hook IPC unix socket artifacts for exit/signal cleanup in
    `src/core/cursor/hook-ipc-server.ts`
  - registered external editor temp directories for crash-safe cleanup in
    `src/utils/editor/externalEditor.ts`
  - added focused cleanup coverage in
    `__tests__/unit/utils/temp-artifact-cleanup.utils.unit.test.ts`
- Completed P1 backlog item B21 macOS completion-sound process retention hardening:
  - updated `src/utils/sound/completion-sound.utils.ts` to enforce single-active
    `afplay` process behavior
  - added focused unit coverage in
    `__tests__/unit/utils/completion-sound.utils.unit.test.ts`
- Completed P1 backlog item B22 Linux desktop capability detection hardening:
  - added explicit Linux desktop capability constants and detector utility in
    `src/constants/linux-desktop-capabilities.ts` and
    `src/utils/linux-desktop-capability.utils.ts`
  - routed clipboard backend selection through shared capability detection in
    `src/utils/clipboard/clipboard.utils.ts`
  - added explicit headless Linux `/copy` guard in
    `src/ui/components/chat/slash-command-actions.ts`
  - added focused coverage in
    `__tests__/unit/utils/linux-desktop-capability.utils.unit.test.ts` and
    `__tests__/unit/ui/slash-command-runner.unit.test.ts`
- Completed P1 backlog item B23 Windows command quoting hardening:
  - added shared Windows command quoting utility in
    `src/utils/windows-command.utils.ts`
  - updated interactive/background shell command builders to use
    Windows-safe quoted `/S /C` execution args
  - hardened shell-session Windows cwd quoting and external editor
    Windows argument quoting
  - added focused coverage in
    `__tests__/unit/utils/windows-command.utils.unit.test.ts` and
    `__tests__/unit/tools/shell-session.unit.test.ts`
- Completed P1 backlog item B24 shell cwd per-request isolation hardening:
  - removed implicit carried cwd session state from
    `src/tools/shell-session.ts`
  - enforced deterministic per-command cwd reset to base unless explicitly
    overridden
  - added focused regression coverage in
    `__tests__/unit/tools/shell-session.unit.test.ts`
- Completed P1 backlog item B25 terminal byte-trim complexity hardening:
  - replaced iterative O(n^2)-style byte trimming loop in
    `src/tools/terminal-manager.ts` with linear buffer slicing
  - preserved UTF-8 boundary safety for multibyte truncation paths
  - added focused regression coverage in
    `__tests__/unit/tools/terminal-manager.unit.test.ts`
- Completed P1 backlog item B26 shell-session sentinel scan optimization:
  - replaced repeated full-buffer sentinel scanning with bounded incremental
    search-window tracking in `src/tools/shell-session.ts`
  - added split-chunk sentinel regression coverage in
    `__tests__/unit/tools/shell-session.unit.test.ts`
- Completed P1 backlog item B27 Hook IPC auth/nonce handshake hardening:
  - added HTTP hook auth header constants and endpoint auth metadata support
  - enforced auth guard validation for Hook IPC HTTP requests
  - propagated hook token/nonce env to node/bash hook shims
  - added focused server and hook-env auth coverage in cursor hook tests
- Completed P1 backlog item B28 env snapshot merge reduction hardening:
  - precomputed runtime env base snapshots in terminal manager and shell session
  - replaced repeated hot-path snapshot+merge operations with overlay merges
    only when request-level env overrides are supplied
  - added focused regression coverage asserting stable snapshot-call counts
- Completed P1 backlog item B29 reconnect signal idempotency regression coverage:
  - added reconnect-cycle signal attach/detach listener-count regression checks
    in `__tests__/unit/core/cli-agent/cli-agent-process-runner.unit.test.ts`
  - added repeated-disconnect idempotency assertions to prevent signal-handler
    accumulation regressions
- Completed P1 backlog item B30 SQLite maintenance policy hardening:
  - added explicit optimize/checkpoint/vacuum cadence limits in
    `src/config/limits.ts`
  - implemented best-effort post-save maintenance lifecycle in
    `src/store/persistence/sqlite-storage.ts`
  - configured WAL autocheckpoint threshold during schema initialization
  - added focused maintenance policy coverage in
    `__tests__/unit/store/sqlite-storage.unit.test.ts`
- Completed P1 backlog item B31 recursive search depth/cancellation hardening:
  - added explicit max-depth bounds + AbortSignal cancellation support in
    `src/core/search/search-service.ts`
  - introduced bounded rg cancellation handling and deterministic cancellation
    errors
  - added focused depth/cancellation coverage in
    `__tests__/unit/core/search-service.unit.test.ts`
- Completed P1 backlog item B32 transcript virtualization strategy hardening:
  - updated `src/ui/components/MessageList.tsx` to default to full transcript
    virtualization (optional hard cap remains opt-in)
  - added large-history regression coverage in
    `__tests__/unit/ui/message-list.unit.test.ts` to verify navigation to
    earliest messages beyond prior truncation limits
- Completed P1 backlog item B33 streaming markdown reparse reduction:
  - updated `src/ui/components/messages/ContentBlockRenderer.tsx` to bypass
    markdown renderer during active streaming chunks
  - added focused renderer coverage in
    `__tests__/unit/ui/content-block-renderer.unit.test.ts`
- Completed P1 backlog item B34 streamed session export writes:
  - updated `src/utils/session-export.ts` to stream JSON/Markdown export writes
    via chunked pipelines
  - updated ZIP write path to stream zip output to disk
  - expanded export coverage in
    `__tests__/unit/utils/session-export.unit.test.ts` across JSON/Markdown/ZIP
- Completed P1 backlog item B35 telemetry write batching/throttling:
  - added telemetry flush interval + batch-size limits in
    `src/config/limits.ts`
  - implemented queued snapshot buffering and timed flush batching in
    `src/utils/token-optimizer/telemetryStorage.ts`
  - added timer-window batching coverage in
    `__tests__/unit/utils/telemetry-storage.unit.test.ts`
- Completed P1 backlog item B36 update-check runtime TTL caching:
  - added runtime update-check TTL limit in `src/config/limits.ts`
  - implemented runtime in-memory update-check result caching in
    `src/utils/update-check.ts`
  - added focused dedupe coverage in
    `__tests__/unit/utils/update-check.unit.test.ts`
- Completed P1 backlog item B37 provider retry de-correlation:
  - added decorrelated retry-base offsets in
    `src/utils/async/retryWithBackoff.ts`
  - added focused delay-spread coverage in
    `__tests__/unit/utils/retry-with-backoff.unit.test.ts`
- Completed P1 backlog item B38 provider failure payload bounding:
  - added provider payload truncation utilities in
    `src/core/providers/provider-error.utils.ts`
  - enforced bounded provider HTTP failure payload formatting across OpenAI,
    OpenAI-compatible, Anthropic, and Ollama adapters
  - added focused truncation coverage in
    `__tests__/unit/core/provider-error.utils.unit.test.ts`
- Completed P1 backlog item B39 command-palette recompute throttling:
  - updated `src/ui/components/CommandPalette.tsx` to use deferred query value
    for filter recompute throttling under rapid input
  - added focused deferred-filter regression coverage in
    `__tests__/unit/ui/sidebar-footer-prompt-palette.unit.test.ts`
- Completed P1 backlog item B40 nested hook/prompt chain depth caps:
  - enforced async-context-local hook depth capping in
    `src/hooks/hook-manager.ts`
  - preserved concurrent root hook execution isolation while bounding nested
    recursive hook chains
  - added focused nested-depth + concurrent-root regression coverage in
    `__tests__/unit/hooks/hook-manager.unit.test.ts`
- Completed P2 backlog item B41 platform command adapter consolidation:
  - introduced shared platform shell adapter in
    `src/utils/platform-shell.utils.ts`
  - migrated shell-session, interactive-shell, and background-task-manager to
    the shared adapter to remove duplicate Windows/POSIX command resolution
  - added focused adapter coverage in
    `__tests__/unit/utils/platform-shell.utils.unit.test.ts`
- Completed P2 backlog item B42 shell invocation deduplication:
  - introduced shared shell invocation utility in
    `src/utils/shell-invocation.utils.ts`
  - migrated shell-session, interactive-shell, and background-task-manager to
    shared invocation helper functions
  - added focused invocation coverage in
    `__tests__/unit/utils/shell-invocation.utils.unit.test.ts`
- Completed P2 backlog item B43 clipboard fallback strategy simplification:
  - introduced explicit capability-ranked clipboard strategy constants and
    resolver utilities in `src/utils/clipboard/clipboard.utils.ts`
  - reused shared clipboard support helper in `/copy` slash-command
    availability checks
  - added focused command-chain/support coverage in
    `__tests__/unit/utils/clipboard.utils.unit.test.ts`
- Completed P2 backlog item B44 reconnect jitter scaffolding simplification:
  - extracted shared reconnect segment distribution helper in
    `__tests__/integration/server/headless-server.integration.test.ts`
  - introduced typed reconnect jitter matrix helper for grouped jitter values
  - updated reconnect-order jitter integration coverage to use typed matrix
    config output
- Completed P2 backlog item B45 typed delay helper reuse:
  - added shared typed delay helpers in
    `__tests__/integration/server/headless-server.integration.test.ts`
  - replaced repeated inline timeout-promise wrappers with shared delay helpers
    across reconnect timing paths
- Completed P2 backlog item B46 NutJS capability detector:
  - added typed NutJS capability constants in
    `src/constants/nutjs-capabilities.ts`
  - added capability detector + explicit no-op helper in
    `src/utils/nutjs-capability.utils.ts`
  - added focused no-op/supported behavior coverage in
    `__tests__/unit/utils/nutjs-capability.utils.unit.test.ts`
- Completed P2 backlog item B47 NutJS permission diagnostics:
  - added typed NutJS permission and Windows integrity constants in
    `src/constants/nutjs-permissions.ts`
  - added cross-platform NutJS permission diagnostics utility in
    `src/utils/nutjs-permission-diagnostics.utils.ts`
  - added focused diagnostics coverage in
    `__tests__/unit/utils/nutjs-permission-diagnostics.utils.unit.test.ts`
- Completed P2 backlog item B48 NutJS feature-flag + allowlist gate:
  - added typed NutJS execution outcome constants in
    `src/constants/nutjs-execution.ts`
  - added NutJS execution gate utility enforcing feature flag + allowlist in
    `src/utils/nutjs-execution-gate.utils.ts`
  - documented optional env keys in `.env.sample`
  - added focused gate coverage in
    `__tests__/unit/utils/nutjs-execution-gate.utils.unit.test.ts`
- Completed P2 backlog item B49 NutJS CI smoke matrix:
  - added cross-platform `nutjs-smoke` matrix job in `.github/workflows/ci.yml`
  - added NutJS smoke e2e coverage in
    `__tests__/e2e/skippable.nutjs-smoke.e2e.test.ts`
  - expanded CI workflow assertions in
    `__tests__/unit/scripts/ci-workflow.unit.test.ts`
- Completed P2 backlog item B50 fallback precedence consolidation:
  - added shared fallback precedence constants in
    `src/constants/platform-fallback-precedence.ts`
  - rewired clipboard, sound, and NutJS gate paths to consume shared precedence
    constants
  - added fallback precedence docs in `docs/platform-fallback-precedence.md`
  - added focused fallback precedence coverage in
    `__tests__/unit/constants/platform-fallback-precedence.unit.test.ts`
- Added severity-ordered simplification backlog in PLAN3:
  - appended 50 incomplete tasks using strict checkbox plan format
    (`- [ ] - ...`) with no emoji markers
  - tasks categorized by severity (P0/P1/P2) and focused on:
    - cross-platform reliability (Windows/Linux/macOS)
    - performance and memory-pressure hardening
    - process lifecycle leak prevention
    - NutJS capability/readiness and fallback safety
    - simplification-first architecture cleanup

## Exit Criteria
- PLAN3 remains fully checked and validated.
- No quality-gate regressions (`lint`, `typecheck`, `test`, `build`).
- New hardening increments documented in PLAN3 execution log.
