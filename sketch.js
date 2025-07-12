// COMPUTER VISION TEMPLATE

// This template provides two ml5 wrapped mediapipe models:
// 1. Face Mesh: 478 landmarks for face
// 2. Hand Pose: 21 landmarks per hand 

// SETUP CANVAS

let canvas;
let video;
let canvasWidth, canvasHeight;

// Dynamic sizing - canvas will be 85% of window size
const CANVAS_SCALE = 0.85;

// SETUP MODELS

// ML5 Models
let faceMesh;
let handPose;

// ML5 Results - These arrays contain all the landmark data!
let faces = [];
let hands = [];

// Toggle States
let showFace = true;   // On by default
let showHands = false; // Off by default
let showVideo = true;  // Video on by default
let showDataStream = false; // Data stream off by default
let showDataOnVisualization = false; // Data on visualization off by default
let showFacePixelation = false; // Face pixelation off by default
let pixelSize = 1; // Default pixel size for face pixelation
let currentVideoFilter = 'none'; // Current video filter (none, bw, invert)
let showFingertipDrawing = false; // Fingertip drawing off by default
// Trigger states
let winkTriggerEnabled = false;
let mouthTextTriggerEnabled = false;
let wristCircleTriggerEnabled = false;

// Mouth text stream variables
// NOTE FOR USERS: Change this quote to whatever text you want to display
let criticalTheoryQuote = "The apparatus of surveillance has become so normalized that we perform for invisible audiences, transforming every gesture into data, every glance into currency for algorithmic interpretation.";
let quoteWords = [];
let currentWordIndex = 0;
let lastMouthState = false;
let wordDisplayTime = 200; // milliseconds per word

// Fingertip drawing variables
let drawingPaths = [];
let currentPath = [];
let isDrawing = false;
let drawingColor = '#FFFF00'; // Default yellow color

// Data stream options
let dataStreamOptions = {
    mouthOpen: false,
    leftEyeOpen: false,
    rightEyeOpen: false,
    noseCenter: false,
    wristPosition: false,
    handOpen: false,
    fingertipPositions: false
};

// BASIC VISUAL SETTINGS - CUSTOMIZE THESE!

// Colors for different detections
const COLORS = {
    face: '#00FF00',      // Bright green for face mesh
    hands: '#FF0066'      // Hot pink for hands
};

// Drawing settings
let pointSize = 5;  // Consistent size for all landmarks
let lineThickness = 2;

// P5.JS SETUP FUNCTION - DON'T CHANGE THIS, THIS SETS UP OUR CANVAS AND COMPUTER VISION TOOLSET

function setup() {
    // Calculate dynamic canvas size
    calculateCanvasSize();
    
    // Create canvas with dynamic sizing
    canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('p5-container');
    
    // Set up UI controls
    setupControls();
    
    updateStatus("🚀 Initializing camera...");
    
    // Initialize video capture first
    initializeVideo();
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
}

function initializeVideo() {
    // Initialize video capture
    video = createCapture(VIDEO, () => {
        video.size(canvasWidth, canvasHeight);
        video.hide(); // Hide the default video element
    
        updateStatus("📹 Camera ready, checking ML5...");
        console.log("Video ready, checking ML5...");
        console.log("typeof ml5:", typeof ml5);
        console.log("window.ml5:", window.ml5);
        
        // Check for ML5 availability with more thorough detection
        function checkML5() {
            if (typeof ml5 !== 'undefined' && ml5.version) {
                console.log("✅ ML5 found! Version:", ml5.version);
                updateStatus("🤖 ML5 detected, loading models...");
                initializeML5Models();
            } else {
                console.log("❌ ML5 not found, retrying...");
                return false;
            }
            return true;
        }
        
        // Try immediately
        if (!checkML5()) {
            updateStatus("⏳ Waiting for ML5 to load...");
            
            // Try every 500ms for up to 10 seconds
            let attempts = 0;
            const maxAttempts = 20;
            
            const checkInterval = setInterval(() => {
                attempts++;
                console.log(`Attempt ${attempts}/${maxAttempts} to find ML5`);
                
                if (checkML5()) {
                    clearInterval(checkInterval);
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    updateStatus("❌ ML5 failed to load. Try refreshing the page.");
                    console.error("ML5 failed to load after", maxAttempts, "attempts");
}
            }, 500);
        }
    });
}

// P5.JS DRAW FUNCTION - MAIN ANIMATION LOOP

function draw() {
    // Clear background
    background(0);
    
    // Only draw video if it's loaded and ready AND showVideo is enabled
    if (showVideo && video && video.loadedmetadata) {
        // Draw video feed (mirrored for natural webcam feel)
        push();
        translate(width, 0);
        scale(-1, 1);
        tint(255, 200); // Slightly transparent video
        
        // Apply video filter if one is selected
        if (currentVideoFilter !== 'none') {
            applyVideoFilter();
        } else {
            image(video, 0, 0, width, height);
        }
        
        noTint();
        pop();
    } else if (!video || !video.loadedmetadata) {
        // Show loading indicator only if video isn't ready
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(24);
        text("Loading camera...", width/2, height/2);
    }
    
    // Draw all ML5 detections with extra debugging
    if (showFace) {
        console.log("Attempting to draw faces, count:", faces ? faces.length : 0);
        drawFaceMesh();
    }
    if (showHands) {
        console.log("Attempting to draw hands, count:", hands ? hands.length : 0);
        drawHands();
    }
    
    // Draw face pixelation if enabled
    if (showFacePixelation) {
        drawFacePixelation();
    }
    
    // Draw data stream in right panel if enabled
    if (showDataStream) {
        updateDataStreamPanel();
    }
    
    // Draw data labels on visualization if enabled
    if (showDataOnVisualization) {
        drawDataOnVisualization();
    }
    
    // Draw trigger effects
    if (winkTriggerEnabled) {
        drawWinkEffect();
    }
    
    if (mouthTextTriggerEnabled) {
        drawMouthTextEffect();
    }
    
    if (wristCircleTriggerEnabled) {
        drawWristCircleEffect();
    }
    
    // Draw fingertip drawing if enabled
    if (showFingertipDrawing) {
        drawFingertipDrawing();
    }
    
    // Update detection counts
    updateDetectionCounts();



}

