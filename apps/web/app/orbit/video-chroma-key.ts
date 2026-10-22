export type VideoChromaKey = {
  color: string;
  tolerance: number;
  feather: number;
  spill: number;
  background: string;
  backgroundLayerId: string | null;
};
export const defaultVideoChromaKey: VideoChromaKey = {
  color: '#00ff00', tolerance: .12, feather: .06, spill: .5,
  background: '#18223c', backgroundLayerId: null,
};
export function validateVideoChromaKey(value: VideoChromaKey) {
  if (!value || !/^#[a-f\d]{6}$/i.test(value.color) || !/^#[a-f\d]{6}$/i.test(value.background) ||
    ![value.tolerance, value.feather, value.spill].every(Number.isFinite) ||
    value.tolerance < 0 || value.tolerance > .8 || value.feather < 0 || value.feather > .4 || value.spill < 0 || value.spill > 1 ||
    (value.backgroundLayerId !== null && (typeof value.backgroundLayerId !== 'string' || !value.backgroundLayerId || value.backgroundLayerId.length > 100))) {
    throw Error('Choose valid green-screen colour, tolerance and background settings.');
  }
}
type Renderer = { canvas: HTMLCanvasElement; gl: WebGLRenderingContext; program: WebGLProgram; texture: WebGLTexture; buffer: WebGLBuffer; shaders: WebGLShader[] };
const renderers = new WeakMap<CanvasRenderingContext2D, Renderer>();
const vertex = `attribute vec2 position; varying vec2 uv;
void main(){ uv=(position+1.0)*0.5; gl_Position=vec4(position,0.0,1.0); }`;
const fragment = `precision mediump float;
uniform sampler2D source; uniform vec3 keyColor; uniform float tolerance; uniform float feather; uniform float spill;
varying vec2 uv;
vec2 chroma(vec3 rgb){ return vec2(-0.168736*rgb.r-0.331264*rgb.g+0.5*rgb.b,0.5*rgb.r-0.418688*rgb.g-0.081312*rgb.b); }
void main(){
 vec4 pixel=texture2D(source,uv);
 float alpha=smoothstep(tolerance,tolerance+max(feather,0.001),distance(chroma(pixel.rgb),chroma(keyColor)));
 float suppression=spill*(1.0-alpha);
 if(keyColor.g>keyColor.r && keyColor.g>keyColor.b)pixel.g=mix(pixel.g,min(pixel.g,max(pixel.r,pixel.b)),suppression);
 if(keyColor.b>keyColor.r && keyColor.b>keyColor.g)pixel.b=mix(pixel.b,min(pixel.b,max(pixel.r,pixel.g)),suppression);
 gl_FragColor=vec4(pixel.rgb,pixel.a*alpha);
}`;
function createRenderer(): Renderer {
  const canvas = document.createElement('canvas'), gl = canvas.getContext('webgl', {alpha: true, premultipliedAlpha: false});
  if (!gl) throw Error('Green screen needs WebGL in this browser. Enable graphics acceleration or use another browser.');
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null, texture: WebGLTexture | null = null, buffer: WebGLBuffer | null = null;
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(type); if (!shader) throw Error();
      shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error();
    }
    program = gl.createProgram(); texture = gl.createTexture(); buffer = gl.createBuffer();
    if (!program || !texture || !buffer) throw Error();
    shaders.forEach(shader => gl.attachShader(program!, shader)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error();
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    return {canvas, gl, program, texture, buffer, shaders};
  } catch {
    shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(program); gl.deleteTexture(texture); gl.deleteBuffer(buffer);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    throw Error('Green-screen processing could not start in this browser.');
  }
}
/** One reusable GPU texture per output canvas. Original video pixels remain local. */
export function keyedVideoFrame(owner: CanvasRenderingContext2D, video: HTMLVideoElement, settings: VideoChromaKey) {
  validateVideoChromaKey(settings);
  let renderer = renderers.get(owner);
  if (!renderer) { renderer = createRenderer(); renderers.set(owner, renderer); }
  const {canvas, gl, program} = renderer;
  if (gl.isContextLost()) throw Error('Green-screen graphics were interrupted. Reopen this video and try again.');
  const textureLimit = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  if (video.videoWidth > textureLimit || video.videoHeight > textureLimit) throw Error(`This browser can key video up to ${textureLimit} pixels on each edge. Choose a smaller source video.`);
  const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.max(1, Math.round(video.videoWidth * scale)), height = Math.max(1, Math.round(video.videoHeight * scale));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  gl.viewport(0, 0, width, height);
  gl.uniform3f(gl.getUniformLocation(program, 'keyColor'), ...[1,3,5].map(index => parseInt(settings.color.slice(index, index + 2), 16) / 255) as [number,number,number]);
  gl.uniform1f(gl.getUniformLocation(program, 'tolerance'), settings.tolerance);
  gl.uniform1f(gl.getUniformLocation(program, 'feather'), settings.feather);
  gl.uniform1f(gl.getUniformLocation(program, 'spill'), settings.spill);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  if (gl.getError() !== gl.NO_ERROR) throw Error('The green-screen frame could not be processed. Try a smaller video or another browser.');
  return canvas;
}
export function releaseVideoChromaKey(owner: CanvasRenderingContext2D | null) {
  if (!owner) return;
  const renderer = renderers.get(owner); if (!renderer) return;
  const {gl, program, texture, buffer, shaders} = renderer;
  shaders.forEach(shader => gl.deleteShader(shader)); gl.deleteProgram(program); gl.deleteTexture(texture); gl.deleteBuffer(buffer);
  gl.getExtension('WEBGL_lose_context')?.loseContext(); renderers.delete(owner);
}
