import { describe, expect, it } from "vitest";
import { textAiConfig } from "./text-ai.config";
import { AppController } from "./app.controller";
import { afterEach, vi } from "vitest";
describe("explicit text provider configuration",()=>{
  afterEach(()=>vi.unstubAllEnvs());
  it.each(["llama-3.3-70b-versatile","openai/gpt-oss-120b"])("accepts Groq model %s without affecting the retained image provider",model=>{
    expect(textAiConfig({AI_TEXT_PROVIDER:"groq",GROQ_API_KEY:"gsk_fixture",GROQ_MODEL:model,HF_TOKEN:"hf_fixture"})).toMatchObject({provider:"groq",configured:true,model});
  });
  it.each(["", "model name", "model\n", "org/model/extra", "org/model:route"])("rejects malformed Groq model %j rather than reporting readiness",GROQ_MODEL=>{
    expect(textAiConfig({AI_TEXT_PROVIDER:"groq",GROQ_API_KEY:"gsk_fixture",GROQ_MODEL}).configured).toBe(false);
  });
  it("keeps HF flat model rejection and namespace/provider suffix support",()=>{
    expect(textAiConfig({AI_TEXT_PROVIDER:"huggingface",HF_TOKEN:"hf_fixture",HF_MODEL:"flat-model"}).configured).toBe(false);
    expect(textAiConfig({AI_TEXT_PROVIDER:"huggingface",HF_TOKEN:"hf_fixture",HF_MODEL:"Qwen/Qwen3:provider"}).configured).toBe(true);
  });
  it("selects Groq even if the HF token is retained for images",()=>{
    expect(textAiConfig({AI_TEXT_PROVIDER:"groq",GROQ_API_KEY:"gsk_fixture",HF_TOKEN:"hf_fixture"})).toMatchObject({provider:"groq",configured:true,apiKey:"gsk_fixture"});
  });
  it.each([
    {AI_TEXT_PROVIDER:"groq",HF_TOKEN:"hf_fixture"},
    {AI_TEXT_PROVIDER:"groq",GROQ_API_KEY:"   "},
    {AI_TEXT_PROVIDER:"groq",GROQ_API_KEY:"gsk_fixture\n"},
    {AI_TEXT_PROVIDER:"groq",GROQ_API_KEY:"gsk_fixture",GROQ_MODEL:"https://example.test/model"},
    {AI_TEXT_PROVIDER:"unknown",HF_TOKEN:"hf_fixture"},
  ])("disables invalid configuration without falling back",env=>{
    expect(textAiConfig(env).configured).toBe(false);
  });
  it("preserves existing provider selection until the operator opts into Groq",()=>{
    expect(textAiConfig({HF_TOKEN:"hf_fixture"}).provider).toBe("huggingface");
    expect(textAiConfig({OPENAI_API_KEY:"fixture"}).provider).toBe("openai");
  });
  it("returns setup metadata without leaking keys or claiming live verification",()=>{
    vi.stubEnv("AI_TEXT_PROVIDER","groq");vi.stubEnv("GROQ_API_KEY","gsk_private_fixture");
    const result=new AppController({} as never,{} as never,{} as never,{} as never).aiStatus();
    expect(result).toEqual({configured:true,provider:"groq",verified:false});
    expect(JSON.stringify(result)).not.toContain("gsk_private_fixture");
  });
});
