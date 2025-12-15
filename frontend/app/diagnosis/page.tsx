
"use client";

import React, {
  useState,
  useRef,
  useEffect,
  DragEvent,
  ChangeEvent,
} from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

// Typing out Gemini Advice with Markdown formatting support
function TypingAdvice({
  text,
  typingSpeed = 10,
}: {
  text: string;
  typingSpeed?: number;
}) {
  const [displayed, setDisplayed] = React.useState("");
  const [done, setDone] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) return;
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDone(true);
      }
    }, typingSpeed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, typingSpeed]);

  // Custom component to color strong text
  const markdownComponents = {
    strong: ({ node, ...props }: any) => (
      <span className="font-bold text-green-400" {...props} />
    ),
    b: ({ node, ...props }: any) => (
      <span className="font-bold text-green-400" {...props} />
    ),
  };

  return (
    <div className="relative">
      <div className="prose prose-sm max-w-none text-gray-900 leading-relaxed">
        <ReactMarkdown components={markdownComponents}>
          {displayed + (done ? "" : " ▍")}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// --- SidebarFooter with Weather & Grower Tip Widgets (Malaysia weather only) ---
function SidebarFooter() {
  // Malaysia location for weather (Midpoint: Kuala Lumpur)
  const MALAYSIA_LOC = {
    lat: 3.139, // Kuala Lumpur latitude
    lon: 101.6869, // Kuala Lumpur longitude
    location: "Kuala Lumpur, Malaysia",
  };

  // Weather state: null = loading, error = string, else weather obj
  const [weather, setWeather] = React.useState<{
    temperature: number;
    windspeed: number;
    weathercode: number;
    location: string; // e.g. city
  } | null | string>(null);

  // Always fetch Malaysia weather (Kuala Lumpur)
  useEffect(() => {
    let didCancel = false;
    function fetchWeather(lat: number, lon: number, loc: string) {
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(
          4
        )}&longitude=${lon.toFixed(4)}&current_weather=true`
      )
        .then((res) => res.json())
        .then((data) => {
          if (!didCancel && data?.current_weather) {
            setWeather({
              temperature: data.current_weather.temperature,
              windspeed: data.current_weather.windspeed,
              weathercode: data.current_weather.weathercode,
              location: loc,
            });
          } else if (!didCancel) {
            setWeather("Weather unavailable");
          }
        })
        .catch(() => !didCancel && setWeather("Weather unavailable"));
    }
    setWeather(null); // loading
    fetchWeather(MALAYSIA_LOC.lat, MALAYSIA_LOC.lon, MALAYSIA_LOC.location);
    return () => {
      didCancel = true;
    };
  }, []);

  // Static list of 10 grower tips
  const tips = [
    "Water early in the morning to reduce evaporation loss.",
    "Rotate crops yearly to prevent soil depletion.",
    "Mulch retains soil moisture and prevents weeds.",
    "Inspect leaves regularly for early signs of pests.",
    "Add compost to boost soil nutrients naturally.",
    "Space plants to allow good air circulation.",
    "Remove dead or diseased leaves promptly.",
    "Clean tools to reduce spread of disease.",
    "Install rainwater barrels to save water.",
    "Test soil pH before planting each season.",
  ];
  // Tip state: deterministic for SSR (first tip), randomized on client after mount
  const [tip, setTip] = React.useState<string>(tips[0]);

  useEffect(() => {
    // Run only on client after hydration to avoid SSR/client mismatch
    setTip(tips[Math.floor(Math.random() * tips.length)]);
  }, []);

  // Weather icon by weathercode (OpenMeteo codes: 0-clear, 1-2-mainly clear/few clouds, 3-overcast, 45-48 fog, 51..67 drizzle, 80..82 rains, 95..99 thunder)
  function weatherIcon(code: number) {
    // Basic set: Sunny, Cloudy, Rain, Thunder
    if (code === 0) {
      // Sun
      return (
        <svg
          className="h-8 w-8 text-yellow-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <circle cx="12" cy="12" r="5" fill="#fde68a" />
          <g stroke="#fcd34d" strokeWidth="2">
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
            <line x1="4.2" y1="4.2" x2="6.35" y2="6.35" />
            <line x1="17.65" y1="17.65" x2="19.8" y2="19.8" />
            <line x1="4.2" y1="19.8" x2="6.35" y2="17.65" />
            <line x1="17.65" y1="6.35" x2="19.8" y2="4.2" />
          </g>
        </svg>
      );
    }
    if ([1, 2, 3, 45, 48].includes(code)) {
      // Cloudy
      return (
        <svg
          className="h-8 w-8 text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <ellipse cx="12" cy="16" rx="7" ry="4" fill="#bae6fd" />
          <ellipse cx="9" cy="14" rx="4" ry="3" fill="#7dd3fc" />
        </svg>
      );
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      // Rain
      return (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24">
          <ellipse cx="12" cy="15" rx="6" ry="3.5" fill="#93c5fd" />
          <ellipse cx="9" cy="13" rx="3.5" ry="2.5" fill="#38bdf8" />
          <g>
            <line
              x1="10"
              y1="19"
              x2="10"
              y2="22"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="14"
              y1="18"
              x2="14"
              y2="21"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        </svg>
      );
    }
    if (code >= 95 && code <= 99) {
      // Thunder
      return (
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
          <ellipse cx="13" cy="15" rx="6" ry="3.5" fill="#ccc" />
          <polygon
            points="12,13 10,20 14,17 12,24"
            fill="#f59e42"
          />
        </svg>
      );
    }
    // Default: question
    return (
      <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="8"
          stroke="#cbd5e1"
          strokeWidth="2"
          fill="#f1f5f9"
        />
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fontSize="10"
          fill="#64748b"
        >
          ?
        </text>
      </svg>
    );
  }

  return (
    <div className="w-full px-2 md:px-0 mt-auto">
      {/* Agri-Weather Widget */}
      <div
        className="rounded-xl mb-2 bg-white/25 backdrop-blur-md shadow border border-green-200/40 px-4 py-3 flex flex-col items-start gap-2"
        style={{
          background:
            "linear-gradient(140deg,rgba(255,255,255,0.30),rgba(255,255,255,0.16))",
        }}
      >
        <div className="flex items-center gap-2 w-full">
          <span aria-label="Weather Icon" className="mr-1">
            {typeof weather === "object" && weather ? (
              weatherIcon(weather.weathercode)
            ) : (
              <svg
                className="h-8 w-8 text-gray-300 animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  fill="#f1f5f9"
                />
              </svg>
            )}
          </span>
          <div className="flex-1 flex flex-col justify-center">
            <span className="font-bold text-[1.3rem] text-green-900 leading-relaxed">
              {typeof weather === "string" && weather}
              {weather === null && (
                <span className="text-gray-400 animate-pulse">—</span>
              )}
              {typeof weather === "object" && weather
                ? `${Math.round(weather.temperature)}°C`
                : ""}
            </span>
            <span className="text-xs text-green-700 font-semibold opacity-70">
              {typeof weather === "object" && weather ? weather.location : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1 w-full">
          <span className="text-xs text-gray-900">
            <svg
              className="inline-block mr-1 -mt-0.5 w-4 h-4 text-blue-400"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path d="M8.42 2C7.6 3.8 6.12 6.46 5.21 8.46 3.77 11.41 3.37 12.52 3.31 13.01c-.11.82.28 1.63.99 2.04.86.5 1.94.19 2.47-.72.06-.1 2.63-4.53 2.63-4.53s2.48 4.5 2.53 4.58c.53.92 1.61 1.22 2.48.72.7-.41 1.09-1.22.99-2.04-.06-.49-.47-1.6-1.91-4.55-.87-2-2.34-4.65-3.16-6.45z" />
            </svg>
            Wind{" "}
            {typeof weather === "object" && weather ? (
              <span className="font-semibold">
                {Math.round(weather.windspeed)} km/h
              </span>
            ) : (
              <span className="font-normal text-gray-400">—</span>
            )}
          </span>
        </div>
        <span className="text-xs font-semibold text-green-700 mt-2 opacity-80 uppercase tracking-wide">
          Field Conditions
        </span>
      </div>
      {/* Grower Tip Widget */}
      <div
        className="rounded-xl bg-white/15 backdrop-blur-md shadow border border-green-100/30 px-4 py-3 mt-1 flex items-start gap-2"
        style={{
          background:
            "linear-gradient(160deg,rgba(255,255,255,0.18),rgba(255,255,255,0.1))",
        }}
      >
        <span
          aria-label="Lightbulb Tip"
          className="mt-0.5 text-yellow-400 flex-shrink-0"
        >
          <svg className="w-5 h-5 " fill="none" viewBox="0 0 24 24">
            <path
              d="M12 3a7 7 0 017 7c0 2.36-1.34 4.36-3.32 5.41a1 1 0 00-.5.86V18a2 2 0 01-2 2 2 2 0 01-2-2v-1.73a1 1 0 00-.51-.87A6.99 6.99 0 015 10a7 7 0 017-7zm-2 16h4a1 1 0 010 2h-4a1 1 0 010-2z"
              fill="#fde68a"
              stroke="#f59e42"
              strokeWidth="1.2"
            />
          </svg>
        </span>
        <div className="flex-1">
          <span className="block text-xs text-gray-800 font-medium leading-snug">
            {tip}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function DiagnosisPage() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    | null
    | {
        predictions: Array<{
          class_name: string;
          confidence_score: number;
        }>;
        advice: string;
      }
  >(null);
  const [typedAdvice, setTypedAdvice] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.error("Error playing video:", err);
        setError("Could not start camera preview.");
      });
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const onImageChange = (file: File | null) => {
    setResult(null);
    setError(null);
    setTypedAdvice("");
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImage(null);
      setImagePreview(null);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        onImageChange(file);
      } else {
        setError("Please upload an image file.");
      }
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        onImageChange(file);
      } else {
        setError("Please upload an image file.");
      }
    }
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const openCamera = async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          "Camera access is not supported in this browser. Please use a modern browser."
        );
        return;
      }
      let mediaStream: MediaStream | null = null;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (err) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
        } catch (err2) {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
        }
      }
      if (mediaStream) {
        setStream(mediaStream);
        setIsCameraOpen(true);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      let errorMessage = "Could not access camera. ";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMessage += "Please allow camera access in your browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMessage += "No camera found on this device.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMessage +=
          "Camera is already in use by another application. Please close other apps using the camera.";
      } else if (err.name === "OverconstrainedError") {
        errorMessage += "Camera constraints not supported. Trying with basic settings...";
        try {
          const basicStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          setStream(basicStream);
          setIsCameraOpen(true);
          return;
        } catch {
          errorMessage = "Could not access camera with any settings.";
        }
      } else {
        errorMessage += "Please check your camera permissions and try again.";
      }
      setError(errorMessage);
      setIsCameraOpen(false);
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        stream.removeTrack(track);
      });
      setStream(null);
    }
    setIsCameraOpen(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setError("Camera is not ready. Please wait a moment and try again.");
      return;
    }
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "camera-capture.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        onImageChange(file);
        closeCamera();
      } else {
        setError("Failed to capture photo. Please try again.");
      }
    }, "image/jpeg");
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setTypedAdvice("");
    try {
      const formData = new FormData();
      formData.append("file", image);
      const res = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Prediction failed");
      }
      const data = await res.json();
      const { top_3_predictions, advice } = data;
      setResult({
        predictions: top_3_predictions.map(
          (pred: { class_name: string; confidence_score: number }) => ({
            class_name: pred.class_name,
            confidence_score: pred.confidence_score,
          })
        ),
        advice: advice || "",
      });
      setTypedAdvice(advice || "");
    } catch (err: any) {
      setError(
        err?.message || "There was a problem contacting the prediction server."
      );
    } finally {
      setLoading(false);
    }
  };

  const showGeminiAdvice =
    (loading && image && imagePreview && !error) ||
    (!!typedAdvice && (!loading || !!result?.advice));

  // No more cleanAdviceText - keep advice as-is to allow markdown such as **bold**
  let geminiAdviceTextToShow = "";
  if (loading && image && imagePreview && !error) {
    geminiAdviceTextToShow = typedAdvice;
  } else if (!!typedAdvice) {
    geminiAdviceTextToShow = typedAdvice;
  }

  function getDiagnosisSeverity(class_name: string) {
    if (!class_name) return "unknown";
    if (/healthy/i.test(class_name)) return "healthy";
    return "diseased";
  }

  function Navbar() {
    return (
      <nav className="w-full bg-white border-b border-gray-200 shadow-sm fixed top-0 left-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="FloraScan logo"
            height={38}
            width={38}
            className="rounded-lg border border-green-400 shadow mr-2"
          />
          <span className="text-2xl font-extrabold tracking-tight text-green-700">
            FloraScan
          </span>
        </div>
      </nav>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-100 via-white to-green-100 flex flex-col items-center pt-20 pb-8 px-2 sm:px-6 font-sans transition-all">
      <Navbar />

      <section className="w-full max-w-6xl mx-auto mt-8">
        {/* Responsive grid: Sidebar + Content */}
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8">
          {/* -- LEFT: 'Sidebar' with Upload Zone and Footer Widgets -- */}
          <div className="flex flex-col h-full min-h-[700px]">
            <div className="bg-white rounded-xl shadow-lg px-8 py-7 md:p-10 border border-gray-100">
              <h2 className="font-semibold text-gray-800 text-xl mb-5 text-center tracking-tight">
                Upload or Take a Leaf Photo
              </h2>
              {/* Camera button */}
              <button
                onClick={openCamera}
                disabled={isCameraOpen || loading}
                className="w-full mb-4 bg-green-600 hover:bg-green-700 shadow font-bold text-white py-2.5 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 text-base"
              >
                <svg
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Take Photo
              </button>
              {/* DND Drop Area */}
              <div
                className={`w-full rounded-xl border-2 border-dashed transition-all bg-green-50 min-h-[230px] flex flex-col items-center justify-center relative group cursor-pointer shadow-inner ${
                  imagePreview
                    ? "border-green-500"
                    : "border-green-300 hover:border-green-500"
                }`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onClick={handleUploadClick}
                style={{ minHeight: 230 }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Leaf preview"
                    className="rounded-lg shadow mt-0 bg-white max-h-60 w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-green-700">
                    <svg
                      width={60}
                      height={60}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                      className="mb-3 drop-shadow-lg"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 16V4m0 12l-4-4m4 4l4-4M20 16.58A5 5 0 0018 7.34a5 5 0 00-9.9-1.26A7 7 0 004 16.25"
                      />
                    </svg>
                    <span className="text-lg font-medium mb-1">
                      Drag &amp; drop a photo here
                    </span>
                    <span className="text-green-600 text-base">
                      or{" "}
                      <span className="underline decoration-green-400">
                        click to browse
                      </span>
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={inputRef}
                  onChange={onFileInputChange}
                />
              </div>
              {/* Analyze+Reset row */}
              <div className="flex gap-3 mt-6">
                <button
                  className="flex-1 text-green-600 bg-green-100 hover:bg-green-200 rounded-lg py-2 px-4 font-semibold border border-green-200 disabled:opacity-50 transition"
                  disabled={!imagePreview}
                  onClick={(e) => {
                    e.preventDefault();
                    onImageChange(null);
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!image || loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        ></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    "Analyze Leaf"
                  )}
                </button>
              </div>
              {error && (
                <div className="w-full text-center text-sm text-red-600 bg-red-100 border border-red-200 py-2 px-3 mt-5 rounded-lg">
                  {error}
                </div>
              )}
              <div className="mt-7 text-gray-400 text-xs text-center">
                Supported formats: JPG, PNG, etc. <br />
                Your image never leaves your device until you choose Analyze.
              </div>
            </div>
            {/* SIDEBAR FOOTER WIDGETS */}
            <SidebarFooter />
          </div>

          {/* -- RIGHT: Results & Gemini Advice Panel -- */}
          {(imagePreview || result || loading || error) && (
            <div className="flex flex-col space-y-7">
              {result && (
                <div className="bg-white rounded-xl shadow-lg py-7 px-6 border border-gray-100">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                    Diagnosis
                  </h3>
                  {result.predictions.length > 0 && (
                    <div className="space-y-5">
                      {result.predictions.map((pred, index) => {
                        const severity = getDiagnosisSeverity(pred.class_name);
                        const colorBar =
                          severity === "healthy"
                            ? "from-green-400 to-green-500"
                            : "from-red-400 to-red-600";
                        const colorLabel =
                          severity === "healthy"
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-red-100 text-red-700 border-red-300";
                        // Use Math.round(score * 100) + "%" instead of raw decimal
                        const confPercent = `${Math.round(
                          pred.confidence_score * 100
                        )}%`;
                        const label =
                          severity === "healthy"
                            ? "Healthy"
                            : index === 0
                            ? "Most Likely Disease"
                            : "Possible Disease";

                        return (
                          <div
                            key={index}
                            className={`p-3 rounded-md border ${
                              index === 0
                                ? "border-green-400 bg-green-50/80"
                                : "border-gray-200 bg-gray-50/90"
                            } shadow-sm transition-all`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-base text-gray-700 capitalize">
                                {pred.class_name
                                  .replace(/___/g, " - ")
                                  .replace(/_/g, " ")
                                  .replace(
                                    /\bhealthy\b/gi,
                                    "Healthy"
                                  )}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-xs font-bold rounded border ${colorLabel}`}
                              >
                                {label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-3 rounded-full bg-gray-200 relative overflow-hidden mr-2">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${colorBar} transition-all duration-700`}
                                  style={{
                                    width: `${Math.round(
                                      pred.confidence_score * 100
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span
                                className={
                                  severity === "healthy"
                                    ? "text-green-700 font-bold"
                                    : "text-red-600 font-bold"
                                }
                              >
                                {confPercent}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {showGeminiAdvice && (
                <div className="bg-white rounded-xl shadow-lg py-7 px-6 border border-gray-100 min-h-[120px]">
                  <div className="flex items-start gap-2 mb-3">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      fill="none"
                      width="28"
                      height="28"
                      className="text-green-400 drop-shadow mt-1"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        fill="#22c55e"
                        opacity="0.2"
                      />
                      <path
                        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M19.07 4.93l-1.41 1.41"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                    <h4 className="text-lg font-bold text-green-600 flex-1">
                      Action Plan
                    </h4>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded uppercase tracking-wide border border-green-200 font-semibold">
                      AI Advice
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-900 min-h-[48px]">
                    {geminiAdviceTextToShow ? (
                      <TypingAdvice text={geminiAdviceTextToShow} />
                    ) : loading ? (
                      <div className="italic text-green-500">
                        Preparing advice...
                      </div>
                    ) : (
                      <span className="text-gray-400">No advice yet.</span>
                    )}
                  </div>
                </div>
              )}
              {!result && !error && !loading && imagePreview && (
                <div className="rounded-xl p-6 border border-gray-100 bg-white text-center shadow-lg min-h-[140px] flex flex-col items-center justify-center">
                  <svg
                    width={42}
                    height={42}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.65}
                    className="mb-2 text-gray-400"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 19v-6m0 0v-6m0 6 3.5-3.5M12 12l-3.5-3.5"
                    />
                  </svg>
                  <span className="text-gray-600">
                    Ready to analyze – click "Analyze Leaf"!
                  </span>
                </div>
              )}
            </div>
          )}
          {!imagePreview && !loading && !result && !error && (
            <div className="md:block hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 shadow-inner flex flex-col items-center justify-center text-center min-h-[410px] py-12 px-6 mx-2">
              <svg
                width={58}
                height={58}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                className="mb-3 opacity-40 mx-auto"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V4m0 12l-4-4m4 4l4-4M20 16.58A5 5 0 0018 7.34a5 5 0 00-9.9-1.26A7 7 0 004 16.25"
                />
              </svg>
              <h3 className="text-gray-400 font-medium text-lg mb-2">
                No image selected yet
              </h3>
              <p className="text-gray-400 mb-3">
                To begin, upload or take a new photo of a plant leaf.
              </p>
              <span className="text-gray-300 text-xs">
                Instant feedback &middot; Fast & secure
              </span>
            </div>
          )}
        </div>
      </section>

      {isCameraOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-85 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md flex flex-col items-center">
            <h2 className="text-xl font-bold text-white mb-4">
              Position the leaf in the frame
            </h2>
            <div className="relative w-full bg-neutral-900 rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
                style={{ maxHeight: "70vh" }}
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-4 w-full">
              <button
                onClick={closeCamera}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  width="25"
                  height="25"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-20 py-6 w-full bg-gradient-to-t from-green-100 via-white to-transparent border-t border-green-200 text-xs text-gray-500 text-center">
        <span>
          Powered by FloraScan · MobileNet &amp; PlantVillage{" "}
          <a
            href="https://github.com/spMohanty/PlantVillage-Dataset"
            className="underline hover:text-green-600 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dataset on GitHub
          </a>
        </span>
      </footer>

      <style>
        {`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          40% { opacity: 0; }
        }
        .blink {
          animation: blink 1.05s step-end infinite;
          font-weight: bold;
        }
        `}
      </style>
    </main>
  );
}