// CANVAS SIZING AND RESPONSIVENESS

function calculateCanvasSize() {
    // Calculate canvas size based on window dimensions
    let maxWidth = windowWidth * CANVAS_SCALE;
    let maxHeight = windowHeight * CANVAS_SCALE;
    
    // Maintain 4:3 aspect ratio for video compatibility
    let aspectRatio = 4/3;
    
    if (maxWidth / aspectRatio <= maxHeight) {
        canvasWidth = maxWidth;
        canvasHeight = maxWidth / aspectRatio;
    } else {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * aspectRatio;
    }
    
    // Ensure minimum size for usability
    canvasWidth = max(canvasWidth, 480);
    canvasHeight = max(canvasHeight, 360);
}

function handleResize() {
    calculateCanvasSize();
    resizeCanvas(canvasWidth, canvasHeight);
    if (video && video.elt) {
        video.size(canvasWidth, canvasHeight);
    }
}

// ML5 MODEL INITIALIZATION

function initializeML5Models() {
    console.log("🚀 Starting ML5 model initialization...");
    updateStatus("🤖 Loading Face Mesh...");
    
    let modelsLoaded = 0;
    const totalModels = 2;
    
    function checkAllModelsLoaded() {
        modelsLoaded++;
        console.log(`✅ Model ${modelsLoaded}/${totalModels} loaded`);
        if (modelsLoaded >= totalModels) {
            updateStatus("🎯 All models ready! Starting predictions...");
            startPredictionLoop();
        }
    }
    
    try {
        // Initialize Face Mesh - v1.2.1 API
        console.log("Initializing Face Mesh...");
        faceMesh = ml5.faceMesh(video, {
            maxFaces: 1,  // Realistic limit - most models optimized for 1 face
            refineLandmarks: true,
            flipHorizontal: true
        }, () => {
            console.log("✅ Face Mesh ready!");
            updateStatus("🤖 Loading Hand Pose...");
            checkAllModelsLoaded();
        });
        
        // Initialize Hand Pose - v1.2.1 API
        console.log("Initializing Hand Pose...");
        handPose = ml5.handPose(video, {
            maxHands: 2,  // Realistic limit - typically 2 hands per person
            flipHorizontal: true
        }, () => {
            console.log("✅ Hand Pose ready!");
            checkAllModelsLoaded();
        });
        
        // Fallback: Start prediction loop after 5 seconds even if not all models load
        setTimeout(() => {
            if (modelsLoaded < totalModels) {
                console.log("⚠️ Not all models loaded, starting anyway...");
                updateStatus("⚠️ Some models failed, starting with available ones...");
                startPredictionLoop();
            }
        }, 5000);
        
    } catch (error) {
        console.error("Error initializing ML5 models:", error);
        updateStatus("❌ Error loading ML5 models. Try refreshing page.");
    }
}

// Correct prediction approach for ML5 v1.2.1
function startPredictionLoop() {
    console.log("🔄 Starting prediction loop with detectMedia...");
    
    // First, let's inspect what's actually available
    function inspectModels() {
        console.log("=== MODEL INSPECTION ===");
        
        if (faceMesh) {
            console.log("FaceMesh object:", faceMesh);
            console.log("FaceMesh.detectMedia type:", typeof faceMesh.detectMedia);
            console.log("FaceMesh.detect type:", typeof faceMesh.detect);
            console.log("FaceMesh.predict type:", typeof faceMesh.predict);
            console.log("FaceMesh.ready:", faceMesh.ready);
        }
        
        if (handPose) {
            console.log("HandPose object:", handPose);
            console.log("HandPose.detectMedia type:", typeof handPose.detectMedia);
            console.log("HandPose.detect type:", typeof handPose.detect);
            console.log("HandPose.predict type:", typeof handPose.predict);
            console.log("HandPose.ready:", handPose.ready);
        }
        
        console.log("Video element:", video);
        console.log("Video.elt:", video.elt);
        console.log("=== END INSPECTION ===");
    }
    
    function runDetections() {
        console.log("🔄 Running detection cycle...");
        
        // Inspect models first time
        if (!runDetections.inspected) {
            inspectModels();
            runDetections.inspected = true;
        }
        
        // Try multiple detection methods for Face Mesh
        if (faceMesh) {
            console.log("Trying face detection...");
            
            // Method 1: detectMedia
            if (typeof faceMesh.detectMedia === 'function' && video.elt) {
                console.log("Trying detectMedia...");
                try {
                    faceMesh.detectMedia(video.elt, (results) => {
                        console.log("Face detectMedia callback:", results);
                        if (results && results.length > 0) {
                            faces = results;
                            console.log("✅ Face results via detectMedia:", results.length);
                        }
                    });
                } catch (error) {
                    console.error("Face detectMedia error:", error);
                }
            }
            
            // Method 2: detect
            else if (typeof faceMesh.detect === 'function' && video.elt) {
                console.log("Trying detect...");
                try {
                    faceMesh.detect(video.elt, (results) => {
                        console.log("Face detect callback:", results);
                        if (results && results.length > 0) {
                            faces = results;
                            console.log("✅ Face results via detect:", results.length);
                        }
                    });
                } catch (error) {
                    console.error("Face detect error:", error);
                }
            }
            
            // Method 3: predict
            else if (typeof faceMesh.predict === 'function' && video.elt) {
                console.log("Trying predict...");
                try {
                    faceMesh.predict(video.elt, (results) => {
                        console.log("Face predict callback:", results);
                        if (results && results.length > 0) {
                            faces = results;
                            console.log("✅ Face results via predict:", results.length);
                        }
                    });
                } catch (error) {
                    console.error("Face predict error:", error);
                }
            }
            
            else {
                console.log("No working face detection method found");
            }
        }
        
        // Try multiple detection methods for Hand Pose
        if (handPose) {
            console.log("Trying hand detection...");
            
            if (typeof handPose.detectMedia === 'function' && video.elt) {
                try {
                    handPose.detectMedia(video.elt, (results) => {
                        if (results && results.length > 0) {
                            hands = results;
                            console.log("✅ Hand results via detectMedia:", results.length);
                        }
                    });
                } catch (error) {
                    console.error("Hand detectMedia error:", error);
                }
            }
            else if (typeof handPose.detect === 'function' && video.elt) {
                try {
                    handPose.detect(video.elt, (results) => {
                        if (results && results.length > 0) {
                            hands = results;
                            console.log("✅ Hand results via detect:", results.length);
                        }
                    });
                } catch (error) {
                    console.error("Hand detect error:", error);
                }
            }
            else if (typeof handPose.predict === 'function' && video.elt) {
                try {
                    handPose.predict(video.elt, (results) => {
                        if (results && results.length > 0) {
                            hands = results;
                            console.log("✅ Hand results via predict:", results.length);
                        }
                    });
                } catch (error) {
                    console.error("Hand predict error:", error);
                }
            }
            else {
                console.log("No working hand detection method found");
            }
        }
        
        // Continue the loop after a delay
        setTimeout(runDetections, 100); // Much faster - 10 FPS detection
    }
    
    // Add a small delay before starting to ensure video is ready
    setTimeout(() => {
        console.log("🎬 Starting detection loop...");
        runDetections();
    }, 2000);
}

