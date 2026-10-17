import { describe, expect, it, vi } from "vitest";
import { HuggingFaceVideoPlanner, parseVideoPlan, validateVideoPlanInput } from "./huggingface-video-plan";
import { HF_CHAT_ENDPOINT } from "./huggingface";
const plan = { title: "Suggested video", captions: [{ text: "Hello", start: 0, end: 2 }], scenes: [{ text: "Show product", start: 0, end: 5 }] };
describe("brief-only video AI planning", () => {
  it("accepts bounded exact JSON with chronological timestamps", () => { expect(parseVideoPlan(JSON.stringify(plan), 5)).toEqual(plan); });
  it("rejects invalid input, output fields and timestamps", () => {
    for (const value of [{ brief: "", duration: 5 }, { brief: "x".repeat(3001), duration: 5 }, { brief: "x", duration: 601 }, { brief: "x", duration: -1 }]) expect(() => validateVideoPlanInput(value)).toThrow();
    for (const value of [{ ...plan, unknown: true }, { ...plan, captions: [{ text: "x", start: 1, end: 0 }] }, { ...plan, scenes: [{ text: "x", start: 0, end: 6 }] }, { ...plan, scenes: [{ text: "x", start: 0, end: 3 }, { text: "x", start: 2, end: 4 }] }, { ...plan, captions: Array(21).fill(plan.captions[0]) }]) expect(() => parseVideoPlan(JSON.stringify(value), 5)).toThrow();
    expect(() => parseVideoPlan("```json\n{}\n```", 5)).toThrow();
  });
  it("uses fixed route, no redirects, bounded output tokens and brief-only instructions", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify(plan) } }] }));
    expect(await new HuggingFaceVideoPlanner("hf_test", undefined, fetcher).plan({ brief: "Hello", duration: 5 })).toEqual(plan);
    expect(fetcher.mock.calls[0][0]).toBe(HF_CHAT_ENDPOINT);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: "error", credentials: "omit" });
    const body = JSON.parse(fetcher.mock.calls[0][1].body); expect(body.max_tokens).toBe(2000); expect(body.messages[0].content).toContain("NOT viewed or heard");
  });
  it("masks provider exceptions and rejects arbitrary model URLs", async () => {
    expect(() => new HuggingFaceVideoPlanner("hf_test", "https://evil.test/model")).toThrow();
    const fetcher = vi.fn().mockRejectedValue(Error("hf_secret provider raw text"));
    await expect(new HuggingFaceVideoPlanner("hf_test", undefined, fetcher).plan({ brief: "x", duration: 5 })).rejects.toThrow("AI is temporarily unavailable");
  });
});
