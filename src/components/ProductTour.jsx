// src/components/ProductTour.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const ProductTour = ({ onComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const tooltipRef = useRef(null);
  
  // Get tour state from localStorage
  const getTourState = () => {
    const active = localStorage.getItem('tour_active') === 'true';
    const step = parseInt(localStorage.getItem('tour_step') || '0', 10);
    return { active, step };
  };
  
  const { active: initialActive, step: initialStep } = getTourState();
  const [isActive, setIsActive] = useState(initialActive);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isPageReady, setIsPageReady] = useState(false);
  const pageReadyCheckInterval = useRef(null);
  const mountTime = useRef(Date.now());

  // Multi-page tour steps
  const steps = [
    // Dashboard Steps
    {
      page: '/dashboard',
      selector: 'body',
      title: 'Welcome to SurFox! 🦊',
      content: 'Your AI-powered lead management platform. Let me show you how to transform your business with intelligent automation.',
      placement: 'center',
    },
    {
      page: '/dashboard',
      selector: '.tour-stats',
      title: 'Your Lead Overview',
      content: 'Quick stats show your total leads, hot prospects, and monthly performance.',
      placement: 'bottom',
    },
    {
      page: '/dashboard',
      selector: '.tour-add-lead',
      title: 'Add New Leads',
      content: 'Add leads one at a time or upload hundreds via CSV.',
      placement: 'left',
    },
    {
      page: '/control-room',
      selector: 'body',
      title: 'AI Pipeline Control Center',
      content: 'This is your command center. Monitor your entire lead pipeline in real-time.',
      placement: 'center',
      waitForSelector: '.pipeline-section, .control-room-content, main', // Wait for specific control room elements
    },
    {
      page: '/control-room',
      selector: 'body',
      title: 'Pipeline Sections',
      content: 'Each section here shows different aspects of your AI system - health metrics, lead handoffs, and optimization data.',
      placement: 'center',
    },
    {
      page: '/campaign-management',
      selector: 'body',
      title: 'Campaign Management',
      content: 'Create and manage your lead generation campaigns. Each campaign can have its own AI personality.',
      placement: 'center',
    },
    {
      page: '/campaign-management',
      selector: 'button',
      title: 'Launch AI Campaigns',
      content: 'Create targeted campaigns for different lead sources.',
      placement: 'bottom',
    },
    {
      page: '/settings',
      selector: 'body',
      title: 'Settings & Configuration',
      content: 'Configure your AI, manage your team, and customize your platform. Your AI is now ready to engage leads 24/7!',
      placement: 'center',
      isLastStep: true,
    },
  ];

  // Initialize tour from flag
  useEffect(() => {
    const shouldShow = localStorage.getItem('show_product_tour') === 'true';
    if (shouldShow && !isActive) {
      localStorage.removeItem('show_product_tour');
      localStorage.setItem('tour_active', 'true');
      localStorage.setItem('tour_step', '0');
      setIsActive(true);
      setCurrentStep(0);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isActive) {
      localStorage.setItem('tour_active', 'true');
      localStorage.setItem('tour_step', currentStep.toString());
    }
  }, [isActive, currentStep]);

  // Check if page is ready when location changes
  useEffect(() => {
    mountTime.current = Date.now();
    setIsPageReady(false);
    
    if (!isActive) return;
    
    const currentStepData = steps[currentStep];
    if (!currentStepData || currentStepData.page !== location.pathname) return;
    
    console.log('Tour: Checking if page is ready for step', currentStep, 'on', location.pathname);
    
    // Clear any existing interval
    if (pageReadyCheckInterval.current) {
      clearInterval(pageReadyCheckInterval.current);
    }
    
    let checkCount = 0;
    const maxChecks = 60; // 30 seconds max wait
    
    // Function to check if page is ready
    const checkPageReady = () => {
      checkCount++;
      
      // Check if we have specific elements to wait for
      if (currentStepData.waitForSelector) {
        const element = document.querySelector(currentStepData.waitForSelector);
        if (element) {
          console.log('Tour: Page element found:', currentStepData.waitForSelector);
          setIsPageReady(true);
          if (pageReadyCheckInterval.current) {
            clearInterval(pageReadyCheckInterval.current);
          }
          return true;
        }
      }
      
      // For control-room specifically, wait a bit longer and check for data
      if (location.pathname === '/control-room') {
        const timeSinceMount = Date.now() - mountTime.current;
        // Wait at least 2 seconds for control room to load
        if (timeSinceMount > 2000) {
          console.log('Tour: Control room timer reached, considering ready');
          setIsPageReady(true);
          if (pageReadyCheckInterval.current) {
            clearInterval(pageReadyCheckInterval.current);
          }
          return true;
        }
      } else {
        // For other pages, consider ready after 500ms
        const timeSinceMount = Date.now() - mountTime.current;
        if (timeSinceMount > 500) {
          setIsPageReady(true);
          if (pageReadyCheckInterval.current) {
            clearInterval(pageReadyCheckInterval.current);
          }
          return true;
        }
      }
      
      // Timeout after max checks
      if (checkCount >= maxChecks) {
        console.log('Tour: Page ready check timeout, proceeding anyway');
        setIsPageReady(true);
        if (pageReadyCheckInterval.current) {
          clearInterval(pageReadyCheckInterval.current);
        }
        return true;
      }
      
      return false;
    };
    
    // Check immediately
    if (!checkPageReady()) {
      // Then check every 500ms
      pageReadyCheckInterval.current = setInterval(checkPageReady, 500);
    }
    
    // Cleanup
    return () => {
      if (pageReadyCheckInterval.current) {
        clearInterval(pageReadyCheckInterval.current);
      }
    };
  }, [location.pathname, currentStep, isActive]);

  // Check if we should show tour on this page
  const currentStepData = steps[currentStep];
  const shouldShowOnPage = isActive && 
                          currentStepData && 
                          currentStepData.page === location.pathname && 
                          isPageReady;

  // Set up tour when page is ready
  useEffect(() => {
    if (shouldShowOnPage) {
      console.log('Tour: Page is ready, setting up step', currentStep);
      const timer = setTimeout(() => {
        calculateTooltipPosition();
      }, 300); // Small delay for final render
      
      window.addEventListener('resize', calculateTooltipPosition);
      window.addEventListener('scroll', calculateTooltipPosition);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', calculateTooltipPosition);
        window.removeEventListener('scroll', calculateTooltipPosition);
      };
    }
  }, [shouldShowOnPage, currentStep]);

  const calculateTooltipPosition = () => {
    const step = steps[currentStep];
    if (!step || !tooltipRef.current || step.page !== location.pathname) return;

    if (step.selector === 'body') {
      setTooltipPosition({
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - 200,
      });
      return;
    }

    const element = document.querySelector(step.selector);
    if (!element) {
      console.warn('Tour element not found:', step.selector);
      // Fall back to center placement
      setTooltipPosition({
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - 200,
      });
      return;
    }

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
      case 'center':
      default:
        top = window.innerHeight / 2 - tooltipRect.height / 2;
        left = window.innerWidth / 2 - tooltipRect.width / 2;
    }

    // Keep tooltip within viewport
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));

    setTooltipPosition({ top, left });
  };

  const handleNext = () => {
    console.log('Tour: Next button clicked, current step:', currentStep);
    const nextStep = currentStep + 1;
    
    if (nextStep < steps.length) {
      const nextStepData = steps[nextStep];
      console.log('Tour: Moving to step', nextStep, 'on page', nextStepData.page);
      setCurrentStep(nextStep);
      
      // If next step is on a different page, navigate
      if (nextStepData.page !== location.pathname) {
        console.log('Tour: Navigating from', location.pathname, 'to', nextStepData.page);
        navigate(nextStepData.page);
      }
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    console.log('Tour: Previous button clicked, current step:', currentStep);
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      const prevStepData = steps[prevStep];
      console.log('Tour: Moving back to step', prevStep, 'on page', prevStepData.page);
      setCurrentStep(prevStep);
      
      // If previous step is on a different page, navigate
      if (prevStepData.page !== location.pathname) {
        navigate(prevStepData.page);
      }
    }
  };

  const handleComplete = () => {
    console.log('Tour: Completing tour');
    setIsActive(false);
    localStorage.removeItem('tour_active');
    localStorage.removeItem('tour_step');
    localStorage.setItem('surfox_tour_completed', 'true');
    if (onComplete) onComplete();
    
    // Return to dashboard
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard');
    }
  };

  const handleSkip = () => {
    if (window.confirm('Are you sure you want to skip the tour? You can restart it anytime from the help menu.')) {
      handleComplete();
    }
  };

  // Don't render anything if tour is not active
  if (!isActive) return null;

  // Show loading state while waiting for page
  if (currentStepData && currentStepData.page === location.pathname && !isPageReady) {
    return (
      <div className="fixed bottom-8 right-8 z-[9999] bg-white rounded-lg shadow-2xl p-4 max-w-sm">
        <div className="flex items-center space-x-3">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-700">Loading tour step...</span>
        </div>
      </div>
    );
  }

  if (!shouldShowOnPage) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStepData.isLastStep || currentStep === steps.length - 1;

  // Get spotlight dimensions
  const getSpotlightStyle = () => {
    if (currentStepData.selector === 'body') {
      return { display: 'none' };
    }

    const element = document.querySelector(currentStepData.selector);
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
      <div className="fixed inset-0 bg-black/60 z-[9997]" />

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
          animation: 'fadeIn 0.3s ease-out'
        }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="pr-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {currentStepData.title}
          </h3>
          <p className="text-gray-600 leading-relaxed">
            {currentStepData.content}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          {/* Step counter */}
          <div className="flex items-center space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 transition-all duration-300 rounded-full ${
                  index === currentStep
                    ? 'w-8 bg-blue-600'
                    : index < currentStep
                    ? 'w-1.5 bg-blue-400'
                    : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center space-x-2">
            {!isFirstStep && (
              <button
                onClick={handlePrevious}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back
              </button>
            )}
            
            {!isLastStep && (
              <button
                onClick={handleSkip}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Skip tour
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>{isLastStep ? 'Finish Tour' : 'Next'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default ProductTour;