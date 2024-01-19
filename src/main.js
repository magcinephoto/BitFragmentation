let inscriptionId;
let myImage;
let myShader;
let blockHash;
let cw, ch;
let cnv;
let seed;

let vertexShader = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  vec4 positionVec4 = vec4(aPosition, 1.0);
  positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
  gl_Position = positionVec4;
}
`;

let fragmentShader = `
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_seed;
uniform sampler2D u_image;

varying vec2 vTexCoord;

bool isInRange(float value, float min, float max) {
  return value >= min && value <= max;
}

float random(float x) {
  return fract(sin(x) * 43758.5453);
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = c.g < c.b ? vec4(c.bg, K.wz) : vec4(c.gb, K.xy);
  vec4 q = c.r < p.x ? vec4(p.xyw, c.r) : vec4(c.r, p.yzx);
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec4 invertedColor(vec3 inColor) {
  float centerBrightness = 0.5;
  float powerCurve = 0.72;
  float colorize = 0.0;
  vec3 hsvColor = rgb2hsv(inColor);

  hsvColor.b = pow(hsvColor.b, powerCurve);
  hsvColor.b = (hsvColor.b < centerBrightness) ? (1.0 - hsvColor.b / centerBrightness) : (hsvColor.b - centerBrightness) / centerBrightness;
  hsvColor.g = hsvColor.g * hsvColor.b * colorize;

  vec3 outColor = hsv2rgb(hsvColor);

  return vec4(outColor, 1.0);
}

vec4 orangeColor(vec3 inColor) {
  float luminance = dot(inColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 outColor;
  float bright = mix(1.0, 0.0, step(u_seed, 0.0));
  float dark = mix(0.0, 1.0, step(u_seed, 0.0));
  outColor = mix(vec3(bright), vec3(dark), step(0.367, luminance));

  if (outColor == vec3(0.0)) {
    outColor = vec3(0.988, 0.078, 0.031); // RGB values for #FC1408
  }
  return vec4(outColor, 1.0);
}

float findAreaNumber(float n, float mousePos) {
  float position = clamp(mousePos, 0.0, 1.0);
  float areaCount = floor(300.0 * (1.0 - position)) + 1.0;
  float areaOffset = 1.0 / areaCount;
  float lowerBound = floor(n / areaOffset);
  float upperBound = ceil(n / areaOffset);
  lowerBound = max(0.0, lowerBound);
  upperBound = min(areaCount, upperBound);

  float result = (n >= areaOffset * lowerBound && n <= areaOffset * (lowerBound + 1.0)) ? lowerBound :
                 (n >= areaOffset * upperBound && n <= areaOffset * (upperBound + 1.0)) ? upperBound :
                 -1.0;
  return result;
}

float direction(float n) {
  float threshold = random(n);
  return threshold > 0.3 ? 1.0 : -1.0;
}

void main() {
  vec2 uv = gl_FragCoord.xy/u_resolution.xy;
  uv.y = 1.0 - uv.y;
  float areaSeedX = findAreaNumber(uv.x, u_mouse.x);
  float areaSeedY = findAreaNumber(uv.y, u_mouse.y);
  float randomValueX = random(float(areaSeedX));
  float randomValueY = random(float(areaSeedY));

  if(areaSeedX > 0.0 && u_mouse.x < 0.97) {
    uv.y = mod(uv.y - u_time * direction(areaSeedX) * 0.2 * (randomValueX + 0.4), 1.0);
  }

  if(areaSeedY > 0.0 && u_mouse.y < 0.97) {
    uv.x = mod(uv.x - u_time * direction(areaSeedY) * 0.3 * (randomValueY + 0.3), 1.0);
  }

  vec3 color = texture2D(u_image, uv).rgb;
  vec4 outColor = orangeColor(invertedColor(color).rgb);
  gl_FragColor = outColor;
}`;

function canvasSize() {
  let w = windowWidth;
  let h = windowHeight;
  if (w >= h) {
    cw = h * myImage.width / myImage.height;
    ch = h;
  } else {
    cw = w;
    ch = w * myImage.height / myImage.width;
  }
  return [cw, ch];
}

function setup(){
  pixelDensity(1);
  cnv = createCanvas(...canvasSize(), WEBGL);
  centerCanvas();
  myShader = createShader(vertexShader, fragmentShader);
  shader(myShader);
  noStroke();
  seed = Math.random() < 0.5 ? 0.0 : 9.0;
}

function draw(){
  drawShader();
}

function drawShader(){
  let yMouse = mouseY / height;
  let xMouse = mouseX / width;
  myShader.setUniform('u_mouse', [xMouse, yMouse]);
  myShader.setUniform('u_resolution', [width, height]);
  myShader.setUniform('u_time', millis()/1000.0);
  myShader.setUniform('u_image', myImage);
  myShader.setUniform('u_seed', seed);

  rect(0,0,width,height);
}

function windowResized() {
  resizeCanvas(...canvasSize());
  centerCanvas();
}

function centerCanvas() {
  let x = (windowWidth - width) / 2;
  let y = (windowHeight - height) / 2;
  cnv.position(x, y);
}
