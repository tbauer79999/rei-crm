import React, { useState, useMemo } from 'react';

// Import tab components
import GettingStarted from '../help/tabs/GettingStarted';
import LeadManagement from '../help/tabs/LeadManagement';
import Campaigns from '../help/tabs/Campaigns';
import AIFeatures from '../help/tabs/AIFeatures';
import Analytics from '../help/tabs/Analytics';
import Settings from '../help/tabs/Settings';
import Integrations from '../help/tabs/Integrations';
import Troubleshooting from '../help/tabs/Troubleshooting';

// Search Bar Component
const SearchBar = ({ searchTerm, onSearchChange, showingResults, onClearSearch }) => {
  return (
    <section className="bg-white py-8 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto max-w-4xl px-5">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for help articles, features, or tutorials..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full py-4 px-4 pr-12 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl">
            🔍
          </span>
          {showingResults && (
            <button
              onClick={onClearSearch}
              className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

// Search Results Component
const SearchResults = ({ searchTerm, searchResults, onViewInTab }) => {
  // Content snippets for search results
  const contentSnippets = {
    'getting-started': [
      {
        title: "Platform Overview & Setup",
        snippet: "Complete platform setup guide covering settings configuration, A2P registration, phone numbers, team setup, and AI configuration. Get started with your first campaign creation.",
        section: "Initial Setup"
      },
      {
        title: "Settings-First Approach",
        snippet: "Critical: Complete A2P brand registration first. Without registration, messages won't be delivered. Set up company information, phone numbers, and team configuration.",
        section: "Configuration Guide"
      },
      {
        title: "Complete Setup Checklist",
        snippet: "Follow our proven setup sequence: A2P registration → Company info → Phone numbers → Team setup → AI configuration → Knowledge base → Test campaign.",
        section: "Setup Process"
      }
    ],
    'lead-management': [
      {
        title: "Lead Status System",
        snippet: "Understanding lead statuses: Hot (high engagement), Engaging (active conversations), Responding (initial contact), Cold (low engagement). AI scoring system uses 0-100 scale.",
        section: "Lead Scoring"
      },
      {
        title: "Bulk Lead Import",
        snippet: "Import leads via CSV with required format: phone numbers, names, campaign assignment. Supports custom fields for real estate, staffing, and B2B sales industries.",
        section: "Data Import"
      },
      {
        title: "Conversation Management",
        snippet: "View real-time conversations with sentiment analysis, engagement metrics, and lead score tracking. Monitor AI performance and manual intervention options.",
        section: "Conversation Tools"
      }
    ],
    'campaigns': [
      {
        title: "Campaign Creation Guide",
        snippet: "Step-by-step campaign setup: define goals, configure AI personality (professional/friendly/casual), assign phone numbers, set escalation rules, and launch settings.",
        section: "Campaign Setup"
      },
      {
        title: "AI Personality Configuration",
        snippet: "Choose AI personality to match your audience: Professional (formal, business-focused), Friendly (warm, approachable), Casual (conversational, relaxed).",
        section: "AI Configuration"
      },
      {
        title: "Performance Optimization",
        snippet: "Monitor key metrics: response rate, conversation depth, hot lead conversion. Use A/B testing to optimize messaging and improve campaign performance.",
        section: "Optimization"
      }
    ],
    'ai-features': [
      {
        title: "AI Engine Capabilities",
        snippet: "Natural language processing, real-time analysis, smart escalation, knowledge integration. AI understands context, intent, and nuance in conversations.",
        section: "Core AI"
      },
      {
        title: "Conversation Intelligence",
        snippet: "Every message analyzed for sentiment, urgency, buying signals, and objections. Scores update instantly to identify hot leads the moment they show interest.",
        section: "Analysis Tools"
      },
      {
        title: "A/B Testing Framework",
        snippet: "Test opening messages, AI tone variations, follow-up timing, message sequences, and value propositions. Scientific precision for conversation optimization.",
        section: "Testing Tools"
      }
    ],
    'analytics': [
      {
        title: "Real-time Dashboard",
        snippet: "Monitor system health, hot lead tracking, AI performance metrics, and campaign analytics. Get instant visibility into lead engagement and conversion rates.",
        section: "Dashboard"
      },
      {
        title: "ROI & Revenue Analytics",
        snippet: "Track lead source costs, revenue analysis, sales team performance, and conversion metrics. Measure hot leads received, converted, and average deal size.",
        section: "Revenue Tracking"
      },
      {
        title: "AI Performance Analysis",
        snippet: "Analyze AI confidence vs outcomes, message effectiveness, optimal timing, and campaign comparison metrics. Optimize AI performance with data-driven insights.",
        section: "AI Analytics"
      }
    ],
    'settings': [
      {
        title: "A2P Brand Registration",
        snippet: "CRITICAL: Complete A2P brand and campaign registry before sending messages. Business texting requires carrier-approved registration including EIN, business info, and use case.",
        section: "Compliance"
      },
      {
        title: "Company Information Setup",
        snippet: "Configure company details, business hours, time zone, industry type. Set messaging communication settings including throttle limits and response delays.",
        section: "Company Setup"
      },
      {
        title: "Sales Team Configuration",
        snippet: "Add team members, assign roles (sales user/manager/admin), configure notifications, set availability, and establish hot lead routing rules for optimal distribution.",
        section: "Team Management"
      }
    ],
    'integrations': [
      {
        title: "Current Integration Methods",
        snippet: "CSV import/export, email notifications, SMS alerts, webhook events. Connect your AI texting platform with existing CRM and sales tools.",
        section: "Available Integrations"
      },
      {
        title: "CRM Synchronization Workflow",
        snippet: "Export leads from CRM, import to AI platform, AI engages and qualifies leads, export hot leads back to CRM with updated status and engagement data.",
        section: "Workflow Setup"
      },
      {
        title: "Future Integration Roadmap",
        snippet: "Coming 2024: Native CRM integrations (Salesforce, HubSpot), Zapier app, full REST API, webhook support, and bi-directional sync capabilities.",
        section: "Roadmap"
      }
    ],
    'troubleshooting': [
      {
        title: "AI Not Sending Messages",
        snippet: "Check campaign status (active), AI turned ON, phone number assigned and verified, leads within business hours, message throttle limits not exceeded.",
        section: "Critical Issues"
      },
      {
        title: "Hot Leads Not Detected",
        snippet: "Review escalation thresholds (lower to 70% temporarily), check AI personality match with audience, ensure follow-up messages enabled, run A/B tests.",
        section: "Lead Detection"
      },
      {
        title: "High Unsubscribe Rate",
        snippet: "If >3% unsubscribe rate: pause campaign, review opening message (too aggressive?), verify lead consent source, reduce follow-up frequency, test friendlier approach.",
        section: "Performance Issues"
      }
    ]
  };

  const highlightText = (text, searchTerm) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <mark key={index} className="bg-yellow-200 font-medium">{part}</mark> : 
        part
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Results Header */}
      <div className="bg-white border-b border-gray-200 py-6">
        <div className="container mx-auto max-w-4xl px-5">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Search Results for "{searchTerm}"
          </h2>
          <p className="text-gray-600">
            Found {Object.values(searchResults).reduce((a, b) => a + b, 0)} matches across{' '}
            {Object.keys(searchResults).length} sections
          </p>
        </div>
      </div>

      {/* Search Results List */}
      <div className="container mx-auto max-w-4xl px-5 py-8">
        <div className="space-y-6">
          {Object.entries(searchResults)
            .sort(([,a], [,b]) => b - a) // Sort by relevance (match count)
            .map(([tabId, matchCount]) => {
              const tabNames = {
                'getting-started': 'Getting Started',
                'lead-management': 'Lead Management',
                'campaigns': 'Campaigns',
                'ai-features': 'AI Features',
                'analytics': 'Analytics',
                'settings': 'Settings',
                'integrations': 'Integrations',
                'troubleshooting': 'Troubleshooting'
              };

              const snippets = contentSnippets[tabId] || [];
              const relevantSnippets = snippets.filter(snippet => 
                snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                snippet.snippet.toLowerCase().includes(searchTerm.toLowerCase())
              ).slice(0, 2); // Show top 2 most relevant

              return (
                <div key={tabId} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {tabNames[tabId]}
                      </h3>
                      <div className="flex items-center space-x-3">
                        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                          {matchCount} matches
                        </span>
                        <button
                          onClick={() => onViewInTab(tabId)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                          View in {tabNames[tabId]}
                        </button>
                      </div>
                    </div>

                    {/* Show relevant snippets */}
                    <div className="space-y-4">
                      {relevantSnippets.length > 0 ? (
                        relevantSnippets.map((snippet, index) => (
                          <div key={index} className="border-l-4 border-indigo-200 pl-4">
                            <h4 className="font-medium text-gray-900 mb-1">
                              {highlightText(snippet.title, searchTerm)}
                            </h4>
                            <p className="text-gray-700 text-sm mb-1">
                              {highlightText(snippet.snippet, searchTerm)}
                            </p>
                            <span className="text-xs text-gray-500">
                              {snippet.section}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="border-l-4 border-gray-200 pl-4">
                          <p className="text-gray-700 text-sm">
                            Multiple references to "{searchTerm}" found in this section. 
                            Click "View in {tabNames[tabId]}" to see all content.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* No Results */}
        {Object.keys(searchResults).length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">
              Try searching with different keywords or check your spelling.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Tab Navigation Component (Updated)
const TabNavigation = ({ activeTab, onTabChange, isSearchMode, onBackToSearch }) => {
  const tabs = [
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'lead-management', label: 'Lead Management' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'ai-features', label: 'AI Features' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings', label: 'Settings' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'troubleshooting', label: 'Troubleshooting' }
  ];

  return (
    <nav className="bg-white py-4 border-b border-gray-200 mb-12">
      <div className="container mx-auto max-w-4xl px-5">
        {/* Back to Search Button */}
        {isSearchMode && (
          <div className="mb-4">
            <button
              onClick={onBackToSearch}
              className="flex items-center text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to search results
            </button>
          </div>
        )}

        <div className="flex gap-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                text-gray-600 no-underline py-2 px-4 border-b-2 border-transparent 
                whitespace-nowrap transition-all duration-300 font-medium
                hover:text-indigo-600 hover:border-indigo-600
                ${activeTab === tab.id ? 'text-indigo-600 border-indigo-600' : ''}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

// Main Help Center Component
const HelpCenter = () => {
  const [activeTab, setActiveTab] = useState('getting-started');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchFromTab, setSearchFromTab] = useState(null);

  // REAL SEARCH FUNCTIONALITY
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return {};
    
    const term = searchTerm.toLowerCase();
    const results = {};
    
    // Define comprehensive content for each tab to search through
    const tabContent = {
      'getting-started': `
        getting started platform overview complete settings first A2P registration brand campaign registry
        phone numbers team setup AI configuration knowledge base first week success plan
        day initial setup configuration company information purchase phone invite team configure AI
        upload test campaign creation monitor optimize scale operations train sales team reporting
        platform capabilities control room dashboard lead management AI conversation engine campaign management
        analytics insights system configuration training videos walkthrough setup guide mistakes avoid
        best practices week goals setup completion hot lead response rate conversion metrics
      `,
      'lead-management': `
        lead management complete guide pipeline heart platform managing tracking optimizing
        understanding lead statuses hot engaging responding cold unsubscribed status indicators
        AI lead scoring system proprietary algorithm 0-100 scale fire hot warm cold scoring
        factors influence response time frequency message length quality sentiment analysis
        buying signals urgency indicators engagement depth qualification signals
        bulk lead import guide preparing CSV file required format column requirements
        custom fields configuration real estate staffing B2B sales fields industry specific
        import best practices common errors phone numbers country codes campaign names headers
        advanced filtering search capabilities global search status filters campaign filters
        date range score-based filtering bulk actions export selected assign campaign update status
        understanding conversations conversation view features message timeline real-time scoring
        sentiment indicators engagement metrics lead score chart manual intervention options
        lead lifecycle management typical journey import first contact engagement hot lead sales handoff
        performance metrics response rate conversion qualification time follow-up window
        optimization daily management weekly tasks monitor review adjust clean data analyze rates
      `,
      'campaigns': `
        campaign management guide engine drives lead engagement master creation optimization
        campaign fundamentals 120 leads processed hour unlimited campaigns AI works 24/7
        dedicated phone number per campaign goals use cases qualify sellers recruit candidates
        book demos lead nurture follow-up sequence appointment setting AI approach success metrics
        phone number management requirements one number per campaign local area codes
        number porting compliance built-in warming volume limits dedicated usage best practices
        AI personality configuration professional friendly casual custom personalities
        characteristics language terminology value propositions time constraints industry specific
        campaign creation step-by-step basics description goal color AI configuration
        personality response speed escalation rules resources assignment phone number
        sales team routing tags launch settings pro move paused state upload leads
        campaign control panel states explained active AI on paused archived
        real-time metrics total leads messages sent response rate hot leads processing limits
        performance optimization key indicators initial response conversation depth
        hot lead conversion speed sales acceptance rate benchmarks warning signs
        average excellent performance optimization checklist A/B tests review conversations
        advanced strategies scaling vertical horizontal geographic lifecycle management
        launch growth maturity phases success formula quality leads smart AI setup
        rapid testing sales alignment troubleshooting common issues low response rates
        no hot leads high unsubscribe rate quick fixes improve generate reduce
      `,
      'ai-features': `
        AI engine deep dive understanding how AI works optimize performance natural language processing
        real-time analysis smart escalation knowledge integration continuous learning compliance built-in
        conversation intelligence analyzes every message sentiment score urgency detection
        hesitation indicators qualification signals engagement depth measures emotional tone
        time-sensitive language uncertainty phrases budget mentions timeline discussions
        AI response strategies lead behavior short minimal responses asking specific questions
        expressing concerns high interest signals going cold delayed responses
        A/B testing mastery framework optimize conversations scientific precision
        opening messages AI tone variations follow-up timing message sequences value propositions
        testing guidelines one variable time sufficient sample size run full cycle
        document everything apply learnings understanding test results confidence levels
        statistically significant winner trending insufficient data
        AI instructions customization creating custom behaviors industry-specific templates
        real estate investor staffing recruiting B2B SaaS templates objection handling
        escalation triggers specific phrases question patterns engagement level information provided
        advanced AI behaviors train handle common objections too expensive not interested
        already have solution define when mark leads hot
        knowledge base management what upload company overview product service details
        FAQs case studies process documents formatting best practices update quarterly
        keep concise bullet points include internal notes test after upload
        AI performance monitoring key indicators message understanding response time
        accuracy rate escalation rate quality monitoring weekly review checklist
        optimization triggers response rate drops hot lead rate falls quality issues
        system tools maintenance data export options conversation export analytics export
        billing export API access coming soon backup best practices daily weekly monthly quarterly
        AI future roadmap Q2 Q3 Q4 2024 voice conversation capabilities multi-language support
        advanced sentiment analysis predictive lead scoring custom model training
        industry-specific variants objection handling conversation coaching mode
        AI-generated follow-up sequences cross-platform sync advanced personalization GPT-5 integration
      `,
      'analytics': `
        analytics intelligence platform transform lead engagement data actionable insights
        real-time visibility AI-powered outreach dashboard hierarchy pipeline control room
        AI strategy hub business analytics enterprise view multi-tenant overview
        system health indicators overview health panel hot lead handoff tracking
        lead journey funnel AI optimization metrics system performance message delivery
        hot lead response system uptime error rate warning thresholds performance alerts
        AI strategy hub admin only deep analytics optimizing AI performance
        overview reports macro conversion funnel historical performance trends
        AI performance analysis confidence vs outcome message effectiveness optimal timing
        campaign comparison metrics shows use case persona performance
        ROI revenue analytics lead source cost analysis revenue analysis
        sales team performance hot leads received converted average deal size response time win rate
        A/B testing analytics understanding test results confidence levels what can test
        best practices success metrics response rate improvement hot lead conversion
        conversation depth increase unsubscribe rate reduction sales acceptance rate
        using analytics optimization weekly review checklist Monday morning review process
        check control room review hot leads analyze funnel campaign performance
        A/B test results sales feedback action items key performance benchmarks
        poor average excellent initial response lead to hot hot lead to sale
        cost per hot lead sales response time analytics pro tip export data
        business analytics reporting executive dashboard metrics custom reporting options
        available report types campaign performance sales team lead source analysis
        AI optimization report scheduling daily weekly monthly custom reports
        data export integration export options lead export conversation export
        analytics export billing export current integrations manual CSV email notifications
        scheduled exports custom date range coming soon REST API webhook notifications
        native CRM integrations business intelligence connectors data management best practices
        regular exports analysis tips advanced analytics features predictive analytics
        cohort analysis attribution modeling analytics limits considerations
        historical data retention real-time updates custom report generation large data exports
      `,
      'settings': `
        settings complete guide master platform configuration maximize performance smooth operations
        company information A2P brand campaign registry messaging communication phone numbers
        sales team AI automation AI instruction hub knowledge base system tools
        CRITICAL A2P brand campaign registry must complete first without registration messages not delivered
        business texting requires carrier-approved registration brand registration what you need
        business legal name EIN tax ID business address phone website URL industry classification
        registration process go settings A2P registry register new brand complete brand form
        pay registration fee wait approval common brand registration mistakes
        campaign registration one campaign per use case campaign information required
        description message flow sample messages opt-in method opt-out help keywords
        pre-built campaign templates real estate lead follow-up B2B demo booking
        staffing recruitment customer support A2P status monitoring registration dashboard
        approved pending rejected required documentation business license insurance certificate
        website screenshots sample opt-in forms company information settings basic details
        required fields company name industry type business hours time zone website
        optional recommended description unique value proposition target customer company size
        business hours matter AI never texts outside configured hours
        messaging communication settings critical controls message throttle response delay
        conversation limit follow-up attempts timing defaults impact recommendations
        messaging best practices start conservative throttles random delays longer delays
        test settings monitor unsubscribe rates phone number management strategy
        local vs toll-free number rotation dedicated vs shared number warming
        compliance requirements only text consented numbers honor opt-outs immediately
        include business identification respect quiet hours maintain consent records
        sales team configuration team setup process adding team members send invitation
        assign role sales user manager admin configure notifications email alerts SMS
        in-app daily summary set availability vacation days working hours capacity limits
        hot lead routing rules round robin performance-based skill-based geographic campaign-specific
        routing priority campaign assignment skill tag matching availability status
        current workload performance score AI automation settings escalation thresholds
        configure when leads marked hot handed sales lead score threshold sentiment threshold
        message count keyword triggers escalation rules auto-assignment re-engagement automation
        workflow triggers smart scheduling AI configuration tips start default thresholds
        review false positives different campaigns document changes sales team feedback
        AI instruction hub creating effective instructions instruction components base personality
        goals objectives conversation flow industry-specific templates real estate staffing
        B2B SaaS custom personalities how create tone style vocabulary example conversations
        dos don'ts test sample leads knowledge base management what upload essential documents
        company overview product service details FAQs case studies process documents
        best practices update quarterly keep concise bullet points internal notes test upload
        knowledge base formatting example company FAQ frequently asked questions
        about company how quickly close need repairs determine offer fees
        internal only typical offer minimum deal size avoid properties
        system tools maintenance data export options lead export conversation export
        analytics export billing export includes format use case API access coming soon
        backup best practices recommended schedule daily hot leads weekly all leads
        monthly complete system quarterly archive old conversations
        settings setup checklist complete these order A2P brand registration campaign registration
        company information purchase phone numbers add sales team configure AI settings
        upload knowledge base test everything ready launch once checkboxes complete
        ready import leads start first campaign
      `,
      'integrations': `
        integrations workflows connect AI texting platform existing tech stack seamless operations
        current integration methods CSV import export email notifications SMS alerts
        webhook events coming API access native integrations planned manual reliable
        real-time alerts instant text notifications urgent hot leads full programmatic access
        direct connections popular CRMs Salesforce HubSpot Pipedrive coming soon
        common integration workflows CRM synchronization workflow current manual process
        export leads from CRM map fields platform template import AI texting platform
        AI engages qualifies leads export hot leads daily import back CRM updated status
        automation tips scheduled exports spreadsheet tools field mapping import templates
        daily sync routines marketing automation integration lead flow architecture
        email campaign form submission AI texting hot lead CRM deal integration points
        form submissions auto-add web form integration email responders trigger SMS outreach
        lead scoring combine email SMS engagement suppression lists sync opt-outs all channels
        sales tool stack integration common sales stack connections calendar Calendly
        share booking links AI conversations dialer PowerDialer export hot lead phone numbers
        email sequences trigger based AI outcome proposal tools generate qualified lead data
        future integration roadmap coming 2024 native integrations major CRMs webhook support
        Zapier app full REST API planned integrations Salesforce bi-directional sync
        custom objects workflow triggers HubSpot contact sync deal creation timeline events
        Zapier 1000+ app connections custom workflows Slack hot lead alerts team notifications
        conversation summaries integration benefits current capabilities manual CSV import export
        email SMS notifications bulk data transfers lead source tracking team notification systems
        coming soon real-time CRM synchronization webhook event triggers API-driven integrations
        Zapier marketplace app native platform connections getting started integrations
        recommended first steps audit current tech stack map lead journey start CSV imports
        set up notifications plan API access current manual process automation tips
        integration points CRM synchronization marketing automation sales tool stack
        common sales stack connections tool type integration method data flow
        calendar dialer email sequences proposal tools business intelligence connectors
        data management best practices regular exports analysis tips
      `,
      'troubleshooting': `
        troubleshooting guide quick solutions common issues most problems resolved minutes
        critical issues immediate action required AI not sending any messages impact
        no lead engagement potential revenue loss diagnostic steps check campaign status
        active AI turned ON verify phone number assigned active verified review lead status
        assigned campaign check time settings within business hours message throttle
        hit daily hourly limits system health check control room red indicators
        quick fixes toggle campaign off on reset verify phone number texting yourself
        check settings messaging throttle limits ensure leads valid phone numbers country code
        hot leads not being detected common causes escalation threshold set too high
        AI personality mismatch audience campaign goal doesn't match lead intent
        conversations ending too early solutions review recent conversations leads showing interest
        lower threshold 70 temporarily monitor check AI asking qualifying questions
        ensure follow-up messages enabled run A/B test different approach
        high unsubscribe rate greater than 3% risk high unsubscribes damage sender reputation
        address immediately prevent delivery issues diagnostic questions opening message too aggressive
        texting outside business hours lead source quality poor frequency too high
        message content spammy misleading immediate actions pause campaign temporarily
        review soften opening message verify lead consent source quality reduce follow-up frequency
        A/B test friendlier approach common issues solutions CSV import failing
        error invalid file format save CSV not Excel UTF-8 encoding remove formulas formatting
        check hidden columns rows headers don't match download fresh template case-sensitive
        remove trailing spaces don't add remove columns invalid phone numbers
        include country code remove special characters format no extensions letters
        sales team not getting notifications check these settings team member status
        active available campaign assignment assigned specific member notification settings
        email SMS enabled profile email delivery check spam folder phone number
        correct number country code test notification system create test lead manually mark hot
        AI giving incorrect information root causes outdated knowledge base documents
        conflicting information multiple docs AI instructions too vague no relevant info
        fix process review conversation identify incorrect info update knowledge base correct details
        add specific instructions prevent recurrence test asking AI same question monitor future
        poor AI conversation quality symptoms repetitive responses not answering questions directly
        too pushy passive losing conversation context optimization steps review AI personality
        match audience update instructions add examples good responses knowledge base
        comprehensive FAQ coverage A/B test different conversation styles human review
        sales team review provide feedback performance issues slow message delivery
        normal vs abnormal delays 5-30 second AI response delay configured
        1-2 minute delay high volume abnormal greater than 5 minute delays consistently
        messages arriving hours later troubleshooting check system metrics control room
        verify message throttle settings reduce active campaign count temporarily
        contact support delays persist dashboard loading slowly quick fixes
        clear browser cache cookies try different browser Chrome recommended
        reduce date range analytics views close unnecessary browser tabs
        check internet connection speed system performance benchmarks expected performance ranges
        poor average excellent initial response rate lead to hot hot lead to sale
        cost per hot lead sales response time system health indicators
        message delivery hot lead response system uptime error rate threshold
        diagnostic tools self-help self-diagnostic checklist all campaigns show active status
        phone numbers verified assigned A2P brand campaigns approved business hours configured
        sales team notifications enabled AI knowledge base uploaded test messages sent successfully
        health check tools control room dashboard message delivery logs AI performance metrics
        campaign analytics getting help support contact methods live chat support
        available Monday-Friday 9AM-6PM EST average response time 2 minutes
        email support response within 24 hours knowledge base search online help center
        training sessions weekly group training book 1-on-1 onboarding enterprise accounts
        emergency support critical issues business operations available 24/7 enterprise customers
        user community join Slack community connect other users share tips peer support
        pro tip contacting support include campaign ID example lead ID screenshot issue
        steps reproduce speeds resolution 80% emergency procedures critical system down
        compliance issue phone number suspended immediate actions assess scope impact
        stop pause affected systems notify stakeholders document timeline
        resolution process gather diagnostic information contact appropriate support
        implement workarounds monitor resolution incident response checklist
        prevention maintenance weekly maintenance checklist system health review error logs
        check message delivery rates monitor AI conversation quality verify phone number status
        data management backup lead database clean duplicate entries update knowledge base
        archive old conversations common prevention mistakes not monitoring unsubscribe rates
        ignoring carrier compliance updates skipping knowledge base updates
        not testing phone numbers regularly failing train new team members properly
      `
    };
    
    // Search through each tab's content and count matches
    Object.entries(tabContent).forEach(([tabId, content]) => {
      const contentWords = content.toLowerCase().split(/\s+/);
      const searchWords = term.split(/\s+/);
      
      let matches = 0;
      searchWords.forEach(searchWord => {
        if (searchWord.length >= 2) {
          const wordMatches = contentWords.filter(word => 
            word.includes(searchWord) || searchWord.includes(word)
          ).length;
          matches += wordMatches;
        }
      });
      
      if (matches > 0) {
        results[tabId] = matches;
      }
    });
    
    return results;
  }, [searchTerm]);

  const handleSearchChange = (term) => {
    setSearchTerm(term);
    if (term.length >= 2) {
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleViewInTab = (tabId) => {
    setActiveTab(tabId);
    setShowSearchResults(false);
    setSearchFromTab(searchTerm); // Remember we came from search
  };

  const handleBackToSearch = () => {
    setShowSearchResults(true);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setShowSearchResults(false);
    setSearchFromTab(null);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setShowSearchResults(false);
    setSearchFromTab(null); // Clear search context when manually switching tabs
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'getting-started':
        return <GettingStarted />;
      case 'lead-management':
        return <LeadManagement />;
      case 'campaigns':
        return <Campaigns />;
      case 'ai-features':
        return <AIFeatures />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      case 'integrations':
        return <Integrations />;
      case 'troubleshooting':
        return <Troubleshooting />;
      default:
        return <GettingStarted />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white py-12 text-center shadow-lg">
        <div className="container mx-auto max-w-4xl px-5">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            AI Lead Texting Platform Help Center
          </h1>
          <p className="text-xl md:text-2xl opacity-90">
            Master every feature of your AI-powered lead engagement system
          </p>
        </div>
      </header>

      {/* Search Bar */}
      <SearchBar 
        searchTerm={searchTerm} 
        onSearchChange={handleSearchChange}
        showingResults={showSearchResults || searchFromTab}
        onClearSearch={handleClearSearch}
      />

      {/* Show Search Results OR Tab Content */}
      {showSearchResults ? (
        <SearchResults 
          searchTerm={searchTerm}
          searchResults={searchResults}
          onViewInTab={handleViewInTab}
        />
      ) : (
        <>
          {/* Navigation */}
          <TabNavigation 
            activeTab={activeTab} 
            onTabChange={handleTabChange}
            isSearchMode={!!searchFromTab}
            onBackToSearch={handleBackToSearch}
          />

          {/* Main Content */}
          <main className="container mx-auto max-w-4xl px-5 pb-20">
            {/* Search Context Banner */}
            {searchFromTab && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">
                      Viewing results for "{searchFromTab}"
                    </h3>
                    <p className="text-blue-700 text-sm">
                      You're viewing this section based on your search. Use the button above to return to all search results.
                    </p>
                  </div>
                  <button
                    onClick={handleClearSearch}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Clear search
                  </button>
                </div>
              </div>
            )}

            {/* Tab Content */}
            <div className="content-section active animate-fadeIn">
              {renderTabContent()}
            </div>
          </main>
        </>
      )}

      {/* Add the CSS for animations and styling */}
      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          cursor: pointer;
          border: 2px solid transparent;
        }

        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: #667eea;
        }

        .card-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          font-size: 24px;
        }

        .card h3 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
          color: #2d3748;
        }

        .card p {
          color: #4a5568;
          line-height: 1.6;
        }

        .feature-section {
          background: white;
          border-radius: 12px;
          padding: 2.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .feature-section h2 {
          font-size: 1.75rem;
          margin-bottom: 1.5rem;
          color: #2d3748;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .process-flow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 2rem 0;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .process-step {
          flex: 1;
          text-align: center;
          position: relative;
          min-width: 150px;
        }

        .process-step:not(:last-child)::after {
          content: '→';
          position: absolute;
          right: -20px;
          top: 50%;
          transform: translateY(-50%);
          color: #cbd5e0;
          font-size: 1.5rem;
        }

        .process-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 0.5rem;
          color: white;
          font-size: 24px;
        }

        .process-label {
          font-weight: 600;
          color: #2d3748;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
        }

        .metric-card {
          background: #f7fafc;
          padding: 1.5rem;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 0.25rem;
        }

        .metric-label {
          color: #4a5568;
          font-size: 0.875rem;
        }

        .collapsible {
          background: white;
          border-radius: 8px;
          margin-bottom: 1rem;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .collapsible-header {
          padding: 1.25rem;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background-color 0.3s ease;
        }

        .collapsible-header:hover {
          background-color: #f7fafc;
        }

        .collapsible-header h3 {
          margin: 0;
          color: #2d3748;
          font-size: 1.1rem;
        }

        .collapsible-icon {
          transition: transform 0.3s ease;
          color: #a0aec0;
        }

        .rotate-180 {
          transform: rotate(180deg);
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }

        .data-table th,
        .data-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        .data-table th {
          background-color: #f7fafc;
          font-weight: 600;
          color: #2d3748;
        }

        .data-table tr:hover {
          background-color: #f7fafc;
        }

        .alert {
          padding: 1rem 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .alert-info {
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #93c5fd;
        }

        .alert-warning {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }

        .alert-success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #6ee7b7;
        }

        .alert-danger {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .best-practice {
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 8px;
          padding: 1.25rem;
          margin: 1rem 0;
        }

        .best-practice h4 {
          color: #166534;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .best-practice p {
          color: #166534;
          font-size: 0.95rem;
        }

        .warning-box {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 1.25rem;
          margin: 1rem 0;
        }

        .warning-box h4 {
          color: #92400e;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .warning-box p {
          color: #92400e;
          font-size: 0.95rem;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-hot {
          background: #fee2e2;
          color: #dc2626;
        }

        .status-engaging {
          background: #fed7aa;
          color: #ea580c;
        }

        .status-responding {
          background: #bbf7d0;
          color: #16a34a;
        }

        .status-cold {
          background: #dbeafe;
          color: #2563eb;
        }

        .feature-list {
          list-style: none;
          padding: 0;
        }

        .feature-list li {
          padding: 1rem 0;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .feature-list li:last-child {
          border-bottom: none;
        }

        .feature-icon {
          color: #667eea;
          flex-shrink: 0;
          margin-top: 0.25rem;
        }

        .feature-content h4 {
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
          color: #2d3748;
        }

        .feature-content p {
          color: #4a5568;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
};

export default HelpCenter;