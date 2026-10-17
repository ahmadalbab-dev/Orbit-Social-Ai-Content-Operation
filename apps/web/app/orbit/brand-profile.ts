export type Profile = { id?: string; name: string; voice: string; audience: string; topics: string; language: string };
export type StoredBrand = { id: string; name: string; voice: string; audience: string; guidelines?: { language?: string; topics?: string[] } | null };
export function brandPayload(profile: Profile) {
  return { name: profile.name, voice: profile.voice, audience: profile.audience, language: profile.language, topics: profile.topics.split(",").map(topic => topic.trim()).filter(Boolean) };
}
export function profileFromBrand(brand: StoredBrand): Profile {
  return { id: brand.id, name: brand.name, voice: brand.voice, audience: brand.audience, language: brand.guidelines?.language ?? "Bahasa Melayu", topics: brand.guidelines?.topics?.join(", ") ?? "" };
}
