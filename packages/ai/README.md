# Orbit AI writing

`HuggingFaceContentProvider` is a server-only adapter. The API supplies the platform's `HF_TOKEN`; customers do not enter provider keys. The endpoint is fixed to Hugging Face's inference router and redirects fail closed to avoid credential forwarding. Never import this provider into browser components.

Supported tasks: `caption`, `ideas`, `rewrite`, `hashtags`, `script`. Requests include a brand name, voice, audience, optional factual context and language, topic, and selected platforms. Defaults are caption and Bahasa Melayu. Drafts are structured, bounded, validated and require human review. No output is published by this adapter.

The adapter accepts the existing `UsageStore` interface. Production must supply persistent workspace-scoped storage and enforce atomic generation quotas before the request. `MemoryUsageStore` is for development/tests only and does not coordinate concurrent requests. Cache keys include workspace, provider, model, task, language and brief. A cached result is revalidated before use.

HF routing costs depend on provider/model and are not inferred from token counts. `estimatedCostUsd: 0` means unpriced, **not free**. Generation units are the enforceable allowance until trusted provider billing data is integrated. Token counts are recorded when returned by the provider. Existing OpenAI cost estimates do not apply to HF.

Failures return fixed safe errors; upstream response text and credentials are not logged or returned. Responses have a 45-second timeout, 120 KB body cap and output/field limits. Truncated outputs, extra channels and invalid JSON are rejected rather than saved as drafts. No mock fallback exists.

API reference: https://huggingface.co/docs/inference-providers/tasks/chat-completion
