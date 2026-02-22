# Lifestyle Plan Consultation - Interactive Doctor Experience

## Overview
Transformed the lifestyle plan generation from instant auto-generation to an interactive consultation experience where the AI acts as a caring doctor, asking questions and understanding the patient before creating personalized plans.

## Key Changes

### 1. Backend API Changes (`backend/app/api/lifestyle.py`)
- **Removed**: Direct plan generation endpoints (`/diet`, `/workout`)
- **Added**: Consultation endpoints (`/diet/consult`, `/workout/consult`)
- Creates new chat session for each consultation
- Returns `session_id` and `initial_message` to start conversation

### 2. Lifestyle Service (`backend/app/services/lifestyle_service.py`)
- **Added**: `start_plan_consultation()` - Initiates consultation with personalized questions
- **Added**: `generate_final_plan()` - Creates detailed plan after gathering information
- AI asks about:
  - Current eating habits / exercise routine
  - Dietary restrictions, allergies, preferences
  - Physical limitations, injuries, pain
  - Daily schedule and lifestyle
  - Goals and motivation

### 3. Chat API Enhancement (`backend/app/api/chat.py`)
- **Added**: Plan generation detection in chat flow
- Detects keywords: "generate", "create", "make", "ready", "final plan", "show me the plan"
- Automatically generates final plan when user is ready
- Uses full conversation context for personalized recommendations

### 4. Frontend Lifestyle Page (`frontend/src/pages/Lifestyle.jsx`)
- **Changed**: "Generate Plan" → "Start Consultation" buttons
- **Added**: Interactive consultation info with benefits list
- **Removed**: Direct plan display (now happens in chat)
- Redirects to chat with session parameter when consultation starts

### 5. Frontend Chat Page (`frontend/src/pages/Chat.jsx`)
- **Added**: URL parameter support (`?session=<session_id>`)
- Automatically loads consultation session when redirected from Lifestyle page
- Seamless transition from Lifestyle → Chat

### 6. API Service (`frontend/src/services/api.js`)
- **Added**: `startDietConsultation()` endpoint
- **Added**: `startWorkoutConsultation()` endpoint

## User Flow

### Before (Old Flow)
1. User clicks "Generate Plan"
2. System instantly creates generic plan
3. Plan displayed immediately (no personalization)

### After (New Flow)
1. User clicks "Start Consultation" on Lifestyle page
2. Redirected to Chat with new session
3. AI greets user and asks personalized questions:
   - "What do you typically eat for breakfast?"
   - "Do you have any food allergies or restrictions?"
   - "What's your daily schedule like?"
   - "Any injuries or physical limitations?"
4. User answers questions naturally in conversation
5. AI asks follow-up questions based on responses
6. When user says "I'm ready" or "generate the plan"
7. AI creates comprehensive personalized plan using:
   - User profile data
   - Lab values
   - Full conversation context
   - Specific preferences and limitations mentioned

## Benefits

### Personalization
- Plans based on actual lifestyle, not just profile data
- Considers real-world constraints (schedule, budget, preferences)
- Adapts to specific limitations and goals

### Engagement
- Feels like talking to a real doctor
- User feels heard and understood
- Builds trust and motivation

### Accuracy
- Gathers information that profile forms miss
- Clarifies ambiguous situations
- Ensures safety by understanding limitations

### Medical Quality
- Follows proper consultation protocol
- Asks relevant medical history questions
- Creates evidence-based recommendations
- Considers contraindications from conversation

## Technical Implementation

### Consultation Detection
```python
# In chat.py - detects when to generate final plan
plan_keywords = ["generate", "create", "make", "ready", "final plan"]
if any(keyword in message.lower() for keyword in plan_keywords):
    # Check if consultation session
    if "nutrition" in first_message or "fitness" in first_message:
        # Generate final plan with full context
```

### Context Integration
- **Profile Data**: Age, gender, weight, height, activity level
- **Lab Values**: Recent test results and status
- **Conversation**: Full Q&A history with user responses
- **Medical Conditions**: Known conditions, allergies, medications

### AI Prompting Strategy
1. **Consultation Start**: Warm greeting + 3-4 specific questions
2. **Follow-up**: Natural conversation flow based on responses
3. **Plan Generation**: Comprehensive plan using all gathered information

## Example Consultation

**AI**: "Hi! I'm excited to help you create a personalized nutrition plan. I've reviewed your profile and lab results. Let me ask you a few questions to make this plan perfect for you:

1. What does your typical daily eating schedule look like?
2. Are there any foods you absolutely love or can't stand?
3. Do you have time for meal prep, or do you need quick options?
4. Any specific health goals beyond what's in your profile?"

**User**: "I usually skip breakfast, eat lunch at my desk around 1pm, and have dinner with family at 7pm. I love pasta but trying to eat healthier. No time for meal prep during weekdays. Want to lower my cholesterol."

**AI**: "Thanks for sharing! I see your cholesterol is slightly elevated. A few more questions:
- Do you snack between meals?
- Any food allergies or restrictions?
- How do you feel about cooking on weekends for the week ahead?"

**User**: "I snack on chips a lot. No allergies. I could do some weekend cooking if it's not too complicated."

**AI**: "Perfect! I have everything I need. Ready for me to create your personalized plan?"

**User**: "Yes, generate the plan"

**AI**: *[Generates comprehensive 7-day meal plan with]:*
- Cholesterol-lowering foods
- Quick weekday meals
- Weekend meal prep guide
- Healthy snack alternatives
- Pasta recipes (healthier versions)
- Shopping list
- Portion guidance

## Future Enhancements
- Save generated plans to database
- Allow plan modifications through chat
- Track plan adherence
- Generate progress reports
- Adjust plans based on new lab results