// ML5 DRAWING FUNCTIONS

function drawFaceMesh() {
    if (!faces || faces.length === 0) return;
    
    console.log("Drawing", faces.length, "faces, structure:", faces[0]);
    
    noStroke();
    
    for (let face of faces) {
        console.log("Face object keys:", Object.keys(face));
        
        // Try different possible keypoint locations
        let keypoints = face.keypoints || face.landmarks || face.points || face.vertices;
        
        if (keypoints && keypoints.length > 0) {
            console.log("Found keypoints:", keypoints.length, "first point:", keypoints[0]);
            
            // Calculate face center for radial coloring
            let centerX = 0, centerY = 0;
            let validPoints = 0;
            
            // First pass: calculate center
            for (let point of keypoints) {
                let x, y;
                if (point.x !== undefined && point.y !== undefined) {
                    centerX += point.x;
                    centerY += point.y;
                    validPoints++;
                } else if (Array.isArray(point) && point.length >= 2) {
                    centerX += point[0];
                    centerY += point[1];
                    validPoints++;
                }
            }
            
            if (validPoints > 0) {
                centerX /= validPoints;
                centerY /= validPoints;
            }
            
            // Second pass: draw points with radial viridis coloring
            for (let point of keypoints) {
                let x, y;
                
                // Handle different data structures - ML5 already handles flipping
                if (point.x !== undefined && point.y !== undefined) {
                    x = point.x; // ML5 flipHorizontal: true already flipped these
                    y = point.y;
                } else if (Array.isArray(point) && point.length >= 2) {
                    x = point[0]; // ML5 flipHorizontal: true already flipped these
                    y = point[1];
                } else {
                    continue; // Skip this point if we can't understand it
                }
                
                // Calculate distance from center for radial coloring
                let distance = dist(x, y, centerX, centerY);
                let maxDistance = dist(0, 0, width/2, height/2); // Maximum possible distance
                let normalizedDistance = constrain(distance / maxDistance, 0, 1); // Must be 0-1 for getViridisColor
                
                // Apply a curve to make blue colors appear sooner
                // This will make the gradient transition to blue faster
                let adjustedDistance = pow(normalizedDistance, 0.2); // Even smaller exponent = much more blue
                
                // Viridis color mapping (from dark blue to yellow)
                let viridisColor = getViridisColor(adjustedDistance);
                fill(viridisColor);
                
                // Draw consistent sized dots for face landmarks
                ellipse(x, y, pointSize, pointSize);
            }
        } else {
            console.log("No keypoints found in face object");
        }
    }
}

function drawHands() {
    if (!hands || hands.length === 0) return;
    
    console.log("Drawing", hands.length, "hands");
    
    for (let hand of hands) {
        if (hand.keypoints && hand.keypoints.length > 0) {
            console.log("Hand has", hand.keypoints.length, "keypoints");
            
            // Draw hand landmarks
            fill(COLORS.hands);
            noStroke();
            
            for (let keypoint of hand.keypoints) {
                let x = keypoint.x; // ML5 flipHorizontal: true already flipped these
                let y = keypoint.y;
                
                // Draw consistent sized dots for hand landmarks
                ellipse(x, y, pointSize, pointSize);
            }
            
            // Draw hand connections
            stroke(COLORS.hands);
            strokeWeight(lineThickness);
            drawHandConnections(hand.keypoints);
            
            // Draw hand label
            if (hand.keypoints[0]) {
                fill(COLORS.hands);
                noStroke();
                textAlign(CENTER);
                textSize(12);
                text(hand.label || "Hand", 
                     hand.keypoints[0].x, 
                     hand.keypoints[0].y - 20);
            }
        }
    }
}

// FACE PIXELATION FUNCTION

