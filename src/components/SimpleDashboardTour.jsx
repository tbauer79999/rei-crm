// src/components/SimpleDashboardTour.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';

const SimpleDashboardTour = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);

  // Simple dashboard-only steps
  const steps = [
    {
      selector: 'body',
      title: 'Welcome to SurFox! 🦊',
      content: 'Let me show you around your dashboard.',
      placement: 'center',
    },
    {
      selector: '.tour-stats',
      title: 'Your Lead Overview',
      content: 'These cards show your total leads, hot prospects, and monthly performance at a glance.',
      placement: 'bottom',
    },
    {
      selector: '.tour-add-lead',
      title: 'Add New Leads',
      content: 'Click here to add leads manually or upload a CSV file with multiple leads.',
      placement: 'left',
    },
    {
      selector: '.tour-search',
      title: 'Search Your Leads',
      content: 'Use this search box to quickly find any lead by name, email, or phone number.',
      placement: 'bottom',
    },
    {
      selector: '.tour-filters',
      title: 'Filter by Status',
      content: 'Click these buttons to filter leads by their status: Hot, Engaging, Responding, etc.',
      placement: 'top',
    },
    {
      selector: '.tour-leads-table',
      title: 'Lead Management Table',
      content: 'Click any lead to view details and send messages. You can sort and paginate through your leads here.',
      placement: 'top',
    },
    {
      selector: '.tour-export',
      title: 'Export Your Data',
      content: 'Download your leads as a CSV file for backup or analysis.',
      placement: 'bottom',
    },
  ];

  useEffect(() => {
    const shouldShow = localStorage.getItem('show_dashboard_tour');
    if (shouldShow === 'true') {
      setIsActive(true);
      localStorage.removeItem('show_dashboard_tour');
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      setTimeout(calculateTooltipPosition, 100);
      window.addEventListener('resize', calculateTooltipPosition);
      window.addEventListener('scroll', calculateTooltipPosition);
      
      return () => {
        window.removeEventListener('resize', calculateTooltipPosition);
        window.removeEventListener('scroll', calculateTooltipPosition);
      };
    }
  }, [isActive, currentStep]);

  const calculateTooltipPosition = () => {
    const step = steps[currentStep];
    if (!step || !tooltipRef.current) return;

    if (step.selector === 'body') {
      setTooltipPosition({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 200,
      });
      return;
    }

    const element = document.querySelector(step.selector);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 20;

    let top, left;

    switch (step.placement) {
      case 'bottom':
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        break;
      case 'top':
        top = rect.top - tooltipRect.height - padding;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.left - tooltipRect.width - padding;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.right + padding;
        break;
      default:
        top = rect.bottom + padding;
        left = rect.left;
    }

    // Keep tooltip within viewport
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));

    setTooltipPosition({ top, left });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem('dashboard_tour_completed', 'true');
  };

  if (!isActive) return null;

  const currentTourStep = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const getSpotlightStyle = () => {
    if (currentTourStep.selector === 'body') {
      return { display: 'none' };
    }

    const element = document.querySelector(currentTourStep.selector);
    if (!element) return { display: 'none' };

    const rect = element.getBoundingClientRect();
    const padding = 20;

    return {
      position: 'fixed',
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      borderRadius: '8px',
      pointerEvents: 'none',
      zIndex: 9998,
    };
  };

  return (
    <>
      {/* Dark overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[9997]"
        onClick={handleComplete}
      />

      {/* Spotlight */}
      <div 
        style={{
          ...getSpotlightStyle(),
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] bg-white rounded-lg shadow-2xl p-6 max-w-md"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        <button
          onClick={handleComplete}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pr-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {currentTourStep.title}
          </h3>
          <p className="text-gray-600 leading-relaxed">
            {currentTourStep.content}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <span>{isLastStep ? 'Finish' : 'Next'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};

export default SimpleDashboardTour;