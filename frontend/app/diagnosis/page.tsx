"use client";

import React, {
  useState,
  useRef,
  DragEvent,
  ChangeEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import { Upload, RefreshCw, AlertCircle, Wind, CloudSun, Leaf, Droplets, ArrowRight, Activity, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";

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

  React.useEffect(() => {
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

// --- SidebarFooter with Dynamic Location & Weather ---
function SidebarFooter() {
  // Default fallback (Kuala Lumpur)
  const DEFAULT_LOC = {
    lat: 3.139,
    lon: 101.6869,
    location: "Kuala Lumpur, Malaysia (Default)",
  };

  const [weather, setWeather] = React.useState<{
    temperature: number;
    windspeed: number;
    weathercode: number;
    location: string;
  } | null | string>(null);

  const [loadingLocation, setLoadingLocation] = useState(true);

  React.useEffect(() => {
    let didCancel = false;

    // Helper to fetch weather & location name
    async function fetchWeatherData(lat: number, lon: number, locationName?: string) {
      try {
        // 1. Get Weather
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current_weather=true`
        );
        const weatherData = await weatherRes.json();

        // 2. Get Location Name (if not provided) using BigDataCloud's free client-side API
        let finalLocationName = locationName || "Unknown Location";
        if (!locationName) {
            try {
                const geoRes = await fetch(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
                );
                const geoData = await geoRes.json();
                // Construct a nice name: "City, Country" or "Locality, Country"
                const city = geoData.city || geoData.locality || geoData.principalSubdivision;
                const country = geoData.countryName;
                if (city && country) finalLocationName = `${city}, ${country}`;
                else if (country) finalLocationName = country;
            } catch (err) {
                console.warn("Could not reverse geocode:", err);
                finalLocationName = "Local Weather";
            }
        }

        if (!didCancel && weatherData?.current_weather) {
          setWeather({
            temperature: weatherData.current_weather.temperature,
            windspeed: weatherData.current_weather.windspeed,
            weathercode: weatherData.current_weather.weathercode,
            location: finalLocationName,
          });
        } else if (!didCancel) {
          setWeather("Weather unavailable");
        }
      } catch (e) {
        if (!didCancel) setWeather("Weather unavailable");
      } finally {
        if (!didCancel) setLoadingLocation(false);
      }
    }

    // 3. Try to get user location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherData(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn("Geolocation denied/error:", error);
          // Fallback
          fetchWeatherData(DEFAULT_LOC.lat, DEFAULT_LOC.lon, DEFAULT_LOC.location);
        }
      );
    } else {
      // Fallback if no geolocation support
      fetchWeatherData(DEFAULT_LOC.lat, DEFAULT_LOC.lon, DEFAULT_LOC.location);
    }

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

  React.useEffect(() => {
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

  function getWeatherAdvice(code: number, windspeed: number): { text: string; status: 'good' | 'warning' | 'bad' } {
    if (windspeed > 20) return { text: "Too windy for spraying.", status: 'bad' };
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { text: "Rain likely. Avoid spraying.", status: 'bad' };
    if (code >= 95 && code <= 99) return { text: "Storm risk. Stay indoors.", status: 'bad' };
    return { text: "Ideal for field work.", status: 'good' };
  }

  const advice = (typeof weather === "object" && weather) 
    ? getWeatherAdvice(weather.weathercode, weather.windspeed) 
    : { text: "Checking conditions...", status: 'good' };

  return (
    <div className="w-full space-y-4">
      {/* Agri-Weather Widget */}
      <div className="group rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 p-5 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-50 rounded-xl">
               {loadingLocation ? (
                 <CloudSun className="w-8 h-8 text-slate-300 animate-pulse" />
               ) : typeof weather === "object" && weather ? (
                 <WeatherIcon code={weather.weathercode} />
               ) : (
                 <AlertCircle className="w-8 h-8 text-slate-300" />
               )}
             </div>
             <div>
               <h4 className="font-bold text-slate-900 text-lg">
                 {loadingLocation
                   ? "Locating..."
                   : typeof weather === "object" && weather 
                     ? `${Math.round(weather.temperature)}°C` 
                     : "Weather N/A"}
               </h4>
               <p className="text-xs text-slate-500 font-medium uppercase tracking-wide truncate max-w-[180px]">
                 {loadingLocation 
                    ? "Fetching location..." 
                    : typeof weather === "object" && weather 
                        ? weather.location 
                        : "Unavailable"}
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
          
          <div className={`flex items-center gap-2 text-xs font-bold ml-auto px-2 py-1 rounded-lg ${
            advice.status === 'good' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {advice.status === 'good' ? <Leaf className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            <span>{advice.text}</span>
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
  const [saved, setSaved] = useState(false); // New State
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleDownloadReport = async () => {
    if (!result) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(22, 163, 74); // Green-600
    doc.text("LeafDoctor - Diagnosis Report", margin, yPos);
    yPos += 10;

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPos);
    yPos += 15;

    // Line separator
    doc.setDrawColor(220);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    // Uploaded Image
    if (image) {
        try {
            const base64Img = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(image);
            });
            
            const imgProps = doc.getImageProperties(base64Img);
            const pdfWidth = pageWidth - 2 * margin;
            
            // Calculate height while maintaining aspect ratio, max height 80mm
            const maxHeight = 80; 
            let imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            let imgWidth = pdfWidth;
            
            if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
                imgWidth = (imgProps.width * imgHeight) / imgProps.height;
            }
            
            // Center the image
            const xOffset = margin + (pdfWidth - imgWidth) / 2;
            
            const format = image.type === "image/png" ? "PNG" : "JPEG";
            doc.addImage(base64Img, format, xOffset, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 15;
        } catch (err) {
            console.error("Error adding image to PDF:", err);
        }
    }

    // Diagnosis Results Section
    doc.setFontSize(16);
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    doc.text("Diagnosis Results", margin, yPos);
    yPos += 10;

    result.predictions.forEach((pred) => {
      const name = pred.class_name
          .replace(/___/g, " - ")
          .replace(/_/g, " ")
          .replace(/\bhealthy\b/gi, "Healthy");
      const score = Math.round(pred.confidence_score * 100);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50);
      doc.text(`• ${name}: ${score}% Confidence`, margin + 5, yPos);
      yPos += 8;
    });
    yPos += 15;

    // Treatment Plan Section
    if (typedAdvice) {
       doc.setFontSize(16);
       doc.setFont("helvetica", "bold");
       doc.setTextColor(30);
       doc.text("Recommended Treatment Plan", margin, yPos);
       yPos += 10;
       
       doc.setFontSize(11);
       doc.setFont("helvetica", "normal");
       doc.setTextColor(60);
       
       // Simple cleanup for markdown symbols to make it readable in PDF
       const cleanAdvice = typedAdvice
         .replace(/\*\*/g, "")       // Bold
         .replace(/\*/g, "•")        // Bullets
         .replace(/#{1,6}\s?/g, "")  // Headers
         .replace(/`/g, "")          // Code
         .trim();
         
       const splitText = doc.splitTextToSize(cleanAdvice, pageWidth - 2 * margin);
       
       // Check if text exceeds page
       if (yPos + splitText.length * 5 > doc.internal.pageSize.getHeight() - margin) {
         doc.addPage();
         yPos = 20;
       }
       
       doc.text(splitText, margin, yPos);
    }
    
    doc.save("leafdoctor-report.pdf");
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
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">Digital Diagnosis Studio</h1>
            <p className="text-slate-600 max-w-2xl mx-auto">Upload a clear photo of a plant leaf to get instant disease identification and treatment advice.</p>
        </div>

        {/* Responsive grid: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          
          {/* -- LEFT: Upload Zone & Tools -- */}
          <div className="flex flex-col gap-6">
            <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-lg border border-white/50 p-6 md:p-8 relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
               
              <h2 className="font-bold text-slate-900 text-lg mb-6 flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-600" />
                Upload Image
              </h2>
              
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
                        Upload an image from the panel on the left to begin the automated analysis process.
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

                                    {/* Prominent Download Button */}
                                    <div className="mt-8 pt-6 border-t border-slate-100">
                                        <button 
                                            onClick={handleDownloadReport}
                                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-green-100 flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-[0.98]"
                                        >
                                            <Download className="w-5 h-5" />
                                            Download Comprehensive Report (PDF)
                                        </button>
                                        <p className="text-center text-xs text-slate-400 mt-3 font-medium">Includes original photo, diagnosis data and treatment plan</p>
                                    </div>
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
                                    Analysis Result
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