function drawFacePixelation() {
    if (!faces || faces.length === 0 || !video || !video.loadedmetadata) return;
    
    // Get the first detected face
    let face = faces[0];
    if (!face || !face.keypoints) return;
    
    // Find face bounding box from landmarks
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    // Use more comprehensive face outline landmarks for better tracking
    // These are key MediaPipe face mesh landmarks that form the face contour
    let faceOutlineIndices = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
        // Add more landmarks for better coverage
        151, 108, 67, 103, 54, 21, 162, 127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454, 356, 389, 251, 284, 332, 297, 338,
        // Add forehead and chin landmarks
        336, 296, 334, 293, 300, 276, 283, 282, 295, 285, 417, 465, 357, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
    ];
    
    // Count valid landmarks found
    let validLandmarks = 0;
    
    for (let index of faceOutlineIndices) {
        if (face.keypoints[index]) {
            let point = face.keypoints[index];
            minX = min(minX, point.x);
            minY = min(minY, point.y);
            maxX = max(maxX, point.x);
            maxY = max(maxY, point.y);
            validLandmarks++;
        }
    }
    
    // Only proceed if we have enough valid landmarks
    if (validLandmarks < 10) {
        console.log("Not enough face landmarks for pixelation:", validLandmarks);
        return;
    }
    
    // Add generous padding around the face for better coverage
    let padding = 40;
    minX = max(0, minX - padding);
    minY = max(0, minY - padding);
    maxX = min(width, maxX + padding);
    maxY = min(height, maxY + padding);
    
    // Only pixelate if we have a valid face region with reasonable size
    let faceWidth = maxX - minX;
    let faceHeight = maxY - minY;
    
    if (minX < maxX && minY < maxY && faceWidth > 50 && faceHeight > 50) {
        // Use the global pixelSize variable (controlled by slider)
        // Or uncomment the line below for adaptive sizing:
        // let pixelSize = map(faceWidth, 50, 300, 6, 30);
        
        // Draw pixelated face region
        push();
        // Mirror the coordinates since video is flipped
        translate(width, 0);
        scale(-1, 1);
        
        // Create a temporary graphics buffer for the face region
        let faceBuffer = createGraphics(faceWidth, faceHeight);
        faceBuffer.image(video, -minX, -minY, width, height);
        
        // Draw pixelated version with better sampling
        for (let x = 0; x < faceBuffer.width; x += pixelSize) {
            for (let y = 0; y < faceBuffer.height; y += pixelSize) {
                // Sample color from center of pixel block
                let sampleX = x + pixelSize/2;
                let sampleY = y + pixelSize/2;
                
                if (sampleX < faceBuffer.width && sampleY < faceBuffer.height) {
                    let c = faceBuffer.get(sampleX, sampleY);
                    fill(c);
                    noStroke();
                    
                    // Draw pixel block (accounting for mirroring)
                    rect(width - maxX + x, y + minY, pixelSize, pixelSize);
                }
            }
        }
        pop();
        
        // Debug: Draw face bounding box (optional - comment out for production)
        // push();
        // stroke(255, 0, 0);
        // strokeWeight(2);
        // noFill();
        // rect(minX, minY, faceWidth, faceHeight);
        // pop();
    } else {
        console.log("Face region too small or invalid:", faceWidth, "x", faceHeight);
    }
}

// FINGERTIP DRAWING FUNCTION

function drawFingertipDrawing() {
    if (!hands || hands.length === 0) return;
    
    // Get all fingertip positions
    let allFingertips = getAllFingertipPositions();
    
    // Check if any fingertip is close to the screen (indicating drawing intent)
    let anyFingerDrawing = false;
    let drawingFinger = null;
    
    for (let handIndex = 0; handIndex < allFingertips.length; handIndex++) {
        let handTips = allFingertips[handIndex];
        if (handTips) {
            for (let fingerIndex = 0; fingerIndex < handTips.length; fingerIndex++) {
                if (handTips[fingerIndex]) {
                    let tip = handTips[fingerIndex];
                    
                    // Check if finger is extended and in drawing position
                    // We'll use the index finger (fingerIndex 1) as the primary drawing finger
                    if (fingerIndex === 1 && isFingerExtended(hands[handIndex], fingerIndex)) {
                        anyFingerDrawing = true;
                        drawingFinger = tip;
                        break;
                    }
                }
            }
        }
    }
    
    // Handle drawing state
    if (anyFingerDrawing && drawingFinger) {
        if (!isDrawing) {
            // Start new path
            isDrawing = true;
            currentPath = [];
        }
        
        // Add point to current path
        currentPath.push({
            x: drawingFinger.x,
            y: drawingFinger.y,
            timestamp: millis()
        });
        
    } else {
        if (isDrawing) {
            // Finish current path
            if (currentPath.length > 0) {
                drawingPaths.push([...currentPath]);
            }
            isDrawing = false;
            currentPath = [];
        }
    }
    
    // Draw all completed paths
    stroke(drawingColor); // Use selected color instead of hardcoded yellow
    strokeWeight(3);
    noFill();
    
    for (let path of drawingPaths) {
        if (path.length > 1) {
            beginShape();
            for (let point of path) {
                vertex(point.x, point.y);
            }
            endShape();
        }
    }
    
    // Draw current path
    if (currentPath.length > 1) {
        beginShape();
        for (let point of currentPath) {
            vertex(point.x, point.y);
        }
        endShape();
    }
    
    // Draw fingertip indicator
    if (drawingFinger) {
        // Use different colors for draw vs erase mode
        let indicatorColor = drawingColor; // Always use selected color for indicator
        fill(indicatorColor);
        noStroke();
        ellipse(drawingFinger.x, drawingFinger.y, 10, 10);
    }
    
    // Reset stroke
    noStroke();
}

// Helper function to check if a finger is extended
function isFingerExtended(hand, fingerIndex) {
    if (!hand || !hand.keypoints) return false;
    
    // Finger tip indices: thumb(4), index(8), middle(12), ring(16), pinky(20)
    const tipIndices = [4, 8, 12, 16, 20];
    const baseIndices = [2, 5, 9, 13, 17]; // Base of each finger
    
    if (fingerIndex >= 0 && fingerIndex < tipIndices.length) {
        let tip = hand.keypoints[tipIndices[fingerIndex]];
        let base = hand.keypoints[baseIndices[fingerIndex]];
        let wrist = hand.keypoints[0];
        
        if (tip && base && wrist) {
            // Check if finger is extended by comparing distances
            let tipToWrist = getLandmarkDistance(tip, wrist);
            let baseToWrist = getLandmarkDistance(base, wrist);
            
            // Finger is extended if tip is further from wrist than base
            return tipToWrist > baseToWrist + 20; // Add some tolerance
        }
    }
    return false;
}

