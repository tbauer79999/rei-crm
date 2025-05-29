export async function fetchProperties() {
  const res = await fetch('http://localhost:5000/api/leads');
  if (!res.ok) throw new Error('Failed to fetch leads');
  return await res.json();
}

export async function fetchResponseTimeMetrics() {
  const res = await fetch('http://localhost:5000/api/response-time');
  if (!res.ok) throw new Error('Failed to fetch response time metrics');
  return await res.json();
}

export async function fetchMessageQualityMetrics() {
  const res = await fetch('http://localhost:5000/api/message-quality');
  if (!res.ok) throw new Error('Failed to fetch message quality metrics');
  return await res.json();
}

export async function fetchWeeklyMomentumMetrics() {
  const res = await fetch('http://localhost:5000/api/weekly-momentum');
  if (!res.ok) throw new Error('Failed to fetch weekly momentum metrics');
  return await res.json();
}

export async function fetchEscalationStats() {
  const res = await fetch('http://localhost:5000/api/escalation-stats');
  if (!res.ok) throw new Error('Failed to fetch escalation stats');
  return await res.json();
}

export async function fetchReplyPacingStats() {
  const res = await fetch('http://localhost:5000/api/reply-pacing');
  if (!res.ok) throw new Error('Failed to fetch reply pacing stats');
  return await res.json();
}

export async function fetchAIEfficiency() {
  const res = await fetch('http://localhost:5000/api/ai-efficiency');
  if (!res.ok) throw new Error('Failed to fetch AI efficiency');
  return await res.json();
}

export async function fetchAIvsHumanSplit() {
  const res = await fetch('http://localhost:5000/api/ai-vs-human');
  if (!res.ok) throw new Error('Failed to fetch AI vs Human split');
  return await res.json();
}

export async function fetchFailureRate() {
  const res = await fetch('http://localhost:5000/api/failure-rate');
  if (!res.ok) throw new Error('Failed to fetch failure rate');
  return await res.json();
}

export async function fetchConversationFlow() {
  const res = await fetch('http://localhost:5000/api/conversation-flow');
  if (!res.ok) throw new Error('Failed to fetch conversation flow');
  return await res.json();
}

export async function fetchLeadConversionSpeed() {
  const res = await fetch('http://localhost:5000/api/lead-conversion-speed');
  if (!res.ok) throw new Error('Failed to fetch lead conversion speed');
  return await res.json();
}
