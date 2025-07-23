import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabaseClient';

const ProductTour = ({ onComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [tourStatusLoading, setTourStatusLoading] = useState(true); // Add loading state
  const [savedCollapsedState, setSavedCollapsedState] = useState(null);
  const tooltipRef = useRef(null);
  const checkInterval = useRef(null);

  // Tour steps - organized by page
  const tourSteps = [
    // === DASHBOARD STEPS ===
    {
      page: '/dashboard',
      target: 'body',
      title: 'Welcome to SurFox! 🦊',
      content: 'Your AI-powered lead management platform. Let me show you how to transform your business with intelligent automation.',
      placement: 'center',
      hasVideo: true,
      videoUrl: 'https://www.youtube.com/embed/YOUR_VIDEO_ID?autoplay=1&mute=1', // Replace with your YouTube embed URL
    },
    {
      page: '/dashboard',
      target: '.tour-stats',
      title: 'Your Lead Overview',
      content: 'Quick stats show your total leads, hot prospects, and monthly performance at a glance.',
      placement: 'bottom',
    },
    {
      page: '/dashboard',
      target: '.tour-add-lead',
      title: 'Add New Leads',
      content: 'Add leads one at a time or upload hundreds via CSV. Your AI will start engaging them immediately.',
      placement: 'left',
    },
    {
      page: '/dashboard',
      target: '.tour-recent-activity',
      title: 'Recent Activity',
      content: 'See real-time updates on your lead interactions and AI engagement activities.',
      placement: 'top',
    },

    // === CONTROL ROOM STEPS ===
    {
      page: '/control-room',
      target: 'body',
      title: 'AI Pipeline Control Center',
      content: 'This is your command center. Monitor your entire lead pipeline and AI performance in real-time. Let me show you the key sections.',
      placement: 'center',
    },
    {
      page: '/control-room',
      target: '.control-room-section[data-section="overview"]',
      title: 'Overview & Health Metrics',
      content: 'Monitor system performance, lead counts, and key health metrics. This gives you a real-time pulse on your business.',
      placement: 'bottom',
      expandSection: 'overview'
    },
    {
      page: '/control-room',
      target: '.control-room-section[data-section="handoff"]', 
      title: 'Hot Lead Handoff',
      content: 'Track sales team notifications and response times. See which hot leads need immediate attention.',
      placement: 'bottom',
      expandSection: 'handoff'
    },
    {
      page: '/control-room',
      target: '.control-room-section[data-section="optimization"]',
      title: 'AI Optimization Insights',
      content: 'Analyze message performance, keywords, and conversation insights to continuously improve your AI.',
      placement: 'bottom',
      expandSection: 'optimization'
    },

    // === CAMPAIGN MANAGEMENT STEPS ===
    {
      page: '/campaign-management',
      target: 'body',
      title: 'Campaign Management',
      content: 'Create and manage your lead generation campaigns. Each campaign can have its own AI personality.',
      placement: 'center',
    },
    {
      page: '/campaign-management',
      target: '.tour-create-campaign',
      title: 'Create Campaigns',
      content: 'Launch targeted campaigns for different lead sources and customize your AI approach.',
      placement: 'bottom',
    },
    {
      page: '/campaign-management',
      target: '.tour-campaign-list',
      title: 'Manage Active Campaigns',
      content: 'View all your campaigns, track performance, and make adjustments on the fly.',
      placement: 'top',
    },

    // === SETTINGS STEPS ===
    {
      page: '/settings',
      target: 'body',
      title: 'Settings & Configuration',
      content: 'Configure your AI, manage your team, and customize your platform preferences.',
      placement: 'center',
    },
    {
      page: '/settings',
      target: '.tour-ai-config',
      title: 'AI Configuration',
      content: 'Fine-tune your AI personality, response style, and automation preferences.',
      placement: 'bottom',
    },
    {
      page: '/settings',
      target: '.tour-team-management',
      title: 'Team Management',
      content: 'Add team members, set permissions, and manage user access. Your AI is now ready to engage leads 24/7!',
      placement: 'top',
      isLastStep: true,
    },
  ];

  // Check if user has completed tour from database
  useEffect(() => {
    const checkTourStatus = async () => {
      if (!user?.id) {
        setTourStatusLoading(false);
        return;
      }
      
      try {
        console.log('🔍 Checking tour status for user:', user.id);
        const { data, error } = await supabase
          .from('users_profile')
          .select('tour_completed')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error checking tour status:', error);
          setHasCompletedTour(false); // Default to false if error
        } else {
          console.log('📊 Tour status data:', data);
          setHasCompletedTour(data?.tour_completed || false);
        }
      } catch (error) {
        console.error('Error in tour status check:', error);
        setHasCompletedTour(false); // Default to false if error
      } finally {
        setTourStatusLoading(false);
      }
    };
    
    checkTourStatus();
  }, [user?.id]);

  // Initialize tour when flag is set
  useEffect(() => {
    const shouldStart = sessionStorage.getItem('start_product_tour') === 'true';
    
    if (shouldStart && !tourStatusLoading) {
      console.log('🎯 Tour start requested, hasCompletedTour:', hasCompletedTour);
      sessionStorage.removeItem('start_product_tour');
      
      if (!hasCompletedTour) {
        console.log('🎯 Starting tour for new user');
        startTour();
      } else {
        console.log('👤 User has already completed tour, not auto-starting');
      }
    }
  }, [hasCompletedTour, tourStatusLoading]);

  // Start tour function
  const startTour = () => {
    console.log('🚀 Starting tour, current step will be 0');
    setIsActive(true);
    setCurrentStep(0);
    // Navigate to first page if not already there
    const firstStep = tourSteps[0];
    if (location.pathname !== firstStep.page) {
      navigate(firstStep.page);
    }
  };

  // Get current step data
  const currentStepData = tourSteps[currentStep];
  const isOnCorrectPage = currentStepData && location.pathname === currentStepData.page;

  // Auto-expand Control Room sections during tour
  useEffect(() => {
    if (!isActive || !currentStepData) return;
    
    // Pre-expand the NEXT section when we're on Control Room  
    const nextStep = currentStep + 1;
    const nextStepData = tourSteps[nextStep];
    
    // If next step is Control Room with expansion, expand it now
    if (nextStepData && 
        nextStepData.page === '/control-room' && 
        nextStepData.expandSection &&
        location.pathname === '/control-room') {
      
      const sectionId = nextStepData.expandSection;
      console.log(`🎯 Tour: Pre-expanding ${sectionId} section for next step`);
      
      // Save current state if this is the first Control Room step with expansion
      if (!savedCollapsedState) {
        const currentState = localStorage.getItem('controlroom-collapse');
        if (currentState) {
          setSavedCollapsedState(currentState);
          console.log('💾 Tour: Saved current collapsed state');
        }
      }
      
      // Expand the required section
      const currentCollapsed = JSON.parse(localStorage.getItem('controlroom-collapse') || '{}');
      const updatedState = { 
        ...currentCollapsed, 
        [sectionId]: false // false means expanded
      };
      
      localStorage.setItem('controlroom-collapse', JSON.stringify(updatedState));
      
      // Trigger a storage event to notify the Control Room component
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'controlroom-collapse',
        newValue: JSON.stringify(updatedState)
      }));
      
      console.log(`✅ Tour: ${sectionId} section pre-expanded for next step`);
    }
    
    // Handle current step expansion (for immediate steps)
    if (location.pathname === '/control-room' && currentStepData.expandSection) {
      const sectionId = currentStepData.expandSection;
      console.log(`🎯 Tour: Expanding ${sectionId} section for current step`);
      
      // Save current state if this is the first Control Room step with expansion
      if (!savedCollapsedState) {
        const currentState = localStorage.getItem('controlroom-collapse');
        if (currentState) {
          setSavedCollapsedState(currentState);
          console.log('💾 Tour: Saved current collapsed state');
        }
      }
      
      // Expand the required section
      const currentCollapsed = JSON.parse(localStorage.getItem('controlroom-collapse') || '{}');
      const updatedState = { 
        ...currentCollapsed, 
        [sectionId]: false // false means expanded
      };
      
      localStorage.setItem('controlroom-collapse', JSON.stringify(updatedState));
      
      // Trigger a storage event to notify the Control Room component
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'controlroom-collapse',
        newValue: JSON.stringify(updatedState)
      }));
      
      console.log(`✅ Tour: ${sectionId} section expanded for current step`);
    }
  }, [isActive, currentStep, location.pathname, currentStepData, savedCollapsedState]);

  // Wait for target element to exist
  useEffect(() => {
    if (!isActive || !isOnCorrectPage) return;

    const waitForElement = () => {
      const target = currentStepData.target;
      
      // If targeting body, consider it always ready
      if (target === 'body') {
        calculateTooltipPosition();
        return;
      }

      // Check if target element exists
      const element = document.querySelector(target);
      if (element) {
        // For Control Room sections, scroll them into view
        if (location.pathname === '/control-room' && target.includes('data-section')) {
          console.log('🎯 Tour: Scrolling section into view');
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          
          // Wait a bit for scroll to complete before positioning tooltip
          setTimeout(() => {
            calculateTooltipPosition();
          }, 400);
        } else {
          calculateTooltipPosition();
        }
        return;
      }

      // If element doesn't exist, keep checking
      checkInterval.current = setTimeout(waitForElement, 100);
    };

    // Clear any existing interval
    if (checkInterval.current) {
      clearTimeout(checkInterval.current);
    }

    // For Control Room steps with expansion, shorter wait since section should already be expanding
    const delay = (location.pathname === '/control-room' && currentStepData.expandSection) ? 400 : 200;
    
    // Start checking after a brief delay to let page render
    const initialDelay = setTimeout(waitForElement, delay);

    return () => {
      clearTimeout(initialDelay);
      if (checkInterval.current) {
        clearTimeout(checkInterval.current);
      }
    };
  }, [isActive, currentStep, location.pathname]);

  // Calculate tooltip position
  const calculateTooltipPosition = () => {
    if (!tooltipRef.current || !currentStepData) return;

    const target = currentStepData.target;
    const placement = currentStepData.placement || 'bottom';

    // Center placement for body or when element not found
    if (target === 'body') {
      setTooltipPosition({
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - 200,
      });
      return;
    }

    const element = document.querySelector(target);
    if (!element) {
      // Fallback to center if element not found
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

    switch (placement) {
      case 'top':
        top = rect.top - tooltipRect.height - padding;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + padding;
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

  // Handle window resize
  useEffect(() => {
    if (!isActive) return;

    const handleResize = () => {
      setTimeout(calculateTooltipPosition, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isActive, currentStep]);

  // Navigation functions
  const handleNext = () => {
    const nextStep = currentStep + 1;
    
    if (nextStep >= tourSteps.length) {
      handleComplete();
      return;
    }

    const nextStepData = tourSteps[nextStep];
    setCurrentStep(nextStep);

    // Navigate to next page if different
    if (nextStepData.page !== location.pathname) {
      navigate(nextStepData.page);
    }
  };

  const handlePrevious = () => {
    if (currentStep === 0) return;

    const prevStep = currentStep - 1;
    const prevStepData = tourSteps[prevStep];
    setCurrentStep(prevStep);

    // Navigate to previous page if different
    if (prevStepData.page !== location.pathname) {
      navigate(prevStepData.page);
    }
  };

  const handleComplete = async () => {
    setIsActive(false);
    sessionStorage.setItem('tour_completed', 'true');
    
    // Restore original Control Room collapsed state
    if (savedCollapsedState) {
      console.log('🔄 Tour: Restoring original collapsed state');
      localStorage.setItem('controlroom-collapse', savedCollapsedState);
      
      // Trigger storage event to update Control Room
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'controlroom-collapse',
        newValue: savedCollapsedState
      }));
      
      setSavedCollapsedState(null);
    }
    
    // Save tour completion to database
    console.log('💾 Attempting to save tour completion for user:', user?.id);
    if (user?.id) {
      try {
        console.log('📝 Updating users_profile table...');
        const { data, error } = await supabase
          .from('users_profile')
          .update({ tour_completed: true })
          .eq('id', user.id)
          .select();
        
        if (error) {
          console.error('❌ Supabase error:', error);
          console.error('❌ Error details:', JSON.stringify(error, null, 2));
        } else {
          console.log('✅ Tour completion saved successfully');
          console.log('📊 Updated data:', data);
          setHasCompletedTour(true);
        }
      } catch (error) {
        console.error('❌ JavaScript error saving tour completion:', error);
      }
    } else {
      console.warn('⚠️ No user.id available for saving tour completion');
      console.log('👤 Current user object:', user);
    }
    
    if (onComplete) onComplete();
    
    // Return to dashboard
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard');
    }
  };

  const handleSkip = () => {
    if (window.confirm('Are you sure you want to skip the tour? You can restart it anytime from the help menu.')) {
      // Restore collapsed state before completing
      if (savedCollapsedState) {
        console.log('🔄 Tour: Restoring original collapsed state (skip)');
        localStorage.setItem('controlroom-collapse', savedCollapsedState);
        
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'controlroom-collapse',
          newValue: savedCollapsedState
        }));
        
        setSavedCollapsedState(null);
      }
      
      handleComplete();
    }
  };

  // Get spotlight style for highlighting elements
  const getSpotlightStyle = () => {
    const target = currentStepData?.target;
    
    if (!target || target === 'body') {
      return { display: 'none' };
    }

    const element = document.querySelector(target);
    if (!element) return { display: 'none' };

    const rect = element.getBoundingClientRect();
    const padding = 8;

    return {
      position: 'fixed',
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      borderRadius: '8px',
      pointerEvents: 'none',
      zIndex: 9998,
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.25)',
    };
  };

  // Debug logging for button visibility
  console.log('🔍 Button state debug:', {
    isActive,
    hasCompletedTour,
    tourStatusLoading,
    userId: user?.id,
    shouldShowStartButton: !isActive && !hasCompletedTour && !tourStatusLoading,
    shouldShowRestartButton: !isActive && hasCompletedTour && !tourStatusLoading
  });

  return (
    <>
      {/* Single Tour Button - Start or Restart based on completion status */}
      {!isActive && !tourStatusLoading && (
        <button
          onClick={() => {
            if (hasCompletedTour) {
              console.log('🔄 Restarting tour for returning user');
            } else {
              console.log('🎯 Starting tour for new user');
            }
            startTour();
          }}
          className={`fixed bottom-4 left-4 z-[9999] ${
            hasCompletedTour 
              ? 'bg-gray-600 hover:bg-gray-700' 
              : 'bg-purple-600 hover:bg-purple-700'
          } text-white p-3 rounded-full shadow-lg transition-colors flex items-center space-x-2`}
          title={hasCompletedTour ? "Restart Product Tour" : "Start Product Tour"}
        >
          <Play className="w-5 h-5" />
          <span className="hidden sm:block">
            {hasCompletedTour ? 'Restart Tour' : 'Start Tour'}
          </span>
        </button>
      )}

      {/* Loading state when checking tour status */}
      {tourStatusLoading && (
        <div className="fixed bottom-4 left-4 z-[9999] bg-gray-500 text-white p-3 rounded-full shadow-lg flex items-center space-x-2">
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="hidden sm:block text-sm">Loading...</span>
        </div>
      )}

      {/* Loading state when tour is active but waiting for page */}
      {isActive && (!isOnCorrectPage || !currentStepData) && (
        <div className="fixed bottom-8 right-8 z-[9999] bg-white rounded-lg shadow-2xl p-4 max-w-sm">
          <div className="flex items-center space-x-3">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-700">
              {location.pathname === '/control-room' && currentStepData?.expandSection 
                ? 'Expanding section...' 
                : 'Loading tour step...'}
            </span>
          </div>
        </div>
      )}

      {/* Tour UI - only render when active and on correct page */}
      {isActive && isOnCorrectPage && currentStepData && (
        <>
          {/* Dark overlay */}
          <div className="fixed inset-0 bg-black/25 z-[9997]" />

          {/* Spotlight highlight */}
          <div style={getSpotlightStyle()} />

          {/* Tour tooltip */}
          <div
            ref={tooltipRef}
            className="fixed z-[9999] bg-white rounded-lg shadow-2xl p-6 max-w-md animate-in fade-in duration-300"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
            }}
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Skip tour"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="pr-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {currentStepData.title}
              </h3>
              
              {/* Video for welcome step */}
              {currentStepData.hasVideo && (
                <div className="mb-4">
                  {currentStepData.videoUrl.includes('youtube.com') || currentStepData.videoUrl.includes('youtu.be') ? (
                    <iframe 
                      className="w-full rounded-lg shadow-sm"
                      height="200"
                      src={currentStepData.videoUrl}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="SurFox Product Tour"
                    />
                  ) : (
                    <video 
                      className="w-full rounded-lg shadow-sm"
                      controls
                      autoPlay
                      muted
                      style={{ maxHeight: '200px' }}
                    >
                      <source src={currentStepData.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              )}
              
              <p className="text-gray-600 leading-relaxed">
                {currentStepData.content}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between">
              {/* Progress dots */}
              <div className="flex items-center space-x-1">
                {tourSteps.map((_, index) => (
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
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}
                
                {!currentStepData.isLastStep && currentStep < tourSteps.length - 1 && (
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
                  <span>
                    {currentStepData.isLastStep || currentStep === tourSteps.length - 1 
                      ? 'Finish Tour' 
                      : 'Next'
                    }
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

// Export function to start tour from anywhere
export const startProductTour = () => {
  sessionStorage.setItem('start_product_tour', 'true');
  window.location.reload();
};

export default ProductTour;