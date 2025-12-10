#version 330 core

uniform vec2 iResolution;
uniform float iTime;
uniform int iFrame;
in vec2 fragCoord;
out vec4 outputColor;


#define Time (iTime*1.0)

#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define Gravity 0.7
#define NUM_STAR 80.
#define NUM_EMISSION 30.
#define NUM_FIREWORKS 5
#define DURATION 3.

const vec2 g = vec2(.0, -Gravity); /* gravity */


#define MOD3 vec3(.1031,.11369,.13787)

float hash1d(float p) {
    float p1 = fract(p * MOD3.x);
    p1 += dot(vec2(p1, p1), vec2(19.19, 13.13));
    return fract(p1 * 17.33);
}

vec2 hash2d(float p) {
    vec2 p2 = fract(vec2(p, p + 0.5) * MOD3.xy);
    p2 += dot(p2, p2.yx + vec2(19.19, 17.17));
    return fract(vec2((p2.x + p2.y) * p2.x, (p2.x + p2.y) * p2.y));
}

vec3 hash3d(float p) {
   vec3 p3 = fract(vec3(p) * MOD3);
   p3 += dot(p3, p3.yzx + 19.19);
   return fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
}

vec2 hash2d_polar(float p) {
    vec2 v = hash2d(p);
    float a = v.x * TWO_PI;
    float d = v.y;
    return vec2(sin(a), cos(a)) * d;
}

vec3 renderParticle(vec2 fragPos, vec2 particlePos, float brightness, vec3 color) {
    vec3 fragColor = vec3(0.0);

    float dist = length(fragPos - particlePos);
    float decay = 1.0/(dist);
    fragColor = color * brightness * decay;

    return fragColor;
}

vec3 renderStars(vec2 fragPos) {
    float t = Time;

    float y = fragPos.y + 0.5;
    vec3 topColor = vec3(0.02,0.04,0.10);
    vec3 bottomColor = vec3(0.0, 0.0, 0.02);
    vec3 fragColor = mix(bottomColor, topColor, clamp(y, 0.0,1.0));

    for(float i = 0.; i < NUM_STAR; i++){
        vec2 pos = (hash2d(i * 7) - .5) * iResolution.xy / iResolution.y;

        float brightness = .0006 + 0.002 * hash1d(i);
        float twinkleRate = 1.5 + 3.0 * hash1d(i+10.0);
        float twinklePhase = TWO_PI * hash1d(i + 20.0);

        float bright = brightness * (0.5 + 0.5 * sin(t * twinkleRate + twinklePhase));

        float star = hash1d(i+30.0);
        vec3 whiteStar = vec3(0.8, 0.85, 1.0);
        vec3 yellowStar = vec3(1.0,0.9,0.8);
        vec3 color = mix(whiteStar, yellowStar, star);

        fragColor += renderParticle(fragPos, pos, bright, color);
    }

    float r = length(fragPos);
    float edge = smoothstep(1.1, 0.3,r);
    fragColor *= edge;
    return fragColor;
}

vec2 moveParticle(vec2 initPos, vec2 initVel, float t){
    vec2 currentPos = initPos;
    currentPos = initPos + initVel * t + 0.5 * g * t * t;
    return currentPos;
}

vec3 simSingleParticle(vec2 fragPos, vec2 initPos, vec2 initVel, float t, float brightness, vec3 color) {
    vec3 fragColor = vec3(0.0);
    vec2 currPos = moveParticle(initPos, initVel, t);
    fragColor+= renderParticle(fragPos, currPos, brightness, color);
    return fragColor;
}

vec3 simSingleFirework(vec2 fragPos, vec2 launchPos, vec2 launchVel, float t, vec3 color) {
    vec3 fragColor = vec3(0.0);
    float emitTime = 1.5;

    if(t < emitTime){
        float brightness = .002;
        vec2 initPos = launchPos;
        vec2 initVel = launchVel;
        fragColor += simSingleParticle(fragPos, initPos, initVel, t, brightness, color);
    }
    else{
        float emitT = t - emitTime; // time since emission
        vec2 emitPos = moveParticle(launchPos, launchVel, emitTime);

        for(float i = 0.; i < NUM_EMISSION; i++){
            vec2 emitVel = hash2d_polar(i) * .7; // random direction with max magnitude 0.7

            float bright = 0.003;
            float flicker = 0.5 + 0.5 * sin(emitT * 10.0 + i);
            float fade = max(0.0, 1.0- emitT/(DURATION - emitTime));
            float brightness= bright * flicker * fade;
            fragColor += simSingleParticle(fragPos, emitPos, emitVel, emitT, brightness, color);
        }
    }
    return fragColor;
}

vec3 renderFireworks(vec2 fragPos) {
    vec3 fragColor = vec3(0.0);
    float t = mod(Time, DURATION);
    float emitT = 1.5;

    for(int i = 0; i < NUM_FIREWORKS; i++){
        float lauchTime = i;
        float relTime = Time - lauchTime;
        float t = mod(relTime, DURATION);
        float idx = floor(relTime / DURATION);

        vec2 launchPos = vec2((hash1d(idx) - .5) * iResolution.x / iResolution.y, -0.5);
        vec2 launchVel = vec2(-launchPos.x * 0.66, hash1d(lauchTime + 1.) * 0.3 + .9);
        vec3 color = sin(40. * hash3d(lauchTime) * idx) * 0.25 + 0.75;

        fragColor += simSingleFirework(fragPos, launchPos, launchVel, t, color);
    }
    return fragColor;
}

void mainImage(out vec4 outputColor, in vec2 fragCoord) {
    vec2 fragPos = (fragCoord - .5 * iResolution.xy) / iResolution.y;
    vec3 fragColor = vec3(0.0);

    vec3 sky = renderStars(fragPos);
    fragColor = sky;
    outputColor = vec4(fragColor, 1.0);
}

void main() {
    mainImage(outputColor, fragCoord);
}
