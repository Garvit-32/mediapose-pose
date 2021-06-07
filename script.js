// Our input frames will come from here.
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');

// We'll add this to our control panel later, but we'll save it here so we can
// call tick() each time the graph runs.
const fpsControl = new FPS();

// Optimization: Turn off animated spinner after its hiding animation is done.
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
  spinner.style.display = 'none';
};

function zColor(data) {
  return 'white';
}


var prev_flag = 0;
var flag = 0;
var counter = 0;


function get_angle(val) {
  // val[11] val[12] val[13]
  var a = Math.sqrt(Math.pow(val[13]['x'] - val[12]['x'], 2) + Math.pow(val[13]['y'] - val[12]['y'], 2))
  var b = Math.sqrt(Math.pow(val[13]['x'] - val[11]['x'], 2) + Math.pow(val[13]['y'] - val[11]['y'], 2))
  var c = Math.sqrt(Math.pow(val[12]['x'] - val[11]['x'], 2) + Math.pow(val[12]['y'] - val[11]['y'], 2))
  var term = (Math.pow(a, 2) + Math.pow(c, 2) - Math.pow(b, 2)) / (2 * a * c)
  if (term > 1) {
    term = 1;
  } else if (term < -1) {
    term = -1;
  }
  var angle_rad = Math.acos(term)
  var angle = (180 * angle_rad) / Math.PI
  return angle
}

function onResults(results) {
  // Hide the spinner.
  document.body.classList.add('loaded');
  // console.log(Object.values(POSE_LANDMARKS_LEFT).slice(11, 14));
  angle = get_angle(Object.values(POSE_LANDMARKS_LEFT).map(index => results.poseLandmarks[index]));
  // console.log(angle);


  if (angle > 110) flag = 0
  if (angle < 70) flag = 1
  if (prev_flag == 1 && flag == 0) counter = counter + 1
  prev_flag = flag
  // console.log(counter);

  // Update the frame rate. 
  fpsControl.tick();
  // Draw the overlays.
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (angle < 70) {
    drawConnectors(
      canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      visibilityMin: 0.65,
      color: 'green'
    });
  } else {
    drawConnectors(
      canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      visibilityMin: 0.65,
      color: 'white'
    });
  }
  drawLandmarks(
    canvasCtx,
    Object.values(POSE_LANDMARKS_LEFT)
      .map(index => results.poseLandmarks[index]),
    { visibilityMin: 0.65, color: zColor, fillColor: 'rgb(255,138,0)' });
  drawLandmarks(
    canvasCtx,
    Object.values(POSE_LANDMARKS_RIGHT)
      .map(index => results.poseLandmarks[index]),
    { visibilityMin: 0.65, color: zColor, fillColor: 'rgb(0,217,231)' });
  drawLandmarks(
    canvasCtx,
    Object.values(POSE_LANDMARKS_NEUTRAL)
      .map(index => results.poseLandmarks[index]),
    { visibilityMin: 0.65, color: zColor, fillColor: 'white' });
  canvasCtx.restore();
}

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.3.1621277220/${file}`;
  }
});
pose.onResults(onResults);

/**
 * Instantiate a camera. We'll feed each frame we receive into the solution.
 */
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 1280,
  height: 720
});
camera.start();

// Present a control panel through which the user can manipulate the solution
// options.
new ControlPanel(controlsElement, {
  selfieMode: true,
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
})
  .add([
    new StaticText({ title: 'MediaPipe Pose' }),
    new StaticText({ title: 'Squat Counter ' + counter }),
    fpsControl,
    new Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
    new Slider({
      title: 'Model Complexity',
      field: 'modelComplexity',
      discrete: ['Lite', 'Full', 'Heavy'],
    }),
    new Toggle({ title: 'Smooth Landmarks', field: 'smoothLandmarks' }),
    new Slider({
      title: 'Min Detection Confidence',
      field: 'minDetectionConfidence',
      range: [0, 1],
      step: 0.01
    }),
    new Slider({
      title: 'Min Tracking Confidence',
      field: 'minTrackingConfidence',
      range: [0, 1],
      step: 0.01
    }),
  ])
  .on(options => {
    videoElement.classList.toggle('selfie', options.selfieMode);
    pose.setOptions(options);
  });