// Function to clear all fingertip drawings
function clearFingertipDrawing() {
    drawingPaths = [];
    currentPath = [];
    isDrawing = false;
}

// DATA STREAM FUNCTIONS

function updateDataStreamPanel() {
    let contentHtml = '';
    
    // Extract and display data based on enabled options
    if (dataStreamOptions.mouthOpen) {
        let mouthOpen = isMouthOpen();
        contentHtml += `<div class="data-item"><strong>Mouth Open:</strong> ${mouthOpen}</div>`;
    }
    
    if (dataStreamOptions.leftEyeOpen) {
        let leftEyeOpen = isLeftEyeOpen();
        contentHtml += `<div class="data-item"><strong>Left Eye Open:</strong> ${leftEyeOpen}</div>`;
    }
    
    if (dataStreamOptions.rightEyeOpen) {
        let rightEyeOpen = isRightEyeOpen();
        contentHtml += `<div class="data-item"><strong>Right Eye Open:</strong> ${rightEyeOpen}</div>`;
    }
    
    if (dataStreamOptions.noseCenter) {
        let nosePos = getNoseCenter();
        if (nosePos) {
            contentHtml += `<div class="data-item"><strong>Nose Center:</strong> (${nosePos.x.toFixed(1)}, ${nosePos.y.toFixed(1)})</div>`;
        } else {
            contentHtml += `<div class="data-item"><strong>Nose Center:</strong> Not detected</div>`;
        }
    }
    
    if (dataStreamOptions.wristPosition) {
        let wrists = getWristPositions();
        for (let i = 0; i < wrists.length; i++) {
            if (wrists[i]) {
                contentHtml += `<div class="data-item"><strong>Wrist ${i + 1}:</strong> (${wrists[i].x.toFixed(1)}, ${wrists[i].y.toFixed(1)})</div>`;
            } else {
                contentHtml += `<div class="data-item"><strong>Wrist ${i + 1}:</strong> Not detected</div>`;
            }
        }
    }
    
    if (dataStreamOptions.handOpen) {
        let handsOpen = getHandsOpenStatus();
        for (let i = 0; i < handsOpen.length; i++) {
            contentHtml += `<div class="data-item"><strong>Hand ${i + 1} Open:</strong> ${handsOpen[i]}</div>`;
        }
    }
    
    if (dataStreamOptions.fingertipPositions) {
        let fingertips = getAllFingertipPositions();
        for (let handIndex = 0; handIndex < fingertips.length; handIndex++) {
            let handTips = fingertips[handIndex];
            if (handTips) {
                contentHtml += `<div class="data-section"><strong>Hand ${handIndex + 1} Fingertips:</strong></div>`;
                const fingerNames = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
                for (let i = 0; i < handTips.length; i++) {
                    if (handTips[i]) {
                        contentHtml += `<div class="data-subitem">${fingerNames[i]}: (${handTips[i].x.toFixed(1)}, ${handTips[i].y.toFixed(1)})</div>`;
                    }
                }
            }
        }
    }
    
    // Update the HTML content
    document.getElementById('dataStreamContent').innerHTML = contentHtml || '<div class="data-item">No data options selected</div>';
}

function drawDataOnVisualization() {
    // Set text style for visualization labels
    textAlign(LEFT);
    textSize(11);
    fill(255, 255, 0); // Yellow text for visibility
    stroke(0);
    strokeWeight(1);
    
    // Draw mouth status near mouth area
    if (dataStreamOptions.mouthOpen) {
        if (faces.length > 0 && faces[0].keypoints && faces[0].keypoints.length > 14) {
            let face = faces[0];
            let mouthOpen = isMouthOpen();
            let mouthPos = face.keypoints[14]; // Lower lip area
            if (mouthPos) {
                text(`Mouth: ${mouthOpen ? "Open" : "Closed"}`, mouthPos.x + 10, mouthPos.y + 20);
            }
        }
    }
    
    // Draw left eye status near left eye
    if (dataStreamOptions.leftEyeOpen) {
        if (faces.length > 0 && faces[0].keypoints && faces[0].keypoints.length > 133) {
            let face = faces[0];
            let leftEyeOpen = isLeftEyeOpen();
            let leftEyePos = face.keypoints[133]; // Left eye center (subject's left = viewer's right)
            if (leftEyePos) {
                text(`L Eye: ${leftEyeOpen ? "Open" : "Closed"}`, leftEyePos.x + 15, leftEyePos.y - 10);
            }
        }
    }
    
    // Draw right eye status near right eye
    if (dataStreamOptions.rightEyeOpen) {
        if (faces.length > 0 && faces[0].keypoints && faces[0].keypoints.length > 362) {
            let face = faces[0];
            let rightEyeOpen = isRightEyeOpen();
            let rightEyePos = face.keypoints[362]; // Right eye center (subject's right = viewer's left)
            if (rightEyePos) {
                text(`R Eye: ${rightEyeOpen ? "Open" : "Closed"}`, rightEyePos.x - 60, rightEyePos.y - 10);
            }
        }
    }
    
    // Draw nose coordinates near nose
    if (dataStreamOptions.noseCenter) {
        let nosePos = getNoseCenter();
        if (nosePos) {
            text(`(${nosePos.x.toFixed(0)}, ${nosePos.y.toFixed(0)})`, nosePos.x + 10, nosePos.y - 10);
        }
    }
    
    // Draw wrist coordinates near each wrist
    if (dataStreamOptions.wristPosition) {
        let wrists = getWristPositions();
        for (let i = 0; i < wrists.length; i++) {
            if (wrists[i]) {
                text(`W${i + 1}: (${wrists[i].x.toFixed(0)}, ${wrists[i].y.toFixed(0)})`, 
                     wrists[i].x + 10, wrists[i].y - 10);
            }
        }
    }
    
    // Draw hand open/closed status near palm
    if (dataStreamOptions.handOpen) {
        let handsOpen = getHandsOpenStatus();
        for (let i = 0; i < hands.length; i++) {
            if (hands[i] && hands[i].keypoints && hands[i].keypoints[9]) { // Middle finger base (palm area)
                let palmPos = hands[i].keypoints[9];
                text(`${handsOpen[i] ? "Open" : "Closed"}`, palmPos.x + 10, palmPos.y + 20);
            }
        }
    }
    
    // Draw fingertip coordinates near each fingertip
    if (dataStreamOptions.fingertipPositions) {
        let fingertips = getAllFingertipPositions();
        const fingerNames = ['T', 'I', 'M', 'R', 'P']; // Abbreviated names
        for (let handIndex = 0; handIndex < fingertips.length; handIndex++) {
            let handTips = fingertips[handIndex];
            if (handTips) {
                for (let i = 0; i < handTips.length; i++) {
                    if (handTips[i]) {
                        text(`${fingerNames[i]}:(${handTips[i].x.toFixed(0)},${handTips[i].y.toFixed(0)})`, 
                             handTips[i].x + 8, handTips[i].y - 8);
                    }
                }
            }
        }
    }
    
    noStroke(); // Reset stroke
}

