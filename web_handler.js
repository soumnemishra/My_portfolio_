// Define the fragment shader source code as a string
const fragmentShaderSource = `#version 300 es
precision highp float; // Use high precision for floating point numbers

// Uniforms: values passed from JavaScript to the shader
uniform float time; // Current time in seconds
uniform vec2 vp; // Viewport dimensions (width, height)
uniform float scrollIntensity; // Controls visibility/intensity based on scroll (0.0 to 1.0)

// Input: varying variable from vertex shader (texture coordinates)
in vec2 uv; // Coordinates from 0.0 (bottom-left) to 1.0 (top-right)

// Output: the final color of the pixel
out vec4 fragColor;

// --- Noise Functions (fbm, noise, rand) ---
// Pseudo-random number generator based on position
float rand(vec2 p) {
    // Uses sine and dot product for a simple hash-like function
    return fract(sin(dot(p.xy, vec2(1.0, 300.0))) * 43758.5453123);
}

// 2D Noise function (Value Noise based on Morgan McGuire's explanation)
float noise(vec2 p) {
    vec2 i = floor(p); // Integer part of the coordinate (grid cell index)
    vec2 f = fract(p); // Fractional part of the coordinate (position within the cell)

    // Smoothstep function for smooth interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);

    // Get random values for the four corners of the grid cell
    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));

    // Bilinear interpolation using smoothstep weights (u)
    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
}

#define OCTAVES 5 // Number of noise layers to combine
// Fractional Brownian Motion (fBm) - combines multiple layers (octaves) of noise
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5; // Initial amplitude
    // Frequency is implicitly handled by multiplying 'p' in the loop

    // Loop through octaves, adding noise at increasing frequencies and decreasing amplitudes
    for (int i = 0; i < OCTAVES; i++) {
        value += amplitude * noise(p);
        p *= 2.0; // Double the frequency for the next octave
        amplitude *= 0.5; // Halve the amplitude for the next octave
    }
    return value;
}
// --- End Noise Functions ---


// Main shader function - executed for every pixel
void main() {
    // --- Coordinate Setup ---
    // Correct aspect ratio: Map UV (0-1) to a centered coordinate system (-0.5 to 0.5)
    // and adjust the x-coordinate based on the viewport aspect ratio.
    vec2 aspectCorrectedUv = uv - 0.5;
    aspectCorrectedUv.x *= vp.x / vp.y;
    vec2 p = aspectCorrectedUv; // Use 'p' for calculations

    // --- Noise Parameters ---
    float speed = 0.15; // Speed of the upward animation
    float details = 6.0; // Base frequency/scale of the noise pattern
    float displacementForce = 1.1; // How much noise layers distort each other
    float colorShift = 0.6; // How much noise affects the color blend

    // --- Noise Calculation ---
    // Create time-varying coordinates for the noise function
    vec2 noiseCoord = vec2(p.x, p.y + time * speed) * details;

    // Generate multiple layers of fBm noise for complexity
    float noiseLayer1 = fbm(noiseCoord);
    // Second layer is offset by the first layer and time, creating swirling motion
    float noiseLayer2 = fbm(noiseCoord + noiseLayer1 * displacementForce + time * 0.05);

    // Use the noise layers to slightly displace the original coordinates
    vec2 displacedCoord = p + vec2(noiseLayer1, noiseLayer2) * 0.1;

    // Calculate a final noise value based on the displaced coordinates, evolving slowly over time
    float finalNoise = fbm(displacedCoord * 5.0 + time * 0.1);

    // --- Color Calculation ---
    // Create a base color gradient from dark red/brown (bottom) to a brighter orange/red (top)
    // uv.y goes from 0 at the bottom to 1 at the top.
    vec3 baseColor = mix(vec3(0.1, 0.0, 0.0), vec3(0.6, 0.1, 0.0), uv.y * 1.5);

    // Mix the base color with a bright yellow/orange based on the final noise value
    vec3 noisyColor = mix(baseColor, vec3(0.9, 0.5, 0.1), finalNoise * colorShift);

    // --- Intensity and Fade based on Scroll ---
    // Create a vertical gradient mask: full intensity at the bottom (uv.y=0), fading out towards the top (uv.y=0.4+)
    float verticalGradient = smoothstep(0.4, 0.0, uv.y);

    // Combine the scroll intensity (from JS) with the vertical gradient
    float finalIntensity = scrollIntensity * verticalGradient;

    // Apply the final intensity to the calculated noisy color
    vec3 finalColor = noisyColor * finalIntensity;

    // --- Additive Glow ---
    // Calculate a glow factor based on the brightest parts of the noise pattern
    float glow = pow(max(0.0, finalNoise - 0.5) * 2.0, 3.0);
    // Add a bright orange/yellow glow color, controlled by the final intensity
    finalColor += vec3(1.0, 0.6, 0.2) * glow * finalIntensity * 0.5;

    // Set the final pixel color (alpha is 1.0 for opaque)
    fragColor = vec4(finalColor, 1.0);
}
`;

// --- WebGL Handler Class ---
class WebGLHandler {
    // Vertex shader: basic shader to draw a full-screen quad and pass UV coordinates
    vertexShaderSource = `#version 300 es
        precision mediump float;
        // Vertices for a fullscreen quad (2 triangles)
        const vec2 positions[6] = vec2[6](
            vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0),
            vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(1.0, 1.0)
        );
        out vec2 uv; // Output UV coordinates (0.0 to 1.0) to fragment shader
        void main() {
            // Map vertex positions (-1 to 1) to UV coordinates (0 to 1)
            uv = positions[gl_VertexID] * 0.5 + 0.5;
            // Set the vertex position
            gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
        }`;

