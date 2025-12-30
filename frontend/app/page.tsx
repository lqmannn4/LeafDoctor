"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, ShieldCheck, CloudSun, Activity, Upload, Stethoscope, Sprout, MessageSquare } from "lucide-react";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  return (
    <main className="relative min-h-screen font-sans text-slate-900 selection:bg-green-100 selection:text-green-900">
      
      {/* Global Background Layer */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-green-50/30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-green-100/40 rounded-full blur-[100px] opacity-70" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-50/40 rounded-full blur-[100px] opacity-60" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-36 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-green-200 text-green-700 text-sm font-medium mb-8 shadow-sm hover:shadow-md transition-shadow cursor-default"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            AI-Powered Plant Analysis v2.0
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto"
          >
            Your Personal <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
              Plant Doctor
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Instantly diagnose diseases for 38+ crop types using advanced AI. 
            Get precision treatment plans and weather insights in seconds.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              href="/diagnosis"
              className="group relative px-8 py-4 text-lg font-bold rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-all hover:shadow-green-200 hover:-translate-y-1 flex items-center gap-2"
            >
              Start Diagnosis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="https://github.com/spMohanty/PlantVillage-Dataset"
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 text-lg font-semibold rounded-full bg-white/50 backdrop-blur-sm border border-slate-200 text-slate-700 hover:bg-white/80 hover:border-slate-300 transition-all flex items-center gap-2"
            >
              View Dataset
            </a>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-4">Why choose LeafDoctor?</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We combine state-of-the-art machine learning with agricultural expertise to help you save your crops.
            </p>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Feature 1 */}
            <motion.div variants={fadeInUp} className="group p-8 rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:border-green-200 hover:bg-green-50/40 transition-all duration-300 hover:shadow-xl hover:shadow-green-100/20">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6 text-green-600 group-hover:scale-110 transition-transform duration-300">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">High Precision</h3>
              <p className="text-slate-600 leading-relaxed">
                Trained on over 50,000 images from the PlantVillage dataset to detect even early signs of disease with more than 90% accuracy.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div variants={fadeInUp} className="group p-8 rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:border-blue-200 hover:bg-blue-50/40 transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/20">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                <Sprout className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Treatment</h3>
              <p className="text-slate-600 leading-relaxed">
                Don't just find the problem—fix it. Get actionable, chemical and organic treatment steps immediately after diagnosis.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div variants={fadeInUp} className="group p-8 rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm hover:border-yellow-200 hover:bg-yellow-50/40 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-100/20">
              <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center mb-6 text-yellow-600 group-hover:scale-110 transition-transform duration-300">
                <CloudSun className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Weather Aware</h3>
              <p className="text-slate-600 leading-relaxed">
                Integrated local weather forecasts help you plan the best time for spraying and harvest to maximize effectiveness.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-4">How it works</h2>
            <p className="text-lg text-slate-600">A comprehensive process to ensure your plants thrive.</p>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Connecting Line (Desktop) */}
            <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-slate-200/60 -z-10" />

            {[
              { 
                icon: Upload, 
                title: 'Upload Photo', 
                desc: 'Take a clear photo of the affected leaf or crop.' 
              },
              { 
                icon: Activity, 
                title: 'AI Analysis', 
                desc: 'Our model identifies the specific disease with high precision.' 
              },
              { 
                icon: Stethoscope, 
                title: 'Get Treatment', 
                desc: 'Receive immediate organic and chemical treatment steps.' 
              },
              { 
                icon: MessageSquare, 
                title: 'Consult AI Expert', 
                desc: 'Chat with our 24/7 AI assistant for follow-up care and tips.' 
              }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 rounded-3xl bg-white/40 border border-transparent hover:border-green-100 hover:bg-white/60 transition-all duration-300">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-green-50 shadow-sm mb-6 relative z-10 group-hover:scale-110 transition-transform">
                  <step.icon className="w-8 h-8 text-green-600" />
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {i + 1}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 max-w-xs">{step.desc}</p>
              </div>
            ))}
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