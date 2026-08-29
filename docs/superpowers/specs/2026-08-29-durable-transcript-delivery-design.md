# Durable Transcript Delivery Design

## Problem

Uploaded videos are submitted to AssemblyAI, but completed transcripts do not reliably appear in the Motion workspace. The UI itself renders correctly and displays its empty state because `job.artifacts.transcript` remains empty.

The current transcription implementation writes `artifacts`, `transcript_status`, and `transcript_text` as top-level `durable_jobs` columns. The repository schema stores job payloads in `durable_jobs.result_metadata`; those top-level columns do not exist. The update errors are not checked, so the persistence failure is silent. The editor then reads `job.resultMetadata.artifacts`, which cannot contain the transcript. An unawaited polling loop inside the upload request also relies on request-process lifetime and is not a durable worker.

## Approved Design

AssemblyAI remains the transcription provider. Upload dispatch only submits the job and persists its ID and state on `source_assets`. Completion is finalized by an authenticated, bounded sync request that reads AssemblyAI status and persists one normalized transcript consistently.

The persistence operation updates:

- `source_assets` transcript status, text, error, and R2 key;
- the source-analysis `durable_jobs.result_metadata`, preserving all existing metadata and artifacts while setting `transcriptStatus`, `transcriptText`, and `artifacts.transcript`;
- `projects.source_profile`, preserving inspection and classification fields while setting `transcript`.

The editor status loop requests transcript synchronization whenever its current source asset exists and no transcript segments are available. A completed response is applied to in-memory project and job state immediately, so rendering does not depend on a separate realtime event. Polling stops for terminal completion or failure and uses the existing interval lifecycle.

## Boundaries

The shared persistence builder is a pure module. It constructs database patches from existing job metadata, existing source profile, and normalized segments. Routes own authentication, provider calls, R2 writes, and database I/O.

No AWS Lambda resource is added in this change. A Lambda consumer would still need to write the same correct `result_metadata` contract, so adding infrastructure before fixing the contract would preserve the observed failure. Modal source analysis remains optional and is not used as the transcript completion authority.

## Error Handling

Every Supabase write that is required for editor visibility is checked and surfaced. R2 transcript archival remains best-effort because database delivery to the editor is the critical path. Provider failures set the asset to `failed`; transient queued/processing states remain pollable.

## Testing

Pure regression tests verify that transcript persistence patches preserve unrelated job artifacts and source-profile inspection data while inserting the normalized transcript at the exact paths consumed by the editor. Existing motion transcript adapter tests verify millisecond-to-second conversion. Typecheck and production build validate route/schema usage and the editor integration.
