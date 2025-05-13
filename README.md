# REI-CRM

A lightweight, AI-enhanced CRM built for real estate wholesalers. This system automates lead tracking, SMS outreach, and AI-driven qualification using Airtable, React, Node.js, and Twilio.

---

## 🚀 Features

- ✅ Campaign-level segmentation
- ✅ AI-powered lead scoring
- ✅ Real-time SMS conversation history
- ✅ Status progression and transition tracking
- ✅ Bulk CSV uploads with deduplication
- ✅ Visual analytics dashboard
- ✅ Fully backed by Airtable

---

## 📦 Daily Backup Routine (for GitHub)

To back up your REI-CRM each night:

```bash
git add .
git commit -m "Nightly backup - YYYY-MM-DD"
git push

---
This is Air Table Properties Table structure
Field Name	Field Type	
Property ID	autoNumber	
Property Address	singleLineText	
Owner Name	singleLineText	
Owner Contact	singleLineText	
Property Type	singleSelect	
Bedrooms	singleLineText	
Bathrooms	singleLineText	
Square Footage	singleLineText	
Lot Size	number	
Year Built	number	
Follow Ups	multipleRecordLinks	
Phone	singleLineText	
Email	email	
Status	singleLineText	
AI Status	multilineText	
MAO	currency	
Messages	multipleRecordLinks	
Created Time	createdTime	
Last Contacted	lastModifiedTime	
Disqualified Date	dateTime	
Notes	singleLineText	
Opt-Out Reason	singleLineText	
Conversation Step	number	
Conversation History	multilineText	
Handoff Triggered	checkbox	
AI Conversation Enabled	checkbox	
Last AI Message	multilineText	
City	singleLineText	
State	singleLineText	
Zip Code	singleLineText	
Campaign	singleLineText	
Status History	multilineText


---
This is Air Table Messages Table structure

Field Name	Field Type
Message ID	autoNumber	
Property	multipleRecordLinks	
Direction	singleLineText	
Message Body	multilineText	
Sender	singleLineText	
Response Score	number	
Action Taken	singleLineText	
OMNI Channel	singleLineText	
Timestamp	dateTime	
Phone	singleLineText	
