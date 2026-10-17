import { describe, expect, it, vi } from "vitest";
import { DEFAULT_GROQ_MODEL, GROQ_CHAT_ENDPOINT, GroqContentProvider, HuggingFaceContentProvider } from "./huggingface";
import { GroqVideoPlanner } from "./huggingface-video-plan";
import type { UsageStore } from "./index";
const input = { workspaceId:"ws", brandName:"Orbit", voice:"Clear", audience:"Creators", topic:"A product introduction", platforms:["facebook" as const] };
const variants = [{ platform:"facebook", copy:"An idea for your next post.", hashtags:[], callToAction:"What will you create?" }];
function store(): UsageStore { return { find:vi.fn().mockResolvedValue(null), monthlyCost:vi.fn().mockResolvedValue(0), save:vi.fn() }; }
const completion = () => Response.json({choices:[{finish_reason:"stop",message:{content:JSON.stringify({variants})}}]});
describe("Groq text and video planning", () => {
  it("uses only the fixed Groq endpoint and Groq key with validated saved output", async () => {
    const usage=store(), fetcher=vi.fn().mockResolvedValue(completion());
    const result=await new GroqContentProvider(usage,{apiKey:"gsk_fixture",fetch:fetcher}).generateVariants(input);
    expect(result.variants).toEqual(variants);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(GROQ_CHAT_ENDPOINT,expect.objectContaining({redirect:"error",headers:expect.objectContaining({Authorization:"Bearer gsk_fixture"})}));
    const request=JSON.parse(fetcher.mock.calls[0][1].body);
    expect(request).toMatchObject({model:DEFAULT_GROQ_MODEL,max_completion_tokens:3000,include_reasoning:false,reasoning_effort:"low"});
    expect(request).not.toHaveProperty("reasoning_format");
    expect(request).not.toHaveProperty("max_tokens");
    expect(usage.save).toHaveBeenCalledOnce();
  });
  it("separates provider caches even when model names are identical", async () => {
    const usage=store(), fetcher=vi.fn().mockImplementation(async()=>completion());
    const groq=await new GroqContentProvider(usage,{apiKey:"gsk_fixture",model:DEFAULT_GROQ_MODEL,fetch:fetcher}).generateVariants(input);
    const hf=await new HuggingFaceContentProvider(usage,{apiKey:"hf_fixture",model:DEFAULT_GROQ_MODEL,fetch:fetcher}).generateVariants(input);
    expect(groq.usage.requestHash).not.toBe(hf.usage.requestHash);
  });
  it("reports Groq limits without retrying or falling back to another provider", async () => {
    const fetcher=vi.fn().mockResolvedValue(new Response("private upstream details",{status:429}));
    await expect(new GroqContentProvider(store(),{apiKey:"gsk_fixture",fetch:fetcher}).generateVariants(input)).rejects.toMatchObject({code:"rate_limited"});
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe(GROQ_CHAT_ENDPOINT);
  });
  it("uses the Groq route for brief-only video plans", async () => {
    const plan={title:"Test",captions:[],scenes:[{text:"Show the product",start:0,end:5}]};
    const fetcher=vi.fn().mockResolvedValue(Response.json({choices:[{message:{content:JSON.stringify(plan)}}]}));
    expect(await new GroqVideoPlanner("gsk_fixture",undefined,fetcher).plan({brief:"Introduce a product",duration:5})).toEqual(plan);
    expect(fetcher.mock.calls[0][0]).toBe(GROQ_CHAT_ENDPOINT);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).model).toBe(DEFAULT_GROQ_MODEL);
  });
});