    constructor(canvas, fragmentShaderSource) {
        if (!canvas) {
            console.error("WebGLHandler: Canvas element not provided.");
            return; // Stop initialization if canvas is missing
        }
        this.cn = canvas;
        this.gl = null; // Initialize gl context as null
        this.program = null; // Initialize program as null
        this.animationFrameId = null; // To control rendering loop
        this.startTime = Date.now();
        this.scrollIntensity = 0.0; // Start hidden

        // Uniform locations (initialized later)
        this.timeLocation = null;
        this.resolutionLocation = null;
        this.scrollIntensityLocation = null;

        // Try to initialize WebGL
        if (!this.initializeWebGL()) {
            return; // Stop if WebGL initialization fails
        }

        // Add resize listener
        this.resize(); // Initial resize
        window.addEventListener('resize', this.resize); // Use instance method directly

        console.log("WebGLHandler initialized successfully.");
    }

    // Encapsulate WebGL setup
    initializeWebGL() {
        try {
            this.gl = this.cn.getContext('webgl2', { premultipliedAlpha: false });
            if (!this.gl) {
                console.error("WebGL 2 not supported by this browser.");
                return false;
            }

            // Create and compile shaders
            const vertexShader = this.compileShader(this.vertexShaderSource, this.gl.VERTEX_SHADER);
            const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);

            if (!vertexShader || !fragmentShader) {
                return false; // Shader compilation failed
            }

            // Create program, attach shaders, and link
            this.program = this.gl.createProgram();
            this.gl.attachShader(this.program, vertexShader);
            this.gl.attachShader(this.program, fragmentShader);
            this.gl.linkProgram(this.program);

            // Check linking status
            if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
                console.error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(this.program));
                this.cleanup(); // Clean up resources
                return false;
            }

            // Detach shaders after successful linking (optional but good practice)
            this.gl.detachShader(this.program, vertexShader);
            this.gl.detachShader(this.program, fragmentShader);
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);

            // Use the program
            this.gl.useProgram(this.program);

            // Get uniform locations
            this.timeLocation = this.gl.getUniformLocation(this.program, 'time');
            this.resolutionLocation = this.gl.getUniformLocation(this.program, 'vp');
            this.scrollIntensityLocation = this.gl.getUniformLocation(this.program, 'scrollIntensity');

            // Check if all uniforms were found
            if (!this.timeLocation || !this.resolutionLocation || !this.scrollIntensityLocation) {
                console.warn("One or more uniform locations not found in the shader.");
                // You might want to handle this more gracefully depending on the uniform
            }

            return true; // Initialization successful

        } catch (error) {
            console.error("Error during WebGL initialization:", error);
            this.cleanup(); // Clean up any partial resources
            return false;
        }
    }

    // Method to compile a single shader
    compileShader(source, type) {
        if (!this.gl) return null;
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const shaderType = type === this.gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
            console.error(`An error occurred compiling the ${shaderType} shader: ${this.gl.getShaderInfoLog(shader)}`);
            this.gl.deleteShader(shader);
            return null; // Return null on failure
        }
        return shader; // Return compiled shader on success
    }

    // Bound resize function to maintain 'this' context
    resize = () => {
        if (!this.gl || !this.cn) return;

        const displayWidth = this.cn.clientWidth;
        const displayHeight = this.cn.clientHeight;

        if (this.cn.width !== displayWidth || this.cn.height !== displayHeight) {
            this.cn.width = displayWidth;
            this.cn.height = displayHeight;
            this.gl.viewport(0, 0, this.cn.width, this.cn.height);
            console.log(`Canvas resized to ${this.cn.width}x${this.cn.height}`);
            // Re-render one frame on resize if the loop isn't running
            if (!this.animationFrameId) {
                this.renderFrame();
            }
        }
    }

    // Render a single frame
    renderFrame() {
        if (!this.gl || !this.program || !this.timeLocation || !this.resolutionLocation || !this.scrollIntensityLocation) return;

        this.gl.useProgram(this.program); // Ensure program is active

        // Update uniforms
        this.gl.uniform1f(this.timeLocation, (Date.now() - this.startTime) / 1000.0);
        this.gl.uniform2fv(this.resolutionLocation, [this.cn.width, this.cn.height]);
        this.gl.uniform1f(this.scrollIntensityLocation, this.scrollIntensity);

        // Draw the quad (2 triangles = 6 vertices)
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }


    // The animation loop
    renderLoop = () => {
        this.renderFrame(); // Render the current frame
        // Request the next frame
        this.animationFrameId = window.requestAnimationFrame(this.renderLoop);
    }

    // Start the animation loop
    startRendering() {
        if (!this.animationFrameId && this.gl) { // Only start if not already running and gl is valid
            console.log("Starting WebGL rendering loop.");
            this.startTime = Date.now(); // Reset start time
            this.renderLoop(); // Begin the loop
        }
    }

    // Stop the animation loop
    stopRendering() {
        if (this.animationFrameId) {
            console.log("Stopping WebGL rendering loop.");
            window.cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    // Update the scroll intensity uniform
    setScrollIntensity(intensity) {
        // Clamp intensity between 0.0 and 1.0
        this.scrollIntensity = Math.max(0.0, Math.min(1.0, intensity));
         // Optional: Re-render a single frame immediately if loop isn't running
         // if (!this.animationFrameId) {
         //    this.renderFrame();
         // }
    }

     // Clean up WebGL resources
     cleanup() {
        console.log("Cleaning up WebGL resources.");
        if (this.gl) {
            if (this.program) {
                this.gl.deleteProgram(this.program);
                this.program = null;
            }
            // Add deletion for buffers/textures if they were used
            this.gl = null;
        }
        if(this.animationFrameId) {
            window.cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        window.removeEventListener('resize', this.resize);
    }
}

