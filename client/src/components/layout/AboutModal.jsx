import React from 'react';
import { X, Info, Shield, Cpu, Layout } from 'lucide-react';
import Card from '../ui/Card';

const AboutModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 text-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <Card className="w-full max-w-md bg-darkCard border border-darkBorder p-5 space-y-4 shadow-2xl relative text-customText max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-customMuted hover:text-customText bg-darkBgSecondary/55 border border-darkBorder rounded-lg focus:outline-none focus:ring-1 focus:ring-customPrimary"
          aria-label="Close about dialogue"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 border-b border-darkBorder/40 pb-2">
          <Info className="w-4 h-4 text-customPrimary" />
          <h3 id="about-title" className="font-bold text-customText text-[11px] uppercase tracking-wider">
            About the Platform
          </h3>
        </div>

        {/* Contents */}
        <div className="space-y-4 leading-relaxed">
          <div className="text-center space-y-1.5 bg-darkBgSecondary/35 border border-darkBorder rounded-xl p-4">
            <h4 className="text-sm font-black uppercase text-customPrimary">
              Smart Logistics & Accessibility Platform
            </h4>
            <span className="text-[10px] text-customMuted font-bold uppercase tracking-wider block">
              SIH Problem Statement SIH26002
            </span>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-[10px] text-customPrimary uppercase tracking-wider">
              Project Details
            </h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
              <div>
                <span className="text-customMuted block">Organization:</span>
                <span className="font-semibold text-customText">MDoNER, Govt of India</span>
              </div>
              <div>
                <span className="text-customMuted block">Theme:</span>
                <span className="font-semibold text-customText">Smart Automation</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-darkBorder/40 pt-3">
            <h5 className="font-bold text-[10px] text-customPrimary uppercase tracking-wider flex items-center gap-1">
              <Layout className="w-3.5 h-3.5 text-customPrimary" />
              Technology Stack
            </h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
              <div>
                <span className="text-customMuted block">Frontend:</span>
                <span className="font-semibold text-customText">React + Vite + Tailwind CSS</span>
              </div>
              <div>
                <span className="text-customMuted block">Backend:</span>
                <span className="font-semibold text-customText">Node.js + Express</span>
              </div>
              <div>
                <span className="text-customMuted block">Database:</span>
                <span className="font-semibold text-customText">MongoDB (Fallback Active)</span>
              </div>
              <div>
                <span className="text-customMuted block">Mapping:</span>
                <span className="font-semibold text-customText">Leaflet + OpenStreetMap</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-darkBorder/40 pt-3">
            <h5 className="font-bold text-[10px] text-customPrimary uppercase tracking-wider flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-customPrimary" />
              Intelligence Layer (Deterministic)
            </h5>
            <ul className="list-disc pl-4 text-[10px] text-customMuted space-y-1">
              <li>
                <strong className="text-customText">Multi-Criteria Routing Scoring</strong>: deterministic algorithms normalize distance and duration sub-scores.
              </li>
              <li>
                <strong className="text-customText">Weight Normalization</strong>: Priority base weights and cargooffsets adjust calculations to sum to exactly 100%.
              </li>
              <li>
                <strong className="text-customText">Environmental Risk Aggregation</strong>: Worst-case index weighting (rainfall, flood, landslide risk circles).
              </li>
              <li>
                <strong className="text-customText">Logistics Connectivity Assessment</strong>: Estimates signal coverage based on mountain terrains.
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AboutModal;
