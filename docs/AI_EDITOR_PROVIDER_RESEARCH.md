# AI editing: verified routes and activation boundaries

Checked against primary provider documentation on 21 October 2026. This is capability/configuration research, not evidence of successful paid inference.

## Current Orbit implementation

- **Groq** converts instructions into existing editable settings and can inspect one explicitly shared reduced preview. Its documented catalog is text/reasoning, OCR/image recognition and speech, not an image-generation endpoint. Do not present a Groq text key as funding image/video generation.
- **HF/fal-ai** remains the default image engine (`Qwen/Qwen-Image-Edit`) using server-only `HF_TOKEN`. Image-to-image transforms existing pixels. A configured token does not establish provider access or remaining credits. Do not retry across providers or activate paid billing silently.
- **Gemini Nano Banana 2.1** is already integrated with its documented `gemini-nano-banana-2.1` model and `POST https://generativelanguage.googleapis.com/v1beta/interactions`. The REST schema supports inline image/text input, `response_format` image/JPEG/1K/inline, `store:false`, and `steps[].type=model_output` containing inline image content. Rechecking the official reference found no model/endpoint mismatch to fix.

To select Gemini, the owner configures **API server** production environment `AI_IMAGE_PROVIDER=gemini` and sensitive `GEMINI_API_KEY`, then redeploys the API. Keep the existing HF key; changing selection does not call both providers. Google currently lists Nano Banana 2.1 image inference as **not available on the API Free Tier**. Its advertised standard 1K image output equivalent is USD0.0336, with input usage additional. This is not a promise of account access or a free daily image allowance. No billing, account or paid request was activated in this task. The user must approve/provider-configure paid access before a real inference acceptance test.

The existing **Edit image with AI** button explicitly shares a bounded reduced preview with the selected image engine. The Orbit Assistant now transfers supported pixel-edit briefs into that panel instead of asking the text planner to invent pixels. The user sees the provider/upload notice and performs the actual edit there. It does not silently send media from the text planner.

## The reported motion instruction

`Make the screen moving` is a request for motion of the current still. Orbit now recognises this as local camera movement and offers slow zoom in/out or pan left/right. The main canvas previews actual transformed pixels, and the same draw function renders the image-movie export with optional existing music. Reset motion restores a still frame. PNG/JPEG export remains a still image. No new subject movement, scene animation, talking person, generated footage or provider call is claimed. Instructions asking a person/face/subject to dance/walk/talk are not mapped to camera movement.

True image-to-video needs an approved video provider, server upload/job lifecycle, retention/consent choices, account credits and an end-to-end paid acceptance test; a still-image engine alone does not supply it.

## Other supplied providers

| Provider | Verified capability | Integration boundary |
| --- | --- | --- |
| Claid | Product backgrounds, cutouts, upscaling/outpainting, product image-to-video API | Separate Claid API key/account and credits. Suitable for product workflows. Needs verified endpoint contract, output storage/security and real account acceptance before activation. |
| IMG.LY | CE.SDK AI editor UI/plugins, custom asset sources, image/video features and provider-agnostic endpoints | Licensed editor SDK; generative model usage billed separately. Installing it would replace/expand the existing editor UI and exceed the user's no-redesign instruction. Not installed. |
| Pixazo | Aggregator catalog for image editing, including Nano Banana, GPT Image, Seedream, plus image-to-video | Separate API key and pay-per-edit provider billing. Catalog availability is not access verification. No extra unconfigured adapter was added merely to multiply unavailable provider choices. |
| OpenAI | Official `/v1/images/edits` API; GPT Image2.5 Sunburst for precise editing and Flare for fast generation/editing | Separate OpenAI Platform API key/billing; provider organization access may be required. ChatGPT subscription/login does not itself supply an application API credential. No key setup, provider call or billing activation performed. |

## Primary references

- Google image guide: https://ai.google.dev/gemini-api/docs/image-generation
- Google REST schema: https://ai.google.dev/api/interactions-api
- Google API pricing: https://ai.google.dev/gemini-api/docs/pricing#gemini-nano-banana-2.1
- Groq model catalog: https://console.groq.com/docs/models
- Hugging Face task contract: https://huggingface.co/docs/inference-providers/en/tasks/image-to-image
- Claid APIs: https://claid.ai/apis and https://claid.ai/api-pricing
- IMG.LY editor/license/provider boundary: https://img.ly/use-cases/ai-editor/
- Pixazo editing catalog and per-edit billing: https://www.pixazo.ai/api/image-editing
- OpenAI image editing reference: https://developers.openai.com/api/reference/resources/images/methods/edit
- OpenAI image guide: https://developers.openai.com/api/docs/guides/image-generation