// TRIGGER EFFECT FUNCTIONS

function drawWinkEffect() {
    // Check if exactly one eye is closed
    let leftEyeOpen = isLeftEyeOpen();
    let rightEyeOpen = isRightEyeOpen();
    
    if ((leftEyeOpen && !rightEyeOpen) || (!leftEyeOpen && rightEyeOpen)) {
        // Draw WINK text in cute pink
        push();
        fill(255, 20, 147); // Deep pink
        textAlign(CENTER, CENTER);
        textSize(72);
        textStyle(BOLD);
        
        // Add some fun styling
        stroke(255);
        strokeWeight(3);
        
        text("WINK", width / 2, height / 2);
        pop();
    }
}

function drawMouthTextEffect() {
    let mouthOpen = isMouthOpen();
    
    // Reset when mouth closes
    if (!mouthOpen && lastMouthState) {
        currentWordIndex = 0;
    }
    
    lastMouthState = mouthOpen;
    
    if (mouthOpen && quoteWords.length > 0) {
        // Display words progressively
        let wordsToShow = Math.floor((millis() % (quoteWords.length * wordDisplayTime)) / wordDisplayTime);
        wordsToShow = Math.min(wordsToShow, quoteWords.length - 1);
        
        let textToDisplay = quoteWords.slice(0, wordsToShow + 1).join(' ');
        
        if (textToDisplay) {
            push();
            fill(255, 255, 0); // Yellow text
            stroke(0);
            strokeWeight(2);
            textAlign(CENTER, TOP);
            textSize(24);
            textStyle(NORMAL);
            
            // Word wrap for long text
            let lines = textToDisplay.split(' ');
            let currentLine = '';
            let lineHeight = 30;
            let yPos = 50;
            
            for (let word of lines) {
                let testLine = currentLine + word + ' ';
                if (textWidth(testLine) > width - 40 && currentLine.length > 0) {
                    text(currentLine, width / 2, yPos);
                    currentLine = word + ' ';
                    yPos += lineHeight;
                } else {
                    currentLine = testLine;
                }
            }
            
            if (currentLine.length > 0) {
                text(currentLine, width / 2, yPos);
            }
            
            pop();
        }
    }
}

function drawWristCircleEffect() {
    let wrists = getWristPositions();
    
    if (wrists.length >= 2 && wrists[0] && wrists[1]) {
        // Calculate center point between wrists
        let centerX = (wrists[0].x + wrists[1].x) / 2;
        let centerY = (wrists[0].y + wrists[1].y) / 2;
        
        // Calculate distance between wrists
        let distance = getLandmarkDistance(wrists[0], wrists[1]);
        
        // Map distance to circle size (adjust these values as needed)
        let circleSize = map(distance, 50, 400, 20, 200);
        circleSize = constrain(circleSize, 20, 200);
        
        // Draw white circle with no stroke
        push();
        fill(255);
        noStroke();
        ellipse(centerX, centerY, circleSize, circleSize);
        pop();
    }
}

// Data extraction functions
function isMouthOpen() {
    if (faces.length === 0 || !faces[0].keypoints) return false;
    let face = faces[0];
    
    // Face mesh landmarks: upper lip center (13) and lower lip center (14)
    // These are approximate - actual face mesh has 478 points
    if (face.keypoints.length >= 478) {
        let upperLip = face.keypoints[13];
        let lowerLip = face.keypoints[14];
        if (upperLip && lowerLip) {
            let distance = getLandmarkDistance(upperLip, lowerLip);
            return distance > 15; // Threshold for mouth open
        }
    }
    return false;
}

function isLeftEyeOpen() {
    if (faces.length === 0 || !faces[0].keypoints) return false;
    let face = faces[0];
    
    // MediaPipe face mesh left eye landmarks (subject's left = viewer's right)
    if (face.keypoints.length >= 478) {
        let upperEyelid = face.keypoints[159]; // Left eye upper eyelid
        let lowerEyelid = face.keypoints[145]; // Left eye lower eyelid
        if (upperEyelid && lowerEyelid) {
            let distance = getLandmarkDistance(upperEyelid, lowerEyelid);
            return distance > 8; // Threshold for eye open (adjust as needed)
        }
    }
    return true; // Default to open if landmarks not available
}

