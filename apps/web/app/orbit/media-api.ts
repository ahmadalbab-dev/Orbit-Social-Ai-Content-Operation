import { apiResponse } from "./session-api";

export type MediaStatus = {
  configured: boolean;
  limits: { uploadBytes: number; maxDuration: number };
};
export type MediaAsset = { id: string; mimeType: string; bytes: number };
export type RenderJob = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  errorCode?: string | null;
  createdAt: string;
  updatedAt: string;
};
export type RenderInput = {
  assetId: string;
  start: number;
  duration: number;
  format: "portrait" | "square" | "landscape";
  news?: { title: string; date: string };
  captions?: { text: string; start: number; end: number }[];
};
export const renderPending = (job: RenderJob) =>
  job.status === "QUEUED" || job.status === "PROCESSING";
const json = async <T>(path: string, init?: RequestInit): Promise<T> =>
  (await apiResponse(path, init)).json() as Promise<T>;

export const mediaStatus = (signal?: AbortSignal) =>
  json<MediaStatus>("/media/status", { signal });
export const listRenders = (signal?: AbortSignal) =>
  json<RenderJob[]>("/media/renders", { signal });
export const uploadVideo = (file: File, signal?: AbortSignal) =>
  json<MediaAsset>("/media/assets", {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
    signal,
  });
export const queueRender = (input: RenderInput, signal?: AbortSignal) =>
  json<RenderJob>("/media/renders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
export const cancelRender = (id: string, signal?: AbortSignal) =>
  json<RenderJob>(`/media/renders/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal,
  });
export async function renderDownload(
  id: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await apiResponse(
    `/media/renders/${encodeURIComponent(id)}/download`,
    { signal },
  );
  if (!response.headers.get("Content-Type")?.startsWith("video/mp4"))
    throw new Error("The rendered MP4 is not available yet.");
  return response.blob();
}
