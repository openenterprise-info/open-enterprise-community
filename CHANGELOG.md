# Changelog

All notable changes to Open Enterprise are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [v1.3.2] — 2026-07-22

### Added
- **Search connectors** — Perplexity, Google Custom Search, Bing
- **OCR connectors** — Azure Vision, Google Vision, AWS Textract, Tesseract
- **Image Generation connectors** — OpenAI (`gpt-image-1`), FLUX (Together AI), Stable Diffusion, Ideogram
- **Speech & Audio connectors** — ElevenLabs, OpenAI TTS, Azure Speech, Google TTS
- **Video Generation connectors** — Runway, Kling, Pika (async job polling included)
- **Music Generation connectors** — Suno, Udio (async job polling included)
- **CLI `--param key=value` flag** — inject agent parameters at runtime; substitutes `{{param_name}}` placeholders in agent prompts (repeatable flag)
- **`onToolResult` hook** — tool call results now printed to terminal with `↳` prefix so you can see exactly what each tool returned
- **Cross-platform runtime** — `oe-runtime-win.exe` (Windows), `oe-runtime-linux` (Linux), `oe-runtime-macos` (macOS) all built automatically on release
- Connector catalog now at **2,673 entries** across 45+ categories

### Fixed
- OpenAI image generation: removed unsupported `style` and `response_format` params that caused 400 errors
- Image generation errors now returned as strings to the LLM instead of throwing (agent sees the error and can retry)
- Default OpenAI image model changed from `dall-e-3` to `gpt-image-1`

---

## [v1.3.1] — 2026-07-20

### Changed
- Community telemetry enabled by default in Docker builds

---

## [v1.3.0] — 2026-07-20

### Added
- Discord community badge and links across README and UI
- Telemetry bootstrap for aggregated usage insights (no PII)
- AI Ecosystem messaging on login page and marketing copy

### Fixed
- SSO / OAuth redirect ports corrected to 3000/3001

---

## [v1.2.9] — 2026-07-19

### Changed
- Docker image name now derived automatically from the GitHub repository name (no hardcoded values)

---

## [v1.2.8] — 2026-07-18

### Fixed
- CI workflow uses `DOCKER_IMAGE` repository variable for Docker Hub image name

---

## [v1.2.7] — 2026-07-18

### Fixed
- CI auto-detects repository name to resolve the correct Docker Hub image path

---

## [v1.2.6] — 2026-07-18

### Added
- Workspace sharing enforcement — agents and connectors respect workspace-level share settings
- Branding controls gated to enterprise license (white-label, custom logo, colors)

### Fixed
- Agent Builder SSE streaming hang and frontend rendering issues
- SSO port configuration

---

## [v1.2.5] — 2026-07-18

### Added
- Agent Builder — conversational YAML designer with live preview
- Visual Flow and YAML tabs in the Agent Builder right panel
- Save-to-Marketplace and Download-YAML actions on agent templates
- Agent Builder chat persisted to `localStorage` across navigation

---

## [v1.2.4] — 2026-07-15

### Added
- Enterprise license gate for commercial features (SSO, tier limits, DLP purge, Agent Builder)
- Marketplace two-tab layout (Browse / My Agents) with shared `AgentVisualFlow` component
- Editable YAML drawer and step validation in Agent Builder

### Changed
- Version badge moved to sidebar
- Footer updated to `www.openenterprise.info`

---

## [v1.2.3] — 2026-07-14

### Changed
- README "Who It's For" section rewritten as a product pitch
- Infrastructure & Deployment section added (K8s, HA, multi-region, cloud options)

---

## [v1.2.2] — 2026-07-13

### Fixed
- Workspace creation reference corrected — Community Edition has no Admin Panel for this flow

---

## [v1.2.1] — 2026-07-13

### Changed
- README updated with license tier documentation, JWT notes, and enterprise feature list

---

## [v1.2.0] — 2026-07-13

### Added
- Connector catalog expanded to **1,541 entries** across 39 categories
- 8 new native adapters: S3-compatible storage, Kafka/SQS/Pub-Sub, MQTT/IoT, LDAP/Active Directory, GraphQL, Web3/Blockchain, OneDrive/Dropbox/Box, SFTP

---

## [v1.1.0] — 2026-07-09

### Added
- `oe-runtime` CLI binary — run any agent YAML locally with `oe-runtime agent.yaml`
- Connector Library UI — browse and filter all connector types by category
- Dynamic credential forms per connector type
- CI Docker build now triggers on version tags

---

## [v1.0.0] — 2026-07-08

### Added
- Initial release of Open Enterprise Community Edition
- Multi-LLM support: 17+ providers (OpenAI, Anthropic, Azure OpenAI, Groq, Gemini, Ollama, Mistral, and more)
- RAG pipeline: ingestion queue, chunking, embedding, vector upsert, similarity search, cited responses
- 8 vector database adapters: LanceDB (default), Pinecone, Qdrant, Chroma, Weaviate, PgVector, Milvus, Zilliz
- 7 embedding providers: OpenAI, Azure, Ollama, Cohere, Gemini, and more
- AI Assistant / Chat: SSE streaming, RAG, tool calling, conversation threads, @connector and @agent routing
- Workspaces: CRUD, user roles, per-workspace LLM and vector DB overrides
- Agent system: CRUD, slug addressing, YAML export, run history, SSE streaming, cron scheduling, group tagging
- Sequential agent chaining with `always / on_success / on_critical / on_warning` conditions
- DLP governance: block / warn / redact / audit policies, custom regex, violations audit log with CSV export
- Token usage dashboard: per-user input/output/embedding token costs with period filters
- Activity log: admin action timeline with category filters
- Dashboard: run counts, success/error rates, 30-day trend charts
- Single Docker container deployment (`docker compose up`)
