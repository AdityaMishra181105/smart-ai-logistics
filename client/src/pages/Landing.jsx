import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mountain, CloudRain, Route, PackageCheck, ArrowRight, Shield } from 'lucide-react';
import Button from '../components/ui/Button';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-darkBg text-customText flex flex-col justify-between font-sans select-none antialiased">
      {/* Top logo block */}
      <header className="px-6 py-4 md:px-12 border-b border-darkBorder flex items-center justify-between bg-darkCard/30 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-customPrimary/10 border border-customPrimary/30 rounded-lg text-customPrimary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight tracking-wide">Smart Logistics</h2>
            <span className="text-[10px] text-customPrimary font-semibold uppercase tracking-wider block">SIH26002</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/login')}
          className="font-bold uppercase tracking-wider text-[10px]"
        >
          Sign In
        </Button>
      </header>

      {/* Main presentation grid */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 py-12 space-y-12">
        <div className="text-center space-y-4 max-w-3xl">
          <span className="text-[10px] text-customPrimary font-black uppercase tracking-widest bg-customPrimary/10 border border-customPrimary/20 px-3 py-1 rounded-full">
            Ministry of Development of North Eastern Region (MDoNER)
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-customText mt-2 leading-tight uppercase">
            Smart Logistics & Accessibility Platform
          </h1>
          <p className="text-sm md:text-base text-customPrimary font-bold tracking-wide">
            AI-Powered Logistics Intelligence for the North Eastern Region
          </p>
          <p className="text-xs md:text-sm text-customMuted leading-relaxed max-w-2xl mx-auto pt-2 border-t border-darkBorder/30">
            Essential goods including medicines, food supplies, agricultural produce and construction materials often face delivery delays due to difficult terrain, heavy rainfall, floods, landslides and poor connectivity.
          </p>
        </div>

        {/* 4 Problem cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          <div className="bg-darkCard/80 border border-darkBorder p-5 rounded-xl space-y-3 hover:border-darkBorderActive transition-colors text-center md:text-left">
            <div className="p-3 bg-darkBgSecondary/65 border border-darkBorder rounded-xl inline-block text-customPrimary">
              <Mountain className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-sm text-customText">Difficult Terrain</h3>
            <p className="text-[11px] text-customMuted leading-relaxed">
              Mountainous roads and remote locations create complex delivery challenges.
            </p>
          </div>

          <div className="bg-darkCard/80 border border-darkBorder p-5 rounded-xl space-y-3 hover:border-darkBorderActive transition-colors text-center md:text-left">
            <div className="p-3 bg-darkBgSecondary/65 border border-darkBorder rounded-xl inline-block text-customPrimary">
              <CloudRain className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-sm text-customText">Extreme Weather</h3>
            <p className="text-[11px] text-customMuted leading-relaxed">
              Heavy rainfall, floods and landslides can disrupt critical transport routes.
            </p>
          </div>

          <div className="bg-darkCard/80 border border-darkBorder p-5 rounded-xl space-y-3 hover:border-darkBorderActive transition-colors text-center md:text-left">
            <div className="p-3 bg-darkBgSecondary/65 border border-darkBorder rounded-xl inline-block text-customPrimary">
              <Route className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-sm text-customText">Route Intelligence</h3>
            <p className="text-[11px] text-customMuted leading-relaxed">
              Multiple route alternatives must be analyzed for safety, time and accessibility.
            </p>
          </div>

          <div className="bg-darkCard/80 border border-darkBorder p-5 rounded-xl space-y-3 hover:border-darkBorderActive transition-colors text-center md:text-left">
            <div className="p-3 bg-darkBgSecondary/65 border border-darkBorder rounded-xl inline-block text-customPrimary">
              <PackageCheck className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-sm text-customText">Essential Deliveries</h3>
            <p className="text-[11px] text-customMuted leading-relaxed">
              Critical medicines, food and emergency supplies require reliable delivery.
            </p>
          </div>
        </div>

        {/* CTA Launch Platform */}
        <div className="pt-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/login')}
            className="font-bold uppercase tracking-wider text-[11px] px-8 py-3.5 flex items-center gap-1.5 shadow-2xl hover:scale-[1.02] transform transition-transform"
          >
            <span>Launch Smart Logistics Platform</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center border-t border-darkBorder text-[10px] text-customMuted bg-darkBgSecondary/20">
        Smart Logistics & Accessibility Platform MVP • SIH Problem Statement SIH26002
      </footer>
    </div>
  );
};

export default Landing;
