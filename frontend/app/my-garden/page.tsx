"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Leaf, Calendar, Activity, LogOut, Trash2, Droplets, Clock, CalendarCheck } from "lucide-react";

interface Diagnosis {
  id: number;
  filename: string;
  disease_name: string;
  confidence: string;
  advice: string;
  timestamp: string;
}

interface Schedule {
  id: number;
  diagnosis_id: number;
  user_id: number;
  water_interval_days: number;
  last_watered_date: string;
}

export default function MyGardenPage() {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        // Parallel fetch
        const [gardenRes, scheduleRes] = await Promise.all([
            fetch("http://127.0.0.1:8000/my-garden", { headers }),
            fetch("http://127.0.0.1:8000/schedules", { headers })
        ]);

        if (!gardenRes.ok) throw new Error("Failed to fetch garden");
        
        const gardenData = await gardenRes.json();
        setDiagnoses(gardenData);

        if (scheduleRes.ok) {
            const scheduleData = await scheduleRes.json();
            setSchedules(scheduleData);
        }
        
      } catch (err) {
        console.error(err);
        // Don't auto-logout on minor errors, but if 401 maybe
        // localStorage.removeItem("token");
        // router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this diagnosis?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/diagnoses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete");

      setDiagnoses((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSetSchedule = async (diagnosisId: number, days: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
        const res = await fetch("http://127.0.0.1:8000/schedules", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ diagnosis_id: diagnosisId, water_interval_days: days })
        });
        
        if (res.ok) {
            const newSchedule = await res.json();
            setSchedules(prev => {
                // Replace existing or add new
                const existingIdx = prev.findIndex(s => String(s.diagnosis_id) === String(diagnosisId));
                if (existingIdx >= 0) {
                    const updated = [...prev];
                    updated[existingIdx] = newSchedule;
                    return updated;
                }
                return [...prev, newSchedule];
            });
        }
    } catch (e) {
        console.error("Failed to set schedule", e);
    }
  };

  const handleWaterPlant = async (diagnosisId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`http://127.0.0.1:8000/schedules/${diagnosisId}/water`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
            // Update local state to reflect "today"
            const todayStr = new Date().toISOString().split('T')[0];
            setSchedules(prev => prev.map(s => {
                if (String(s.diagnosis_id) === String(diagnosisId)) {
                    return { ...s, last_watered_date: todayStr };
                }
                return s;
            }));
        }
    } catch (e) {
        console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("storage"));
    router.push("/");
  };

  // Helper to calculate status
  const getWateringStatus = (schedule: Schedule) => {
    const last = new Date(schedule.last_watered_date);
    const today = new Date();
    // Reset times to compare dates only
    last.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    const nextDate = new Date(last);
    nextDate.setDate(last.getDate() + parseInt(String(schedule.water_interval_days)));
    
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: `Overdue ${Math.abs(diffDays)} days`, color: "text-red-600 bg-red-50", urgent: true };
    if (diffDays === 0) return { label: "Water Today!", color: "text-blue-600 bg-blue-50", urgent: true };
    return { label: `In ${diffDays} days`, color: "text-green-600 bg-green-50", urgent: false };
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-12 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Garden</h1>
            <p className="text-slate-500">Track the health of your plants over time.</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {diagnoses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Your garden is empty</h3>
            <p className="text-slate-500 mb-6">Start by diagnosing your first plant.</p>
            <button
              onClick={() => router.push("/diagnosis")}
              className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
            >
              Diagnose Plant
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diagnoses.map((item) => {
                const schedule = schedules.find(s => String(s.diagnosis_id) === String(item.id));
                const status = schedule ? getWateringStatus(schedule) : null;

                return (
                  <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                    <div className="relative h-48 w-full">
                      <Image
                        src={`http://127.0.0.1:8000/uploads/${encodeURIComponent(item.filename)}`}
                        alt={item.disease_name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-green-600" />
                        {Math.round(parseFloat(item.confidence) * 100)}%
                      </div>
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-lg text-slate-900 mb-1 capitalize">
                        {item.disease_name.replace(/___/g, " - ").replace(/_/g, " ")}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.timestamp).toLocaleDateString()}
                      </div>
                      
                      {/* Advice Section */}
                      <div className="prose prose-sm text-slate-600 line-clamp-3 text-sm mb-6 flex-1">
                        {item.advice}
                      </div>

                      {/* Care Schedule Section */}
                      <div className="mt-auto pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-bold text-slate-800">Watering Schedule</span>
                        </div>

                        {schedule ? (
                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                                <div className="flex flex-col">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md w-fit mb-1 ${status?.color}`}>
                                        {status?.label}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Every {schedule.water_interval_days} days
                                    </span>
                                </div>
                                <button 
                                    onClick={() => handleWaterPlant(item.id)}
                                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                    title="Water Plant Now"
                                >
                                    <Droplets className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <select 
                                    className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                    onChange={(e) => handleSetSchedule(item.id, parseInt(e.target.value))}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Set Frequency</option>
                                    <option value="1">Daily</option>
                                    <option value="2">Every 2 Days</option>
                                    <option value="3">Every 3 Days</option>
                                    <option value="7">Weekly</option>
                                    <option value="14">Bi-Weekly</option>
                                </select>
                                <span className="text-xs text-slate-400 italic">Select to start</span>
                            </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors w-fit mt-4 ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
            })}
          </div>
        )}
      </div>
    </main>
  );
}