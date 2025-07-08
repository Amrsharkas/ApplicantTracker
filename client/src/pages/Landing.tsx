import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Target, Zap, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

// Import company logos
import moderatorLogo from "@assets/image_1752003560205.png";
import quantaLogo from "@assets/image_1752003568386.png";
import impleLogo from "@assets/image_1752003573875.png";
import neuroLogo from "@assets/image_1752003578397.png";
import polygonLogo from "@assets/image_1752003581991.png";
import groveLogo from "@assets/image_1752003586635.png";
import melaniteLogo from "@assets/image_1752003591909.png";

// Company logos data
const companyLogos = [
  { name: "Moderator", logo: moderatorLogo },
  { name: "Quanta", logo: quantaLogo },
  { name: "Imple", logo: impleLogo },
  { name: "Neuro", logo: neuroLogo },
  { name: "Polygon", logo: polygonLogo },
  { name: "Grove", logo: groveLogo },
  { name: "Melanite", logo: melaniteLogo }
];

// Carousel component
function CompanyCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % companyLogos.length);
    }, 5000); // Change every 5 seconds (slower)

    return () => clearInterval(interval);
  }, []);

  const getPrevIndex = () => (currentIndex - 1 + companyLogos.length) % companyLogos.length;
  const getNextIndex = () => (currentIndex + 1) % companyLogos.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="text-center space-y-12 py-20"
    >
      <div className="space-y-6">
        <h2 className="text-4xl font-bold text-slate-800">
          Trusted by Industry Leaders
        </h2>
        <p className="text-xl text-slate-600 max-w-4xl mx-auto">
          Forward-thinking companies are already transforming their hiring with our AI-powered platform, 
          discovering exceptional talent faster than ever before.
        </p>
      </div>

      {/* 3D Carousel with Podium Effect */}
      <div className="relative w-full h-64 flex items-center justify-center perspective-1000">
        <div className="relative w-full max-w-6xl h-full">
          {/* Left Logo */}
          <motion.div
            key={`left-${getPrevIndex()}`}
            initial={{ opacity: 0, scale: 0.6, x: -100 }}
            animate={{ opacity: 0.4, scale: 0.7, x: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10"
          >
            <div className="w-48 h-32 flex items-center justify-center">
              <img
                src={companyLogos[getPrevIndex()].logo}
                alt={companyLogos[getPrevIndex()].name}
                className="max-w-full max-h-full object-contain filter blur-sm grayscale-50"
              />
            </div>
          </motion.div>

          {/* Center Logo (Main Focus) */}
          <motion.div
            key={`center-${currentIndex}`}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
          >
            <div className="company-carousel w-80 h-48 p-12 mx-auto">
              <div className="relative w-full h-full overflow-hidden">
                <img
                  src={companyLogos[currentIndex].logo}
                  alt={companyLogos[currentIndex].name}
                  className="company-logo max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </motion.div>

          {/* Right Logo */}
          <motion.div
            key={`right-${getNextIndex()}`}
            initial={{ opacity: 0, scale: 0.6, x: 100 }}
            animate={{ opacity: 0.4, scale: 0.7, x: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10"
          >
            <div className="w-48 h-32 flex items-center justify-center">
              <img
                src={companyLogos[getNextIndex()].logo}
                alt={companyLogos[getNextIndex()].name}
                className="max-w-full max-h-full object-contain filter blur-sm grayscale-50"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex justify-center space-x-3">
        {companyLogos.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`carousel-dot w-3 h-3 rounded-full ${
              index === currentIndex 
                ? 'active w-10' 
                : 'bg-slate-300 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>

      <div className="text-center space-y-3">
        <p className="text-slate-700 font-semibold text-xl">
          "Revolutionary approach to talent acquisition"
        </p>
        <p className="text-slate-500 text-base">
          Join the companies shaping the future of hiring
        </p>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 overflow-hidden">
      {/* Floating decorative elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="floating-element absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
        <div className="floating-element absolute top-1/2 right-20 w-24 h-24 bg-gradient-to-br from-green-400/20 to-teal-400/20 rounded-full blur-xl"></div>
        <div className="floating-element absolute bottom-20 left-1/3 w-40 h-40 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6"
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              Plato
            </motion.div>
            
            <Button 
              onClick={handleLogin}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-xl font-medium"
            >
              Sign In
            </Button>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Column - Hero Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight"
                >
                  Let AI help you get{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    discovered
                  </span>{" "}
                  by the right job
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl text-slate-600 leading-relaxed"
                >
                  We turn your story into a professional profile that companies want. 
                  Experience the future of job matching with AI-powered interviews and 
                  intelligent recommendations.
                </motion.p>
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button 
                  onClick={handleLogin}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Get Started
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-2 border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg"
                >
                  Learn More
                </Button>
              </motion.div>

              {/* Feature highlights */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap gap-6 pt-4"
              >
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">AI-Powered Matching</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Smart Interviews</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Instant Results</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Feature Cards */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="glass-card transition-all duration-300 hover:shadow-2xl border-0">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-lg mb-2">AI Interview</h3>
                        <p className="text-slate-600">
                          Have a natural conversation with our AI to build your professional profile automatically.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card className="glass-card transition-all duration-300 hover:shadow-2xl border-0">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-lg mb-2">Smart Matching</h3>
                        <p className="text-slate-600">
                          Get matched to jobs with precision scoring based on your skills, experience, and goals.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Card className="glass-card transition-all duration-300 hover:shadow-2xl border-0">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-lg mb-2">Instant Results</h3>
                        <p className="text-slate-600">
                          See your matches immediately with detailed scoring and application tracking.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>

          {/* Company Carousel Section */}
          <CompanyCarousel />

          {/* Bottom CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="text-center mt-20 space-y-6"
          >
            <h2 className="text-3xl font-bold text-slate-800">
              Ready to find your perfect job match?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Join thousands of professionals who've discovered their dream careers with AI-powered job matching.
            </p>
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-4 rounded-xl font-semibold text-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Your Journey
            </Button>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
