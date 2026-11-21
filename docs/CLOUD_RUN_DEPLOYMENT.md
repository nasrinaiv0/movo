# Google Cloud Run preparation

2026-11-21. The owner selected **Prepare for Google Cloud Run**. No Google project, registry, service, secrets, IAM binding, DNS or paid resource has been created. No cloud credential is present in this repository. [Hosting design and outage limitations](MOVO_HOSTING_RESILIENCE.md).

## Prepared artifacts

- `Dockerfile.cloud-run`: pinned official Node 26.13.1 image; original-only frontend build; separate production-only runtime dependencies; non-root process binding `0.0.0.0` to the supplied `PORT`.
- `Dockerfile.cloud-run.dockerignore`: allowlisted build context. Excludes credentials, Git history, local dependencies, owner/store evidence and unreviewed legacy media. Collected notices do not establish ownership or name clearance.
- `scripts/render-cloud-run-service.cjs`: local JSON/YAML-compatible service renderer. Requires a real project, region, runtime service account and immutable image digest from that project's regional Artifact Registry. Refuses mutable tags, foreign projects and unpinned secret versions. Does not invoke Google APIs.
- `scripts/smoke-cloud-run-container.cjs` and `.github/workflows/cloud-run-container.yml`: build/test only; no registry push, deployment, IAM changes or secrets. Check non-root execution, injected port, reachable container interface, read-only operation, bundled frontend/notices, auth/billing denial and asset/source exclusions.

The same Supabase project remains authoritative. No server filesystem becomes a financial store. The image contains the reviewed source transport and existing handlers, not a replacement database or framework.

## Local image verification

```sh
docker build --platform linux/amd64 --file Dockerfile.cloud-run --tag movo-cloud-run:local .
node scripts/smoke-cloud-run-container.cjs movo-cloud-run:local
```

An execution environment with an enterprise TLS proxy can supply its trusted CA with `--secret id=npm_ca,src=/path/to/trusted-ca.crt`. This optional BuildKit mount exists only during package installation; it is not copied into the runtime image. Do not disable certificate validation or bake proxy credentials into layers.

## Inputs required for actual deployment

Choose the Google Cloud project, region near the existing database/users, Artifact Registry repository and dedicated runtime service account. Review costs/budgets and use the project's existing account controls before creating resources. Configure Cloud Run/Artifact Registry/Secret Manager APIs and limited deployer permissions. Give the runtime identity access only to the necessary secrets; do not grant project-wide Owner/Editor for MOVO.

The initial service references these pre-existing, **numeric-version** Secret Manager entries:

| Runtime variable | Secret name | Purpose |
| --- | --- | --- |
| `SUPABASE_ANON_KEY` | `movo-supabase-public-key` | Existing project's public/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | `movo-supabase-service-role` | Existing server-only privileged operations, behind existing application auth |

Set `MOVO_GCP_PUBLIC_KEY_VERSION` and `MOVO_GCP_SERVICE_KEY_VERSION` to their actual reviewed versions (default `1`, not `latest`). The renderer reads the existing public Supabase origin from `.env.production`; it does not change the database. Optional AI, market, owner/MFA, store verification, notification and cron credentials need corresponding version-pinned runtime secret references before those features can be accepted. Keep `MOVO_STORE_BILLING_ENABLED=false` while the existing store rollout gates remain open. No provider/service-role/store secret belongs in the image, public frontend variables or generated manifest values.

## Render and review a staging service

After the project/repository and permissions are ready, publish the exact tested local image to the selected private Artifact Registry. These commands perform real authentication/publishing and have not been run here:

```sh
export MOVO_GCP_PROJECT='your-real-project-id'
export MOVO_GCP_REGION='your-selected-region'
export MOVO_GCP_IMAGE_TAG="${MOVO_GCP_REGION}-docker.pkg.dev/${MOVO_GCP_PROJECT}/movo/movo:tested-candidate"
gcloud auth configure-docker "${MOVO_GCP_REGION}-docker.pkg.dev"
docker tag movo-cloud-run:local "$MOVO_GCP_IMAGE_TAG"
docker push "$MOVO_GCP_IMAGE_TAG"
docker image inspect "$MOVO_GCP_IMAGE_TAG" --format '{{range .RepoDigests}}{{println .}}{{end}}'
```

