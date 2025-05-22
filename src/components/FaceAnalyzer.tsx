import ReactGA from "react-ga4";

import React, { useEffect, useRef, useState } from "react";
import * as mp from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import * as tf from "@tensorflow/tfjs";
import { Player } from "@lottiefiles/react-lottie-player";
import scanAnimation from "./scanner.json"; // adjust path as needed
import { FaceAnalyzerProps, type FaceInfo } from "../lib/interface";

const FaceAnalyzer: React.FC<FaceAnalyzerProps> = ({ callback }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ageModel = useRef<tf.GraphModel | null>(null);
  const genderModel = useRef<tf.LayersModel | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [showRetakeButton, setShowRetakeButton] = useState(false); // New state

  const [info, setInfo] = useState<FaceInfo>({});

  const animationStart = useRef(Date.now());

  useEffect(() => {
    const loadModels = async () => {
      await tf.ready();
      /*
      ageModel.current = await tf.loadGraphModel(
        "https://tfhub.dev/tensorflow/tfjs-model/imagenet/mobilenet_v2_140_224/classification/5/default/1",
        { fromTFHub: true },
      );
      */
      genderModel.current = await tf.loadLayersModel("/gender/model.json");
    };
    loadModels();
  }, []);

  const drawAnimatedOval = (
    ctx: CanvasRenderingContext2D,
    points: mp.NormalizedLandmark[],
  ) => {
    const time = (Date.now() - animationStart.current) / 1000;
    const progress = (Math.sin(time * 2) + 1) / 2;
    const len = Math.floor(points.length * progress);

    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const pt = points[i];
      const x = pt.x * ctx.canvas.width;
      const y = pt.y * ctx.canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = `rgba(0, 255, 0, ${0.7 + 0.3 * Math.sin(time * 4)})`;
    ctx.lineWidth = 2 + Math.sin(time * 4);
    ctx.shadowColor = "lime";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  const analyzeFace = async (
    canvas: HTMLCanvasElement,
    landmarks: mp.NormalizedLandmark[],
  ) => {
    // const ctx = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;

    const xs = landmarks.map((pt) => pt.x * w);
    const ys = landmarks.map((pt) => pt.y * h);
    const minX = Math.max(Math.min(...xs) - 20, 0);
    const maxX = Math.min(Math.max(...xs) + 20, w);
    const minY = Math.max(Math.min(...ys) - 20, 0);
    const maxY = Math.min(Math.max(...ys) + 20, h);

    const faceW = maxX - minX;
    const faceH = maxY - minY;

    const faceCanvas = document.createElement("canvas");
    faceCanvas.width = faceW;
    faceCanvas.height = faceH;
    const faceCtx = faceCanvas.getContext("2d")!;
    faceCtx.drawImage(canvas, minX, minY, faceW, faceH, 0, 0, faceW, faceH);

    if (ageModel.current) {
      try {
        const tfImg = tf.browser
          .fromPixels(faceCanvas)
          .resizeBilinear([224, 224])
          .expandDims(0)
          .div(255);
        const prediction = ageModel.current.predict(tfImg) as tf.Tensor;
        const age = prediction.dataSync()[0];
        tfImg.dispose();
        prediction.dispose();
        setInfo((prev) => ({ ...prev, age: `~${Math.round(age)} years` }));
      } catch (error) {
        console.log(error);
        setInfo((prev) => ({ ...prev, age: "Error" }));
      }
    }

    if (genderModel.current) {
      try {
        const tfImg = tf.browser
          .fromPixels(faceCanvas)
          .resizeBilinear([96, 96]) // 👈 Correct size for gender model
          .expandDims(0)
          .div(255);

        const genderPred = genderModel.current.predict(tfImg) as tf.Tensor;
        const genderProb = genderPred.dataSync()[0]; // assuming output is probability
        const gender = genderProb > 0.9 ? "Men" : "Women";
        setInfo((prev) => ({ ...prev, gender }));

        tfImg.dispose();
        genderPred.dispose();
      } catch (error) {
        console.log(error);
        setInfo((prev) => ({ ...prev, gender: "Error" }));
      }
    } else {
      console.log("Gender model not loaded");
    }

    const jaw = Math.hypot(
      (landmarks[234].x - landmarks[454].x) * w,
      (landmarks[234].y - landmarks[454].y) * h,
    );
    const height = Math.hypot(
      (landmarks[10].x - landmarks[152].x) * w,
      (landmarks[10].y - landmarks[152].y) * h,
    );
    const ratio = height / jaw;
    let faceShape = "Unknown";
    if (ratio < 1.2) faceShape = "Round";
    else if (ratio < 1.5) faceShape = "Oval";
    else faceShape = "Long";
    setInfo((prev) => ({ ...prev, faceShape }));

    const imageData = faceCtx.getImageData(0, 0, faceW, faceH);
    const data = imageData.data;

    let r = 0,
      g = 0,
      b = 0,
      count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];
      const alpha = data[i + 3];
      const avg = (red + green + blue) / 3;

      // Filter out transparent or non-skin-like pixels
      if (alpha < 128 || avg < 40 || avg > 230) continue;

      r += red;
      g += green;
      b += blue;
      count++;
    }

    if (count > 0) {
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      const avgHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      // const avg = (r + g + b) / 3;

      // Skin tone reference palette
      const referenceColors = [
        { name: "Light", hex: "#AF8169", rgb: [175, 129, 105] }, // Covers 163–188 range
        { name: "Beige", hex: "#A77861", rgb: [167, 120, 97] }, // Slightly deeper
        { name: "Tan", hex: "#986854", rgb: [152, 104, 84] }, // Reddish tan
        { name: "Medium Brown", hex: "#805345", rgb: [128, 83, 69] }, // Cooler mid brown
        { name: "Dark Brown", hex: "#6A4E42", rgb: [106, 78, 66] }, // Unchanged
        { name: "Deepest Brown", hex: "#3B2F2F", rgb: [59, 47, 47] }, // Unchanged
      ];

      // Function to get Euclidean distance in RGB space
      const colorDistance = (c1: number[], c2: number[]): number => {
        return Math.sqrt(
          Math.pow(c1[0] - c2[0], 2) +
            Math.pow(c1[1] - c2[1], 2) +
            Math.pow(c1[2] - c2[2], 2),
        );
      };

      // Find closest reference color
      let closestMatch = referenceColors[0];
      let minDistance = colorDistance([r, g, b], referenceColors[0].rgb);

      for (let i = 1; i < referenceColors.length; i++) {
        const dist = colorDistance([r, g, b], referenceColors[i].rgb);
        if (dist < minDistance) {
          minDistance = dist;
          closestMatch = referenceColors[i];
        }
      }

      // Final skin tone label and hex from reference
      const skinTone = closestMatch.name;
      const matchedHex = closestMatch.hex;

      setInfo((prev) => ({
        ...prev,
        skinTone,
        skinColor: avgHex,
        closestMatch: matchedHex,
        referenceColors: referenceColors.map(({ name, hex }) => ({
          name,
          hex,
        })),
      }));
    } else {
      console.warn("No valid skin-like pixels found.");
    }
  };

  useEffect(() => {
    if (showAvatar) {
      setShowRetakeButton(true); // Show the retake button when the avatar is shown
    } else {
      setShowRetakeButton(false); // Hide the button otherwise
    }
  }, [showAvatar]);

  const handleRetake = () => {
    setShowAvatar(false); // Hide the avatar
    setShowRetakeButton(false); // Hide the retake button
    startCamera(); // Call the function to start the camera again
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      if (videoRef.current) {
        // Check if videoRef.current is available
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current!.play();
      } else {
        console.error(
          "videoRef.current is null. Make sure the video element is in the DOM.",
        );
        // Optionally, you could try to re-render or handle this case differently
        return; // Exit the function if the ref is null
      }

      const faceMesh = new mp.FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results) => {
        const canvas = canvasRef.current;
        const video = videoRef.current; // Ensure you're still checking if video is available here too
        if (!canvas || !video) return;

        const ctx = canvas.getContext("2d")!;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (results.multiFaceLandmarks?.length) {
          const faceLandmarks = results.multiFaceLandmarks[0];
          const ovalPoints = mp.FACEMESH_FACE_OVAL.map(
            (pair) => faceLandmarks[pair[0]],
          );
          drawAnimatedOval(ctx, ovalPoints);

          setTimeout(() => {
            if (video && video.srcObject) {
              // ✅ Pause video playback instead of stopping the stream
              video.pause();

              analyzeFace(canvas, faceLandmarks);

              if (videoRef.current) {
                // Leave srcObject as is to retain the stream
                setCameraStarted(false);
                setShowAvatar(true);

                // ✅ Call parent callback (if provided)
                if (showAvatar) {
                  callback(info);
                }
              }
            } else {
              setCameraStarted(false);
              setShowAvatar(true);
            }
          }, 3000);
        }
      });

      const camera = new cam.Camera(videoRef.current!, {
        // Ensure videoRef.current is available here
        onFrame: async () => {
          await faceMesh.send({ image: videoRef.current! });
        },
        width: 640,
        height: 480,
      });

      camera.start();
      setCameraStarted(true);
    } catch (error) {
      alert("Failed to start camera");
      console.error("Error starting camera:", error);
    }
  };

  useEffect(() => {
    const video = videoRef.current;

    return () => {
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop()); // stop all tracks
        video.srcObject = null; // release the media stream
      }
    };
  }, []);

  return (
    <div className="py-4">
      <div className="">
        <div className="relative mx-auto aspect-[2/2] w-full overflow-hidden rounded-[2rem] border-1 border-gray-600 shadow-lg">
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="absolute inset-0 h-full w-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {cameraStarted && (
              <Player
                autoplay
                loop
                src={scanAnimation}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
            )}
          </>

          <div className="absolute h-full w-full transform">
            <>
              {showAvatar && info.faceShape && info.skinColor && (
                <>
                  <div className="absolute top-[50px] left-0 flex w-40 items-center justify-center gap-2 rounded-tr-lg rounded-br-lg bg-white py-2 shadow-lg">
                    <img src="/ai-icon-color.svg" />
                    <div className="flex flex-col text-sm text-black">
                      <span>Faceshape</span>
                      <span className="font-bold">{info.faceShape}</span>
                    </div>
                    <img src="/green-tick.svg" className="h-6" />
                  </div>

                  <div className="absolute right-0 bottom-[100px] flex w-40 items-center justify-center gap-2 rounded-tl-lg rounded-bl-lg bg-white py-2 shadow-lg">
                    <img src="/green-tick.svg" className="h-6" />
                    <div className="flex flex-col text-sm text-black">
                      <span>Skin Tone</span>
                      <span className="font-bold">{info.skinTone}</span>
                    </div>
                    <span
                      style={{ backgroundColor: info.skinColor, opacity: 0.9 }}
                      className="h-6 w-6"
                    ></span>
                  </div>
                </>
              )}
              {showRetakeButton && (
                <button
                  onClick={() => {
                    ReactGA.event({
                      category: "Face Analyzer",
                      action: "Retake Clicked",
                      label: "User retook face scan",
                    });
                    handleRetake();
                  }}
                  className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-lg border border-gray-700 bg-black px-6 py-2 text-white shadow"
                >
                  Retake
                </button>
              )}
              {!cameraStarted && !showAvatar && (
                <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-6">
                  <img src="/camera.svg" className="h-12" />
                  <button
                    onClick={() => {
                      ReactGA.event({
                        category: "Face Analyzer",
                        action: "Scan my face",
                        label: "User clicked Scan my face",
                      });
                      startCamera();
                    }}
                    className="rounded-lg border-1 border-gray-500 bg-black px-6 py-2 text-white shadow"
                  >
                    Scan my face
                  </button>
                </div>
              )}
            </>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceAnalyzer;
