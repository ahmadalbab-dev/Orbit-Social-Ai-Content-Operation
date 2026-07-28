# 4Life Transfer Factor Malaysia content playbook

This playbook supports product-led social content while keeping every claim reviewable. Product facts, prices, availability, and approved wording must be checked against the official [4Life Malaysia shop](https://malaysia.4life.com/corp/shop/all) before publication.

## Default campaign prompt

Use the following brief in Content Studio:

> Create a trustworthy Malaysia-focused social campaign for a 4Life Transfer Factor product. The goal is to help an interested customer understand the product and visit the official shop. Write naturally in Malaysian English, with an optional Bahasa Malaysia variation. Use only facts supplied in the brief or visible on the official product page. Do not say or imply that the product diagnoses, treats, cures, or prevents disease. Do not invent clinical results, testimonials, scarcity, discounts, prices, ingredients, or regulatory approval. Separate personal experience from verified facts. Produce: one Facebook educational post, one Instagram caption with a clear visual concept and 5 relevant hashtags, and one TikTok script with a 2-second hook, 3 short scenes, on-screen text, voiceover, and a gentle call to action. Add a short compliance-review note listing every claim that needs human verification.

## Low-cost production path

1. Use the app's existing OpenAI provider for copy variants, structured output, caching, and workspace limits.
2. Use the in-app short-video storyboard to approve the hook, scenes, captions, and call to action.
3. Export media to CapCut or Canva for a manual first release.
4. Add Remotion rendering only when repeatable automated video volume justifies its commercial licensing requirements.
5. Gemini is optional for multimodal drafting or analysis. Store `GEMINI_API_KEY` in the local environment or deployment secret manager, never in source control or chat.

## Required human review

- Confirm product name, ingredients, price, stock, delivery area, and official page link.
- Remove medical or guaranteed-outcome language.
- Confirm that images, music, testimonials, and logos are licensed.
- Approve the final post inside the app before scheduling.
