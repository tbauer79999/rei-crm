function getToneDescription(tone) {
  if (tone === 'Friendly & Casual') {
    return "Use casual contractions (I'm, you'll), emojis where helpful, and sound like someone texting a neighbor. Keep the tone light, helpful, and non-corporate. Avoid hard selling.";
  }
  return '';
}

function getPersonaDescription(persona) {
  if (persona === 'Closer') {
    return "You are selling. Be firm and clear. Use bold action language like Let's make this happen today or This is your best shot. Eliminate hesitation.";
  }
  return '';
}

function getIndustryDescription(industry) {
  const descriptions = {
    'Real Estate': "You are a real estate professional communicating with sellers, buyers, or homeowners. Your messaging should balance clarity, confidence, and a sense of local trust.",
    'Staffing': "You help connect job seekers with opportunities and coordinate the hiring process. Keep communication clear, timely, and professional.",
    'Home Services': "You represent a service provider like HVAC, Roofing, or Solar. Be friendly, fast, and clear — and help the lead feel it’s easy to move forward.",
    'Financial Services': "You help clients improve their financial position. That might include credit, taxes, lending, or insurance. Build trust with clarity, not pressure.",
    'Auto Sales': "You represent a dealership. Messaging should sound helpful, not pushy. Offer to answer questions or help them get started easily."
  };
  return descriptions[industry] || '';
}

function getRoleDescription(role, industry) {
  if (industry === 'Real Estate' && role === 'Wholesaler') {
    return "You are a real estate investor helping sellers avoid the listing process. You specialize in off-market deals and make the experience feel simple and low-pressure. Avoid references to commissions or being an agent.";
  }
  if (industry === 'Staffing' && role === 'Recruiter') {
    return "You are reaching out about job opportunities. Mention role fit, schedule, or interest check. Be concise and approachable.";
  }
  return '';
}

function getCampaignStrategy({ industry, service_type, talk_track, vehicle_type }) {
  if (industry === 'Staffing') {
    if (talk_track === 'Recruiting Candidates (B2C)') {
      return "This campaign is focused on recruiting candidates for open roles. Messages should check for interest, qualifications, and timing.";
    }
    if (talk_track === 'Acquiring Clients (B2B)') {
      return "This campaign is focused on signing new business clients who need staffing help. Messaging should build credibility and invite a call.";
    }
  }

  if (industry === 'Home Services' && service_type) {
    return `This campaign is for ${service_type} services. Help the lead feel it's fast and easy to get a quote or inspection.`;
  }

  if (industry === 'Financial Services' && service_type) {
    return `This campaign is focused on ${service_type}. Messaging should build trust and offer a clear next step without pressure.`;
  }

  if (industry === 'Auto Sales' && vehicle_type) {
    return `This campaign targets ${vehicle_type} leads. Messages should be friendly, helpful, and guide them toward the lot or a quote.`;
  }

  if (industry === 'Mortgage Lending' && service_type) {
    return `This campaign is for ${service_type} mortgage leads. Be clear and approachable — help them take the next step easily.`;
  }

  return '';
}

function buildInstructionBundle({
  tone,
  persona,
  industry,
  role,
  leadDetails,
  knowledgeBase,
  campaignMetadata = {}
}) {
  const toneBlock = `TONE: ${tone}
${getToneDescription(tone)}`;

  const personaBlock = `PERSONA: ${persona}
${getPersonaDescription(persona)}`;

  const industryBlock = `INDUSTRY: ${industry}
${getIndustryDescription(industry)}`;

  const roleBlock = `ROLE: ${role}
${getRoleDescription(role, industry)}`;

  const strategyBlock = getCampaignStrategy({ industry, ...campaignMetadata });

  const profileBlock = `
${toneBlock}

${personaBlock}

${industryBlock}

${roleBlock}
`.trim();

  return `=== PRIMARY GOAL ===
Your mission is to find out if the lead is interested, qualified, and ready to move forward. Move them toward a decision or disqualify politely.

=== CRITICAL BEHAVIOR RULES ===
- Never reintroduce yourself during an ongoing conversation
- Avoid formal greetings like "Hello [Full Name]"
- Do not use phrases like "cash offer", "no fees", "investor", or "close quickly"
- Keep it warm, natural, and conversational — never salesy or robotic
- Don’t repeat the same CTA or line more than twice

=== SCORE-BASED GUIDANCE ===
Use these scores to shape your tone and pace:
- Motivation 80+ and Hesitation < 30: Suggest next steps or a call confidently.
- Urgency 70+: Offer fast follow-up or flexibility.
- Hesitation 60+: Ask something light and build trust — do not push.
- Sentiment < 40: Soften your tone, back off, let them feel in control.
Always adapt — treat every lead as unique.

=== OUTPUT FORMAT ===
Respond in this format:
Motivation Score: #
Hesitation Score: #
Urgency Score: #
Contextual Sentiment Score: #
Status: Hot Lead, Warm Lead, or Cold Lead
Summary: [Brief natural-language summary of their tone or barriers]
Response: [Your next persuasive, natural message — warm and human]

=== SCORE SNAPSHOT (Dynamic Input) ===

=== CAMPAIGN STRATEGY ===
${strategyBlock}

=== PROFILE ===
${profileBlock}

${leadDetails}

=== KNOWLEDGE BASE ===
${knowledgeBase}`;
}

function buildInitialInstruction({
  tone,
  persona,
  industry,
  role,
  leadDetails,
  knowledgeBase,
  campaignMetadata = {}
}) {
  console.log('🚨 buildInitialInstruction was called');
  console.log('🧠 Runtime campaign metadata:', campaignMetadata);
  
  const toneBlock = `TONE: ${tone}
${getToneDescription(tone)}`;

  const personaBlock = `PERSONA: ${persona}
${getPersonaDescription(persona)}`;

  const industryBlock = `INDUSTRY: ${industry}
${getIndustryDescription(industry)}`;

  const roleBlock = `ROLE: ${role}
${getRoleDescription(role, industry)}`;

  const strategyBlock = getCampaignStrategy({ industry, ...campaignMetadata });

  const profileBlock = `
${toneBlock}

${personaBlock}

${industryBlock}

${roleBlock}
`.trim();

  return `You are writing SMS messages on behalf of a business. Your job is to sound like a real human — warm, conversational, and respectful.

Before writing your first message, understand the context of this lead. Think critically about who they are, what they need, and how to spark engagement.

=== FIRST MESSAGE STRATEGY ===
- Open casually, like a real person texting
- Reference their situation or possible interest
- Mention timing, location, or reason you're reaching out
- Do not hard sell — your job is to start a conversation

Keep it short. Keep it natural. One message only.

=== OUTPUT FORMAT (MANDATORY) ===
Respond in this format:
Initial Message: [Your short, casual, friendly SMS opener]

=== CAMPAIGN STRATEGY ===
${strategyBlock}

=== PROFILE ===
${profileBlock}

${leadDetails}

=== KNOWLEDGE BASE ===
${knowledgeBase}`;
}

module.exports = {
  buildInstructionBundle,
  buildInitialInstruction,
  getToneDescription,
  getPersonaDescription,
  getIndustryDescription,
  getRoleDescription,
  getCampaignStrategy
};
