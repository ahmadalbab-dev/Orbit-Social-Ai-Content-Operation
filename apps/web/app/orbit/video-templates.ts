export const videoTemplates = [
  {
    id: "clean",
    name: "Clean studio",
    description: "Original colour, square frame",
    format: "square",
    news: false,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    speed: 1,
  },
  {
    id: "news",
    name: "City bulletin",
    description: "Portrait with dated news panel",
    format: "portrait",
    news: true,
    brightness: 1.05,
    contrast: 1.1,
    saturation: 1,
    speed: 1,
  },
  {
    id: "product",
    name: "Product spotlight",
    description: "Bright square product showcase",
    format: "square",
    news: false,
    brightness: 1.1,
    contrast: 1.15,
    saturation: 1.15,
    speed: 1,
  },
  {
    id: "cinematic",
    name: "Quiet cinema",
    description: "Wide frame, muted colour and slower pace",
    format: "landscape",
    news: false,
    brightness: 0.95,
    contrast: 1.2,
    saturation: 0.7,
    speed: 0.75,
  },
  {
    id: "captions",
    name: "Caption story",
    description: "Portrait with an editable opening caption",
    format: "portrait",
    news: false,
    brightness: 1,
    contrast: 1.1,
    saturation: 1,
    speed: 1,
  },
] as const;


export const neutralVideoSettings = { template: "clean", news: false, title: "", brightness: 1, contrast: 1, saturation: 1, speed: 1, volume: 1, rotation: 0, flip: false } as const;
/** Original editable presets, deliberately chosen by the user rather than applied on upload. */
export const creativeVideoTemplates = [
  { key: "showcase", template: "product", name: "Product showcase", description: "Square product frame, gentle contrast and an editable title area.", format: "square", brightness: 1.03, contrast: 1.08, saturation: 1.05, speed: 1 },
  { key: "ugc", template: "captions", name: "UGC story", description: "Portrait frame with three editable hook, detail and next-step captions.", format: "portrait", brightness: 1, contrast: 1.04, saturation: 1, speed: 1 },
  { key: "photo-dump", template: "clean", name: "Photo sequence", description: "Arrange your uploaded photo layers into consecutive portrait scenes.", format: "portrait", brightness: 1, contrast: 1, saturation: 1, speed: 1 },
  { key: "editorial", template: "cinematic", name: "Editorial film", description: "Landscape frame, restrained colour and original playback speed.", format: "landscape", brightness: 1, contrast: 1.08, saturation: .85, speed: 1 },
] as const;
