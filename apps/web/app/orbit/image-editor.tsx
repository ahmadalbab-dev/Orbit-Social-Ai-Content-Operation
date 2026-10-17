"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  ImagePlus,
  RotateCw,
  FlipHorizontal,
  RefreshCw,
} from "lucide-react";
import { Button, Card } from "./ui";
import { SectionHeading } from "./design-ui";
import { ImageAiPanel } from "./image-ai-panel";

/** Local edits stay on the device; the separate AI panel explicitly requests upload. */
export function ImageEditor({ preview = false }: { preview?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [ratio, setRatio] = useState("original");
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [focusX, setFocusX] = useState(50);
  const [focusY, setFocusY] = useState(50);
  const [textSize, setTextSize] = useState(100);
  const [textPosition, setTextPosition] = useState("bottom");
  const [textColor, setTextColor] = useState("#ffffff");
  const [caption, setCaption] = useState("");
  const [format, setFormat] = useState("png");
  const [notice, setNotice] = useState("");
  const pending = useRef(0);
  useEffect(
    () => () => {
      pending.current++;
    },
    [],
  );
  function reset() {
    setRatio("original");
    setRotation(0);
    setFlip(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setCaption("");
    setFocusX(50);
    setFocusY(50);
    setTextSize(100);
    setTextPosition("bottom");
    setTextColor("#ffffff");
    setNotice("");
  }
  async function select(file?: File) {
    const request = ++pending.current;
    if (!file) return false;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 25 * 1024 * 1024
    ) {
      setNotice("Choose a PNG, JPEG or WebP under 25 MB.");
      return false;
    }
    const url = URL.createObjectURL(file);
    const next = new Image();
    try {
      next.src = url;
      await next.decode();
      if (request !== pending.current) return false;
      if (next.naturalWidth * next.naturalHeight > 40_000_000) {
        setNotice("Choose an image under 40 megapixels.");
        return false;
      }
      reset();
      setImage(next);
      return true;
    } catch {
      if (request === pending.current)
        setNotice("This image could not be opened.");
      return false;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  useEffect(() => {
    if (!image || !canvas.current) return;
    const turned = rotation % 180 !== 0;
    const iw = turned ? image.naturalHeight : image.naturalWidth;
    const ih = turned ? image.naturalWidth : image.naturalHeight;
    const aspect =
      ratio === "original"
        ? iw / ih
        : ratio === "1:1"
          ? 1
          : ratio === "4:5"
            ? 0.8
            : ratio === "16:9"
              ? 16 / 9
              : 9 / 16;
    const cw = Math.min(iw, ih * aspect),
      ch = cw / aspect;
    const scale = Math.min(1, 2048 / Math.max(cw, ch));
    const target = canvas.current;
    target.width = Math.max(1, Math.round(cw * scale));
    target.height = Math.max(1, Math.round(ch * scale));
    const ctx = target.getContext("2d");
    if (!ctx) {
      setNotice("Image editing is unavailable in this browser.");
      return;
    }
    ctx.save();
    ctx.translate(target.width / 2, target.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(
      (iw - cw) * (0.5 - focusX / 100),
      (ih - ch) * (0.5 - focusY / 100),
    );
    ctx.scale(flip ? -1 : 1, 1);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    ctx.restore();
    if (caption.trim()) {
      // Wrap words at a readable size instead of squeezing the entire caption.
      const size = Math.max(
        12,
        Math.round(((target.width / 24) * textSize) / 100),
      );
      ctx.font = `bold ${size}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const maxWidth = target.width * 0.88;
      const lines: string[] = [];
      for (const paragraph of caption.trim().split("\n")) {
        let line = "";
        for (const word of paragraph.split(/\s+/)) {
          if (ctx.measureText(word).width > maxWidth) {
            if (line) {
              lines.push(line);
              line = "";
            }
            let part = "";
            for (const char of word) {
              if (part && ctx.measureText(part + char).width > maxWidth) {
                lines.push(part);
                part = char;
              } else part += char;
            }
            line = part;
          } else if (
            line &&
            ctx.measureText(line + " " + word).width > maxWidth
          ) {
            lines.push(line);
            line = word;
          } else line = line ? line + " " + word : word;
        }
        if (line) lines.push(line);
      }
      const lineHeight = size * 1.4;
      const visible = lines.slice(
        0,
        Math.max(
          1,
          Math.min(8, Math.floor((target.height * 0.65) / lineHeight)),
        ),
      );
      if (visible.length < lines.length)
        visible[visible.length - 1] =
          visible[visible.length - 1].slice(0, -3) + "…";
      const height = visible.length * lineHeight + size;
      const top =
        textPosition === "top"
          ? 0
          : textPosition === "centre"
            ? (target.height - height) / 2
            : target.height - height;
      ctx.fillStyle = "rgba(0,0,0,.65)";
      ctx.fillRect(0, top, target.width, height);
      ctx.fillStyle = textColor;
      visible.forEach((line, index) =>
        ctx.fillText(
          line,
          target.width / 2,
          top + size / 2 + lineHeight * (index + 0.5),
        ),
      );
    }
  }, [
    image,
    ratio,
    rotation,
    flip,
    brightness,
    contrast,
    saturation,
    caption,
    focusX,
    focusY,
    textSize,
    textPosition,
    textColor,
  ]);
  function download() {
    const target = canvas.current;
    if (!target || !image) return;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = target.width;
    exportCanvas.height = target.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;
    if (format === "jpeg") {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, target.width, target.height);
    }
    ctx.drawImage(target, 0, 0);
    exportCanvas.toBlob(
      (blob) => {
        if (!blob) {
          setNotice("Export failed. Try a smaller image.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `orbit-image.${format === "jpeg" ? "jpg" : "png"}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice("Image exported. Your original stays unchanged.");
      },
      `image/${format}`,
      0.92,
    );
  }
  return (
    <section className="workspace-view">
      <SectionHeading
        number="02"
        label="Image"
        title="A fresh look. Your image."
      />
      <div className="video-grid">
        <Card className="surface video-canvas">
          <div className="image-stage">
            {!image ? (
              <div className="video-placeholder">
                <ImagePlus size={40} />
                <span>Your image goes here.</span>
              </div>
            ) : null}
            <canvas
              ref={canvas}
              hidden={!image}
              aria-label="Edited image preview"
            />
          </div>
          <div className="canvas-footer">
            On your device · adjustable crop · up to 2048px
          </div>
        </Card>
        <Card className="surface video-controls">
          <fieldset
            disabled={aiBusy}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            <label className="upload-zone">
              <ImagePlus size={24} />
              <strong>Choose image</strong>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Choose image"
                onChange={(e) => void select(e.target.files?.[0])}
              />
            </label>
            <div className="two-fields">
              <label className="field">
                Crop
                <select
                  aria-label="Image crop"
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                >
                  <option value="original">Original</option>
                  <option>1:1</option>
                  <option>4:5</option>
                  <option>9:16</option>
                  <option>16:9</option>
                </select>
              </label>
              <label className="field">
                Export
                <select
                  aria-label="Image export format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                </select>
              </label>
            </div>
            <label className="field">
              Look preset
              <select
                aria-label="Image look preset"
                value={
                  brightness === 100 && contrast === 100 && saturation === 100
                    ? "original"
                    : brightness === 105 &&
                        contrast === 115 &&
                        saturation === 130
                      ? "vivid"
                      : brightness === 110 &&
                          contrast === 90 &&
                          saturation === 90
                        ? "soft"
                        : brightness === 100 &&
                            contrast === 115 &&
                            saturation === 0
                          ? "mono"
                          : "custom"
                }
                onChange={(e) => {
                  const looks: Record<string, number[]> = {
                    original: [100, 100, 100],
                    vivid: [105, 115, 130],
                    soft: [110, 90, 90],
                    mono: [100, 115, 0],
                  };
                  const v = looks[e.target.value];
                  setBrightness(v[0]);
                  setContrast(v[1]);
                  setSaturation(v[2]);
                }}
              >
                <option value="custom" disabled>
                  Custom
                </option>
                <option value="original">Original</option>
                <option value="vivid">Vivid</option>
                <option value="soft">Soft</option>
                <option value="mono">Monochrome</option>
              </select>
            </label>
            <div className="review-actions">
              <Button
                variant="outline"
                disabled={!image}
                aria-label="Rotate image"
                onClick={() => setRotation((v) => (v + 90) % 360)}
              >
                <RotateCw size={17} />
                Rotate
              </Button>
              <Button
                variant="outline"
                disabled={!image}
                aria-label="Flip image"
                onClick={() => setFlip((v) => !v)}
              >
                <FlipHorizontal size={17} />
                Flip
              </Button>
            </div>
            {ratio !== "original" ? (
              <>
                {[
                  {
                    name: "Horizontal crop focus",
                    value: focusX,
                    set: setFocusX,
                  },
                  {
                    name: "Vertical crop focus",
                    value: focusY,
                    set: setFocusY,
                  },
                ].map((control) => (
                  <label className="slider-field" key={control.name}>
                    <span>
                      {control.name}
                      <output>{control.value}%</output>
                    </span>
                    <input
                      aria-label={control.name}
                      type="range"
                      min="0"
                      max="100"
                      value={control.value}
                      onChange={(e) => control.set(Number(e.target.value))}
                    />
                  </label>
                ))}
              </>
            ) : null}
            {[
              { name: "Brightness", value: brightness, set: setBrightness },
              { name: "Contrast", value: contrast, set: setContrast },
              { name: "Saturation", value: saturation, set: setSaturation },
            ].map((control) => (
              <label className="slider-field" key={control.name}>
                <span>
                  {control.name}
                  <output>{control.value}%</output>
                </span>
                <input
                  aria-label={`Image ${control.name.toLowerCase()}`}
                  type="range"
                  min="0"
                  max="200"
                  value={control.value}
                  onChange={(e) => control.set(Number(e.target.value))}
                />
              </label>
            ))}
            <label className="field">
              Caption
              <textarea
                aria-label="Image caption"
                maxLength={180}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
            <div className="two-fields">
              <label className="field">
                Text position
                <select
                  aria-label="Image text position"
                  value={textPosition}
                  onChange={(e) => setTextPosition(e.target.value)}
                >
                  <option value="top">Top</option>
                  <option value="centre">Centre</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
              <label className="field">
                Text colour
                <input
                  aria-label="Image text colour"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                />
              </label>
            </div>
            <label className="slider-field">
              <span>
                Text size<output>{textSize}%</output>
              </span>
              <input
                aria-label="Image text size"
                type="range"
                min="60"
                max="180"
                value={textSize}
                onChange={(e) => setTextSize(Number(e.target.value))}
              />
            </label>
          </fieldset>
          <ImageAiPanel
            source={() => canvas.current}
            disabled={!image}
            preview={preview}
            onBusyChange={setAiBusy}
            onResult={async (blob) => {
              const loaded = await select(
                new File([blob], "orbit-ai-result.png", { type: blob.type }),
              );
              if (!loaded)
                throw new Error(
                  "The AI image could not be decoded. Your current image is unchanged.",
                );
            }}
          />
          <fieldset
            disabled={aiBusy}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            <Button
              disabled={!image}
              onClick={download}
              aria-label="Export image"
            >
              <Download size={17} />
              Export image
            </Button>
            <Button
              variant="outline"
              onClick={reset}
              aria-label="Reset image edits"
            >
              <RefreshCw size={17} />
              Reset edits
            </Button>
          </fieldset>
          {notice ? (
            <p role="status" className="action-notice">
              {notice}
            </p>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
