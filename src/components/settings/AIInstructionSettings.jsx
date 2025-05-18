import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import Button from '../ui/button';

export default function AllinstructionsSettings() {
  const [tone, setTone] = useState('');
  const [persona, setPersona] = useState('');
  const [industry, setIndustry] = useState('');
  const [savedTone, setSavedTone] = useState('');
  const [savedPersona, setSavedPersona] = useState('');
  const [savedIndustry, setSavedIndustry] = useState('');
  const [saving, setSaving] = useState(false);

  const toneOptions = [
    'Friendly & Casual',
    'Assertive & Confident',
    'Aggressive & Bold',
    'Neutral & Professional',
    'Empathetic & Supportive'
  ];

  const personaOptions = [
    'Icebreaker / Intro',
    'Nurturer',
    'Appointment Setter',
    'Closer',
    'Qualifier',
    'FAQ Assistant'
  ];

  const industryOptions = [
    'Real Estate: Wholesaling',
    'Real Estate: Retail Agent',
    'Home Services: Contractor Follow-Up',
    'Auto Sales: Internet Lead',
    'Financial Services: Appointment Setter',
    'General: SMS Responder'
  ];

  useEffect(() => {
    axios.get('/api/settings')
      .then(res => {
        const bundle = res.data.AIInstructionBundle?.value || '';
        const parsedTone = extractLine(bundle, 'TONE');
        const parsedPersona = extractLine(bundle, 'PERSONA');
        const parsedIndustry = extractLine(bundle, 'USE CASE');
        setTone(parsedTone);
        setPersona(parsedPersona);
        setIndustry(parsedIndustry);
        setSavedTone(parsedTone);
        setSavedPersona(parsedPersona);
        setSavedIndustry(parsedIndustry);
      })
      .catch(err => {
        console.error('Failed to load instructions:', err);
      });
  }, []);

  const extractLine = (bundle, label) => {
    const regex = new RegExp(`${label}:\\s*(.+)`);
    const match = bundle.match(regex);
    return match ? match[1].trim() : '';
  };

  const buildBundle = () => {
    return (
`You are writing SMS messages on behalf of Tom, a local real estate buyer. Your job is to sound like a real human — warm, conversational, and respectful.

Follow ALL of these behavioral rules exactly:

TONE: ${tone}
${toneDescription(tone)}

PERSONA: ${persona}
${personaDescription(persona)}

USE CASE: ${industry}
${industryDescription(industry)}

=== DIALOG STYLE TO FOLLOW ===
User: I'm not sure I want to sell.
AI: No problem. I just want to learn a bit about your situation. Totally up to you.

=== REQUIRED OPENING STRUCTURE ===
- Start by introducing yourself briefly (e.g., "I’m a local real estate buyer")
- Mention the property address in a natural, specific way
- Ask if they’ve ever thought about selling — keep it low-pressure and open-ended
- End with something casual like "Totally fine if not" or "Just wanted to reach out directly"
- Avoid sales language or over-promising. Do not use "cash," "fast close," or "no fees" in the first message.

Now write a first-contact SMS message to a property owner. Keep it under 320 characters. Follow all the above rules and sound natural, respectful, and human.`
    );
  };

  const toneDescription = (tone) => {
    const map = {
      'Friendly & Casual': 'Use casual contractions (“I’m,” “you’ll”), emojis where helpful, and sound like someone texting a neighbor. Keep the tone light, helpful, and non-corporate. Avoid hard selling.',
      'Assertive & Confident': 'Speak with certainty. Use short, confident sentences. Eliminate softeners like “maybe” or “just.” Emphasize the value of the offer and include one strong call to action.',
      'Aggressive & Bold': 'Be direct and urgent. Use all caps for emphasis (CASH, TODAY, FAST). Push the lead to respond immediately. Create urgency by mentioning limited time or unique opportunity. No fluff.',
      'Neutral & Professional': 'Be concise, polite, and businesslike. No emojis, no slang. Use full sentences and proper grammar. Avoid emotion. Prioritize clarity and professionalism.',
      'Empathetic & Supportive': 'Be gentle and human. Assume the lead might be stressed or uncertain. Say things like “no pressure,” “totally your decision,” or “I’m here to help if you need it.” Show you care more than you sell.'
    };
    return map[tone] || '';
  };

  const personaDescription = (persona) => {
    const map = {
      'Icebreaker / Intro': 'You are not trying to sell yet. Your only goal is to open a conversation and make it feel safe. Ask a soft, curious question like “Would it make sense to connect?” or “Have you considered selling?”',
      'Nurturer': 'You are warm and patient. Assume the lead needs time and trust. Ask an open-ended question and let them feel heard. Do not pressure or close.',
      'Appointment Setter': 'Your goal is to get them to schedule a call. Say something like “Can I share more details in a quick 5-minute call?” or “Would a quick chat work better?” Always include a next step.',
      'Closer': 'You are selling. Be firm and clear. Use bold action language like “Let’s make this happen today” or “This is your best shot.” Eliminate hesitation.',
      'Qualifier': 'You are filtering leads. Ask one targeted question like “Are you hoping to sell within the next 30 days?” Keep it direct and efficient.',
      'FAQ Assistant': 'You’re responding to questions or concerns. Be clear and informative. Start with “Good question,” “Here’s how it works,” or “Let me explain…” Avoid pushy language.'
    };
    return map[persona] || '';
  };

  const industryDescription = (industry) => {
    const map = {
      'Real Estate: Wholesaling': 'You are a real estate investor buying off-market homes for cash. You specialize in fast closings and minimal hassle. You’re not a realtor — you’re making a direct offer.',
      'Real Estate: Retail Agent': 'You are a licensed real estate agent helping clients list their homes. Your language is informative, compliant, and emphasizes the benefits of professional listing support.',
      'Home Services: Contractor Follow-Up': 'You are reaching out on behalf of a contractor to follow up on a project inquiry. Your tone is professional, efficient, and confident.',
      'Auto Sales: Internet Lead': 'You are a dealership or sales rep following up on a car inquiry. Be transactional and concise. Focus on availability, price, and getting them to respond.',
      'Financial Services: Appointment Setter': 'You are reaching out to schedule a short intro call with a financial advisor. Your tone is trustworthy, low-pressure, and focused on booking the meeting.',
      'General: SMS Responder': 'You are replying to leads who filled out a web form or texted in. Keep the tone open and engaging. Your goal is to spark conversation and qualify interest.'
    };
    return map[industry] || '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fullInstructions = buildBundle();
      await axios.put('/api/settings', {
        AIInstructionBundle: { value: fullInstructions }
      });
      setSavedTone(tone);
      setSavedPersona(persona);
      setSavedIndustry(industry);
    } catch (err) {
      console.error('Failed to save instructions:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
           <div>
        <Label>Tone / Style</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
        >
          <option value="">Select tone</option>
          {toneOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>Persona / Intent</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
        >
          <option value="">Select persona</option>
          {personaOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>Industry Profile / Use Case</Label>
        <select
          className="w-full border rounded px-3 py-2"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          <option value="">Select use case</option>
          {industryOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>


      <Button onClick={handleSave} disabled={saving} className="mt-4">
        {saving ? 'Saving...' : 'Save Instructions'}
      </Button>
    </div>
  );
}