function isRightEyeOpen() {
    if (faces.length === 0 || !faces[0].keypoints) return false;
    let face = faces[0];
    
    // MediaPipe face mesh right eye landmarks (subject's right = viewer's left)
    if (face.keypoints.length >= 478) {
        let upperEyelid = face.keypoints[386]; // Right eye upper eyelid
        let lowerEyelid = face.keypoints[374]; // Right eye lower eyelid
        if (upperEyelid && lowerEyelid) {
            let distance = getLandmarkDistance(upperEyelid, lowerEyelid);
            return distance > 8; // Threshold for eye open (adjust as needed)
        }
    }
    return true; // Default to open if landmarks not available
}

function getNoseCenter() {
    if (faces.length === 0 || !faces[0].keypoints) return null;
    let face = faces[0];
    
    // Face mesh nose tip is typically around index 1 or 2
    if (face.keypoints.length > 2) {
        return face.keypoints[1]; // Approximate nose tip
    }
    return null;
}

function getWristPositions() {
    let wrists = [];
    for (let hand of hands) {
        if (hand.keypoints && hand.keypoints[0]) {
            wrists.push(hand.keypoints[0]); // Wrist is index 0
        } else {
            wrists.push(null);
        }
    }
    return wrists;
}

function getHandsOpenStatus() {
    let handsOpen = [];
    for (let hand of hands) {
        handsOpen.push(!isHandFist(hand)); // Inverse of fist detection
    }
    return handsOpen;
}

function getAllFingertipPositions() {
    let allFingertips = [];
    for (let hand of hands) {
        if (hand.keypoints) {
            let fingertips = [
                hand.keypoints[4],  // Thumb tip
                hand.keypoints[8],  // Index finger tip
                hand.keypoints[12], // Middle finger tip
                hand.keypoints[16], // Ring finger tip
                hand.keypoints[20]  // Pinky tip
            ];
            allFingertips.push(fingertips);
        } else {
            allFingertips.push(null);
        }
    }
    return allFingertips;
}


// CONNECTION DRAWING HELPERS

function drawHandConnections(keypoints) {
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],     // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],     // Index finger
        [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17]           // Palm connections
    ];
    
    for (let connection of connections) {
        let a = keypoints[connection[0]];
        let b = keypoints[connection[1]];
        if (a && b) {
            line(a.x, a.y, b.x, b.y);
        }
    }
}

// USER INTERFACE AND CONTROLS

function setupControls() {
    // Video and detection toggles
    document.getElementById('videoToggle').addEventListener('change', function() {
        showVideo = this.checked;
    });
    
    document.getElementById('faceToggle').addEventListener('change', function() {
        showFace = this.checked;
    });
    
    document.getElementById('facePixelationToggle').addEventListener('change', function() {
        showFacePixelation = this.checked;
        // Show/hide pixel size slider
        let pixelSizeGroup = document.getElementById('pixelSizeGroup');
        pixelSizeGroup.style.display = this.checked ? 'block' : 'none';
    });
    
    // Pixel size slider
    document.getElementById('pixelSizeSlider').addEventListener('input', function() {
        pixelSize = parseInt(this.value);
        document.getElementById('pixelSizeValue').textContent = pixelSize;
    });
    
    document.getElementById('handToggle').addEventListener('change', function() {
        showHands = this.checked;
    });
    
    // Data stream toggle
    document.getElementById('dataStreamToggle').addEventListener('change', function() {
        showDataStream = this.checked;
        let dataOptions = document.getElementById('dataOptions');
        let dataPanel = document.getElementById('dataPanel');
        dataOptions.style.display = this.checked ? 'block' : 'none';
        dataPanel.style.display = this.checked ? 'block' : 'none';
    });
    
    // Data on visualization toggle
    document.getElementById('dataOnVisualizationToggle').addEventListener('change', function() {
        showDataOnVisualization = this.checked;
    });
    
    // Fingertip drawing toggle
    document.getElementById('fingertipDrawingToggle').addEventListener('change', function() {
        showFingertipDrawing = this.checked;
        // Show/hide color picker and drawing controls
        let colorGroup = document.getElementById('drawingColorGroup');
        let drawingControls = document.getElementById('drawingControls');
        colorGroup.style.display = this.checked ? 'block' : 'none';
        drawingControls.style.display = this.checked ? 'block' : 'none';
        // Clear existing drawings when toggling off
        if (!this.checked) {
            clearFingertipDrawing();
        }
    });
    
    // Drawing color picker
    document.getElementById('drawingColorPicker').addEventListener('input', function() {
        drawingColor = this.value;
    });
    
    // Clear drawing button
    document.getElementById('clearDrawingButton').addEventListener('click', function() {
        clearFingertipDrawing();
    });
    
    // Data stream option toggles
    document.getElementById('mouthOpenOption').addEventListener('change', function() {
        dataStreamOptions.mouthOpen = this.checked;
    });
    
    document.getElementById('leftEyeOpenOption').addEventListener('change', function() {
        dataStreamOptions.leftEyeOpen = this.checked;
    });
    
    document.getElementById('rightEyeOpenOption').addEventListener('change', function() {
        dataStreamOptions.rightEyeOpen = this.checked;
    });
    
    document.getElementById('noseCenterOption').addEventListener('change', function() {
        dataStreamOptions.noseCenter = this.checked;
    });
    
    document.getElementById('wristPositionOption').addEventListener('change', function() {
        dataStreamOptions.wristPosition = this.checked;
    });
    
    document.getElementById('handOpenOption').addEventListener('change', function() {
        dataStreamOptions.handOpen = this.checked;
    });
    
    document.getElementById('fingertipPositionsOption').addEventListener('change', function() {
        dataStreamOptions.fingertipPositions = this.checked;
    });
    
    // Trigger toggles
    document.getElementById('winkTrigger').addEventListener('change', function() {
        winkTriggerEnabled = this.checked;
    });
    
    document.getElementById('mouthTextTrigger').addEventListener('change', function() {
        mouthTextTriggerEnabled = this.checked;
        if (this.checked) {
            // Initialize text when enabled
            quoteWords = criticalTheoryQuote.split(' ');
            currentWordIndex = 0;
        }
    });
    
    document.getElementById('wristCircleTrigger').addEventListener('change', function() {
        wristCircleTriggerEnabled = this.checked;
    });
    
    // Video filter controls
    document.querySelectorAll('input[name="videoFilter"]').forEach(function(radio) {
        radio.addEventListener('change', function() {
            currentVideoFilter = this.value;
            console.log('Video filter changed to:', currentVideoFilter);
        });
    });
}

