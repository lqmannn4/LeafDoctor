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
import { Upload, Camera, X, RefreshCw, AlertCircle, Wind, Thermometer, CloudSun, Leaf, Droplets, ArrowRight, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      <span className="font-bold text-green-600" {...props} />
    ),
    b: ({ node, ...props }: any) => (
      <span className="font-bold text-green-600" {...props} />
    ),
    h1: ({ node, ...props }: any) => (
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-2" {...props} />
    ),
    h2: ({ node, ...props }: any) => (
      <h2 className="text-lg font-bold text-slate-800 mt-3 mb-2" {...props} />
    ),
    ul: ({ node, ...props }: any) => (
      <ul className="list-disc list-inside space-y-1 my-2 text-slate-700" {...props} />
    ),
  };

  return (
    <div className="relative">
      <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed">
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

  // Weather icon by weathercode
  function WeatherIcon({ code }: { code: number }) {
    if (code === 0) return <CloudSun className="w-8 h-8 text-yellow-500" />;
    if ([1, 2, 3, 45, 48].includes(code)) return <CloudSun className="w-8 h-8 text-blue-400" />;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <Droplets className="w-8 h-8 text-blue-500" />;
    if (code >= 95 && code <= 99) return <AlertCircle className="w-8 h-8 text-yellow-600" />;
    return <CloudSun className="w-8 h-8 text-slate-400" />;
  }

  return (
    <div className="w-full mt-auto space-y-4">
      {/* Agri-Weather Widget */}
      <div className="group rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 p-5 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-50 rounded-xl">
               {typeof weather === "object" && weather ? (
                 <WeatherIcon code={weather.weathercode} />
               ) : (
                 <CloudSun className="w-8 h-8 text-slate-300 animate-pulse" />
               )}
             </div>
             <div>
               <h4 className="font-bold text-slate-900 text-lg">
                 {typeof weather === "object" && weather 
                   ? `${Math.round(weather.temperature)}°C` 
                   : "..."}
               </h4>
               <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                 {typeof weather === "object" && weather ? weather.location : "Loading..."}
               </p>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Wind className="w-4 h-4 text-blue-400" />
            <span>
              Wind: {typeof weather === "object" && weather ? `${Math.round(weather.windspeed)} km/h` : "--"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-600 font-medium ml-auto">
            <Leaf className="w-4 h-4" />
            <span>Good Conditions</span>
          </div>
        </div>
      </div>

      {/* Grower Tip Widget */}
      <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50/50 border border-green-100 p-5 flex items-start gap-3">
        <div className="p-2 bg-white rounded-full shadow-sm">
          <Leaf className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h5 className="text-xs font-bold text-green-800 uppercase mb-1">Daily Grower Tip</h5>
          <p className="text-sm text-green-900/80 leading-snug font-medium">
            {tip}
          </p>
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
  const [saved, setSaved] = useState(false); // New State
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
    setSaved(false);
    
    try {
      const token = localStorage.getItem("token");
      const url = new URL("http://127.0.0.1:8000/predict");
      
      // If user is logged in, tell backend to save
      if (token) {
        url.searchParams.append("save", "true");
        url.searchParams.append("token", token);
      }

      const formData = new FormData();
      formData.append("file", image);
      
      const res = await fetch(url.toString(), {
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
      if (token) setSaved(true); // Show saved indicator

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

  return (
    <main className="relative min-h-screen font-sans text-slate-900 selection:bg-green-100 selection:text-green-900 pt-24 flex flex-col">
      
      {/* Global Background Layer */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-green-50/30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-green-100/40 rounded-full blur-[100px] opacity-70" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-50/40 rounded-full blur-[100px] opacity-60" />
      </div>

      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 pb-12">
        
        <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">AI Diagnosis Studio</h1>
            <p className="text-slate-600 max-w-2xl mx-auto">Upload a clear photo of a plant leaf to get instant disease identification and treatment advice.</p>
        </div>

        {/* Responsive grid: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          
          {/* -- LEFT: Upload Zone & Tools -- */}
          <div className="flex flex-col gap-6">
            <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-lg border border-white/50 p-6 md:p-8 relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
               
              <h2 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
                <Camera className="w-5 h-5 text-green-600" />
                Input Source
              </h2>
              
              {/* Camera button */}
              <button
                onClick={openCamera}
                disabled={isCameraOpen || loading}
                className="w-full mb-4 group relative overflow-hidden rounded-xl bg-slate-900 text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 <div className="relative z-10 flex items-center justify-center gap-2 py-4 px-4 font-bold">
                    <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Take Photo</span>
                 </div>
              </button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Or Upload</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* DND Drop Area */}
              <div
                className={`w-full rounded-2xl border-2 border-dashed transition-all duration-300 min-h-[260px] flex flex-col items-center justify-center relative group cursor-pointer ${
                  imagePreview
                    ? "border-green-500 bg-green-50/30"
                    : "border-slate-300 hover:border-green-400 bg-white/50 hover:bg-green-50/50"
                }`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onClick={handleUploadClick}
              >
                {imagePreview ? (
                  <div className="relative w-full h-full p-2 flex items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="Leaf preview"
                      className="rounded-xl shadow-sm max-h-[240px] w-full object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                        <span className="text-white font-medium flex items-center gap-2"><RefreshCw className="w-4 h-4"/> Change Image</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-500 p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Upload className="w-8 h-8 text-green-600" />
                    </div>
                    <span className="text-lg font-bold text-slate-800 mb-2">
                      Drop photo here
                    </span>
                    <span className="text-sm text-slate-500 mb-4">
                      or click to browse from device
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">JPG, PNG supported</span>
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
                  className="flex-1 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl py-3 px-4 font-bold text-sm transition-colors disabled:opacity-50"
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
                  className="flex-[2] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-green-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                    Analyze Leaf <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
              
              {error && (
                <div className="w-full flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 p-3 mt-4 rounded-xl">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* SIDEBAR FOOTER WIDGETS */}
            <SidebarFooter />
          </div>

          {/* -- RIGHT: Results & Gemini Advice Panel -- */}
          <div className="flex flex-col gap-6">
            
            <AnimatePresence mode="wait">
            {!imagePreview && !loading && !result && !error ? (
                 <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-white/40"
                 >
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <Leaf className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Ready for Diagnosis</h3>
                    <p className="text-slate-500 max-w-sm">
                        Upload an image from the panel on the left to begin the AI analysis process.
                    </p>
                 </motion.div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Diagnosis Result Card */}
                    {result && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
                        >
                            <div className="bg-slate-50/80 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-green-600" />
                                        Diagnosis Results
                                    </h3>
                                    {saved && (
                                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                            <Leaf className="w-3 h-3" /> Saved
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs font-mono text-slate-400">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                            </div>
                            
                            <div className="p-6">
                                {result.predictions.length > 0 && (
                                    <div className="space-y-4">
                                    {result.predictions.map((pred, index) => {
                                        const severity = getDiagnosisSeverity(pred.class_name);
                                        const isHealthy = severity === "healthy";
                                        const score = Math.round(pred.confidence_score * 100);
                                        
                                        return (
                                        <div
                                            key={index}
                                            className={`p-4 rounded-2xl border ${
                                            index === 0
                                                ? isHealthy 
                                                    ? "border-green-200 bg-green-50/50" 
                                                    : "border-amber-200 bg-amber-50/50"
                                                : "border-slate-100 bg-white"
                                            } transition-all`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`font-bold text-lg capitalize ${index === 0 ? "text-slate-900" : "text-slate-600"}`}>
                                                    {pred.class_name
                                                    .replace(/___/g, " - ")
                                                    .replace(/_/g, " ")
                                                    .replace(/\bhealthy\b/gi, "Healthy")}
                                                </span>
                                                <span className={`font-mono font-bold ${isHealthy ? "text-green-600" : "text-amber-600"}`}>
                                                    {score}%
                                                </span>
                                            </div>
                                            
                                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${score}%` }}
                                                    transition={{ duration: 1, delay: 0.2 }}
                                                    className={`h-full rounded-full ${isHealthy ? "bg-green-500" : "bg-amber-500"}`} 
                                                />
                                            </div>
                                        </div>
                                        );
                                    })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Gemini Advice Card */}
                    {showGeminiAdvice && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col"
                        >
                             <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between text-white">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Leaf className="w-5 h-5" />
                                    Treatment Plan
                                </h3>
                                <div className="px-2 py-1 bg-white/20 rounded-lg text-xs font-medium backdrop-blur-sm">
                                    AI Generated
                                </div>
                            </div>
                            
                            <div className="p-6 min-h-[160px]">
                                {geminiAdviceTextToShow ? (
                                <TypingAdvice text={geminiAdviceTextToShow} />
                                ) : loading ? (
                                <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                                    <span className="text-sm font-medium">Generating expert advice...</span>
                                </div>
                                ) : (
                                <span className="text-slate-400">No advice yet.</span>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            )}
            </AnimatePresence>

          </div>
        </div>
      </section>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl flex flex-col items-center">
            <div className="flex justify-between w-full text-white mb-4 items-center">
                <h2 className="text-xl font-bold">Take Photo</h2>
                <button onClick={closeCamera} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"><X className="w-6 h-6"/></button>
            </div>
            
            <div className="relative w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 mb-6 aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-2 border-white/30 rounded-2xl pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-lg pointer-events-none"></div>
            </div>
            
            <div className="flex gap-4 w-full max-w-sm">
              <button
                onClick={capturePhoto}
                className="w-full bg-white text-black font-bold py-4 px-6 rounded-full hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                Capture Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-3 bg-green-50 text-slate-600 border-t border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Leaf className="w-10 h-10 text-green-600" />
            <span className="text-2xl font-bold text-slate-900">LeafDoctor</span>
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} LeafDoctor. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}