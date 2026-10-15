import { describe, expect, it, vi } from "vitest";
import { AiProviderError, HF_CHAT_ENDPOINT, HuggingFaceContentProvider, parseSocialDrafts, readBoundedAiJson } from "./huggingface";
import type { UsageStore } from "./index";
const input = {workspaceId:"workspace-one",brandName:"Orbit",voice:"Santai",audience:"SMEs",topic:"Introduce a new product",platforms:["threads" as const]};
const variant = {platform:"threads" as const,copy:"Bina idea bersama Orbit.",hashtags:["#Orbit"],callToAction:"Apa idea kau?"};
function store(): UsageStore { return {find:vi.fn().mockResolvedValue(null),monthlyCost:vi.fn().mockResolvedValue(0),save:vi.fn().mockResolvedValue(undefined)}; }
function completion(content = JSON.stringify({variants:[variant]})) { return new Response(JSON.stringify({choices:[{finish_reason:"stop",message:{content}}],usage:{prompt_tokens:42,completion_tokens:20}})); }
describe("Hugging Face commercial content provider", () => {
  it("calls only fixed router with platform token and validated drafts", async () => {
    const usageStore = store(); const fetcher = vi.fn().mockResolvedValue(completion());
    const provider = new HuggingFaceContentProvider(usageStore,{apiKey:"hf_private",fetch:fetcher});
    const result = await provider.generateVariants({...input,mode:"script"});
    expect(result.variants).toEqual([variant]); expect(result.usage.inputTokens).toBe(42);
    expect(fetcher.mock.calls[0][0]).toBe(HF_CHAT_ENDPOINT);
    const request = fetcher.mock.calls[0][1]; expect(request.redirect).toBe("error");
    expect(request.headers.Authorization).toBe("Bearer hf_private");
    expect(JSON.stringify(JSON.parse(request.body).messages)).not.toContain("hf_private");
    expect(usageStore.save).toHaveBeenCalledOnce();
  });
  it("separates cache keys by task, language and model", async () => {
    const usageStore=store(); const fetcher=vi.fn().mockImplementation(async () => completion());
    const provider=new HuggingFaceContentProvider(usageStore,{apiKey:"hf_private",fetch:fetcher});
    const a=await provider.generateVariants(input); const b=await provider.generateVariants({...input,mode:"ideas"});
    const c=await provider.generateVariants({...input,language:"English"});
    expect(new Set([a.usage.requestHash,b.usage.requestHash,c.usage.requestHash]).size).toBe(3);
  });
  it("does not send invalid input or unsupported tasks upstream", async () => {
    const fetcher=vi.fn(); const provider=new HuggingFaceContentProvider(store(),{apiKey:"hf_private",fetch:fetcher});
    await expect(provider.generateVariants({...input,platforms:["threads","threads"]})).rejects.toThrow();
    await expect(provider.generateVariants({...input,topic:""})).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("serves only validated workspace cache without provider call", async () => {
    const usageStore=store(); vi.mocked(usageStore.find).mockResolvedValue([variant]);
    const fetcher=vi.fn(); const result=await new HuggingFaceContentProvider(usageStore,{apiKey:"hf_private",fetch:fetcher}).generateVariants(input);
    expect(result.usage.cached).toBe(true); expect(fetcher).not.toHaveBeenCalled();
    expect(usageStore.find).toHaveBeenCalledWith("workspace-one",expect.any(String));
  });
  it("enforces cost guard before external request", async () => {
    const usageStore=store(); vi.mocked(usageStore.monthlyCost).mockResolvedValue(10); const fetcher=vi.fn();
    await expect(new HuggingFaceContentProvider(usageStore,{apiKey:"hf_private",monthlyBudgetUsd:10,fetch:fetcher}).generateVariants(input)).rejects.toThrow("budget"); expect(fetcher).not.toHaveBeenCalled();
  });
  it("never forwards provider error text or credentials", async () => {
    const usageStore=store(); const fetcher=vi.fn().mockResolvedValue(new Response("sensitive upstream hf_private",{status:401}));
    await expect(new HuggingFaceContentProvider(usageStore,{apiKey:"hf_private",fetch:fetcher}).generateVariants(input)).rejects.toThrow("temporarily unavailable");
    expect(usageStore.save).not.toHaveBeenCalled();
  });
  it("rejects malformed, truncated, incomplete or extra-platform outputs", async () => {
    for (const body of ["not json",JSON.stringify({variants:[]}),JSON.stringify({variants:[{...variant,platform:"facebook"}]}),JSON.stringify({variants:[variant,variant]})]) {
      expect(() => parseSocialDrafts(body,["threads"])).toThrow(AiProviderError);
    }
    const usageStore=store(); const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{finish_reason:"length",message:{content:JSON.stringify({variants:[variant]})}}]})));
    await expect(new HuggingFaceContentProvider(usageStore,{apiKey:"hf_private",fetch:fetcher}).generateVariants(input)).rejects.toThrow(AiProviderError);
    expect(usageStore.save).not.toHaveBeenCalled();
  });
  it("counts CTA, hashtag and Unicode text in platform limits", () => {
    expect(() => parseSocialDrafts(JSON.stringify({variants:[{...variant,copy:"😀".repeat(500)}]}),["threads"])).toThrow();
    expect(parseSocialDrafts(JSON.stringify({variants:[{...variant,copy:"😀".repeat(500),hashtags:[],callToAction:""}]}),["threads"])).toHaveLength(1);
  });
  it("bounds upstream body reads even without Content-Length", async () => {
    await expect(readBoundedAiJson(new Response("x".repeat(1024)),100)).rejects.toThrow(AiProviderError);
  });
  it("fails closed for missing credentials", () => {
    expect(() => new HuggingFaceContentProvider(store(),{apiKey:""})).toThrow(AiProviderError);
  });
});