function updateStatus(message) {
    document.getElementById('status').innerHTML = message;
}

function updateDetectionCounts() {
    // Update total detection count
    let totalCount = faces.length + hands.length;
    document.getElementById('detectionCount').textContent = totalCount;
}

// BEGINNER-FRIENDLY HELPER FUNCTIONS

// Note: Since maxFaces is 1, faces[0] is the only possible face

// RdYlBu (Red-Yellow-Blue) color mapping function
function getViridisColor(t) {
    // RdYlBu color palette (red → yellow → blue)
    // t should be between 0 and 1
    t = constrain(t, 0, 1);
    
    // RdYlBu color stops (approximated) - Reds last longer
    const rdylbuStops = [
        [0.0, [215, 25, 28, 255]],  // Red
        [0.3, [252, 78, 42, 255]],  // Red-orange
        [0.5, [253, 141, 60, 255]], // Orange
        [0.6, [254, 217, 118, 255]], // Yellow-orange
        [0.7, [255, 237, 160, 255]], // Light yellow
        [0.8, [127, 205, 187, 255]], // Green-blue
        [0.9, [65, 182, 196, 255]], // Blue-green
        [1.0, [29, 79, 201, 255]]   // Blue
    ];
    
    // Find the two stops to interpolate between
    let i = 0;
    for (i = 0; i < rdylbuStops.length - 1; i++) {
        if (t <= rdylbuStops[i + 1][0]) break;
    }
    
    let t0 = rdylbuStops[i][0];
    let t1 = rdylbuStops[i + 1][0];
    let localT = (t - t0) / (t1 - t0);
    
    let color0 = rdylbuStops[i][1];
    let color1 = rdylbuStops[i + 1][1];
    
    // Interpolate between the two colors
    let r = lerp(color0[0], color1[0], localT);
    let g = lerp(color0[1], color1[1], localT);
    let b = lerp(color0[2], color1[2], localT);
    
    return color(r, g, b);
}

// Get distance between two landmarks
function getLandmarkDistance(landmark1, landmark2) {
    if (landmark1 && landmark2) {
        return dist(landmark1.x, landmark1.y, landmark2.x, landmark2.y);
    }
    return 0;
}

// Check if hand is making a fist
function isHandFist(hand) {
    if (!hand || !hand.keypoints) return false;
    
    // Simple fist detection: check if fingertips are close to palm
    let palmCenter = hand.keypoints[0]; // Wrist
    let fingertips = [4, 8, 12, 16, 20]; // Thumb, index, middle, ring, pinky tips
    
    let closedFingers = 0;
    for (let tipIndex of fingertips) {
        if (hand.keypoints[tipIndex]) {
            let distance = getLandmarkDistance(palmCenter, hand.keypoints[tipIndex]);
            if (distance < 100) closedFingers++;
        }
    }
    
    return closedFingers >= 3;
}

// VIDEO FILTER FUNCTIONS

function applyVideoFilter() {
    // Create a graphics buffer to apply filters
    let filteredVideo = createGraphics(width, height);
    filteredVideo.image(video, 0, 0, width, height);
    
    // Apply the selected filter
    switch (currentVideoFilter) {
        case 'bw':
            applyBlackAndWhiteFilter(filteredVideo);
            break;
        case 'invert':
            applyInvertFilter(filteredVideo);
            break;
    }
    
    // Draw the filtered video
    image(filteredVideo, 0, 0, width, height);
}

function applyBlackAndWhiteFilter(graphics) {
    graphics.loadPixels();
    for (let i = 0; i < graphics.pixels.length; i += 4) {
        let r = graphics.pixels[i];
        let g = graphics.pixels[i + 1];
        let b = graphics.pixels[i + 2];
        
        // Convert to grayscale using luminance formula
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        graphics.pixels[i] = gray;
        graphics.pixels[i + 1] = gray;
        graphics.pixels[i + 2] = gray;
    }
    graphics.updatePixels();
}

function applyInvertFilter(graphics) {
    graphics.loadPixels();
    for (let i = 0; i < graphics.pixels.length; i += 4) {
        graphics.pixels[i] = 255 - graphics.pixels[i];
        graphics.pixels[i + 1] = 255 - graphics.pixels[i + 1];
        graphics.pixels[i + 2] = 255 - graphics.pixels[i + 2];
    }
    graphics.updatePixels();
}

// CREATIVE CODING SPACE FOR BEGINNERS

/*
BEGINNER TIPS:

1. Access detected landmarks:
   - Face: faces[0] - Single face with 478 keypoints (maxFaces: 1)
   - Hands: Loop through hands array - up to 2 hands with 21 keypoints each

2. Create interactive effects:
   - Use landmark positions to control visuals
   - Check distances between points with getLandmarkDistance()
   - Detect gestures like fists with isHandFist()
   - Detect eye states with isLeftEyeOpen() and isRightEyeOpen()

3. Customize colors:
   - Change values in the COLORS object above
   - Use color(red, green, blue) for custom colors

4. Add your own drawings:
   - Use the draw() function to add custom visuals
   - Draw shapes based on landmark positions
   - Create particle systems that follow movements

5. Interactive triggers (see TRIGGERS section):
   - Wink detection: Shows "WINK" text when one eye is closed
   - Mouth text stream: Displays text word-by-word when mouth is open
   - Wrist circle: White circle between wrists that changes size with distance
   
NOTE: To change the mouth text, edit the 'criticalTheoryQuote' variable above.
*/