Use the returned immutable registry digest below. Do not substitute an unreviewed public image or a mutable tag.

```sh
export MOVO_GCP_PROJECT='your-real-project-id'
export MOVO_GCP_REGION='your-selected-region'
export MOVO_GCP_SERVICE_ACCOUNT="movo-runtime@${MOVO_GCP_PROJECT}.iam.gserviceaccount.com"
export MOVO_GCP_IMAGE="${MOVO_GCP_REGION}-docker.pkg.dev/${MOVO_GCP_PROJECT}/movo/movo@sha256:YOUR_REAL_IMAGE_DIGEST"
node scripts/render-cloud-run-service.cjs > /tmp/movo-cloud-run-service.json
```

The examples intentionally fail validation until actual inputs are supplied. The default target is `movo-staging`, with zero minimum instances, two maximum instances, 1 CPU / 1 GiB, concurrency 8, a 90-second request limit and process-health startup/liveness probes. These are bounded initial settings, not a performance guarantee or a hard billing cap. The Node transport retains its own body/socket deadlines. Health probes prove the process responds, not that upstream providers or billing work.

Review the rendered manifest and existing service/IAM policy before applying it. When deployment is intended and the selected project's prerequisites are satisfied, the operator can apply the concrete file:

```sh
gcloud run services replace /tmp/movo-cloud-run-service.json \
  --project="$MOVO_GCP_PROJECT" --region="$MOVO_GCP_REGION"
```

This command creates/replaces a real service and can incur charges; it has **not** been run here. The renderer does not grant `allUsers`, disable the Cloud Run invoker check or change DNS. Newly created services use the project's IAM controls; an existing service can already have public bindings, so verify its actual policy rather than assuming the manifest makes it private. Stage under a separate service name rather than replacing a live service accidentally.

## Acceptance and public domain cutover

Test private staging first using an authorized Google caller. For tests that also need the application's Supabase bearer token, keep Google invocation identity in `X-Serverless-Authorization` and application identity in `Authorization`; do not replace MOVO's user token or weaken handler checks. Test enabled providers with disposable data, owner isolation, signed native callbacks and a real build. Local container success is not public-cloud or signed-device acceptance.

Before exposing the public app, choose the intended Cloud Run/load-balancer invocation policy, exact browser CORS origins, TLS/domain routing and request monitoring. Preserve `movo.nasrinai.com` when possible so old binaries, browser storage and existing links remain valid. Native users cannot satisfy a private Google IAM gate with a Supabase token alone. Public HTTP invocation for MOVO would be a deliberate infrastructure setting; the application APIs must still require their existing user/owner/store authorization.

Retain the [hosting runbook's acceptance checklist](MOVO_HOSTING_RESILIENCE.md#deployment-acceptance-before-changing-traffic), including app-link/legal/support pages, store webhook signature/audience validation and an external authenticated ten-minute acknowledgement schedule. Cloud Run does not execute `vercel.json` cron declarations. Do not promise AI, sharing or verified purchases until their real runtime secrets/configuration and integration tests pass.

Record the serving image digest and previous revision before switching traffic. Roll back the service image/traffic and domain route if needed; do not roll back the database or clear devices, recovery copies or pending operation IDs. No App Store naming/rights/device gate is waived by this hosting preparation.

Official references checked 2026-11-21: [container contract](https://cloud.google.com/run/docs/container-contract), [Secret Manager integration](https://cloud.google.com/run/docs/configuring/services/secrets), [container deployment](https://cloud.google.com/run/docs/deploying), [separate invocation/application authorization](https://cloud.google.com/run/docs/authenticating/service-to-service).
