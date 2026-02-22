# Healthora Project - Detailed File Analysis Report

## Project Overview
Healthora is an AI-powered healthcare assistant platform with a FastAPI backend and React frontend. It provides medical report analysis, health chat, lifestyle planning, and medical reasoning capabilities.

---

## BACKEND ARCHITECTURE

### 1. Main Application Entry Point

#### `backend/app/main.py`
**Purpose**: FastAPI application initialization and routing setup

**How it works**:
- Creates FastAPI app instance with title "Healthora API"
- Configures CORS middleware to allow cross-origin requests from frontend
- Registers all API routers (users, chat, medical, reports, profile, lifestyle, auth)
- Defines startup event that creates all database tables
- Provides root endpoint returning status message

**Key Components**:
- CORS allows all origins (should be restricted in production)
- Database tables auto-created on startup
- Modular router architecture for clean separation

---

### 2. Configuration Management

#### `backend/app/config.py`
**Purpose**: Centralized configuration using environment variables

**How it works**:
- Loads `.env` file using `python-dotenv`
- Settings class reads environment variables:
  - `DATABASE_URL`: SQLite database connection
  - `SECRET_KEY`: JWT token signing
  - `HF_API_TOKEN`, `HF_MODEL_ID`: Hugging Face API credentials
  - `GROQ_API_KEY`: Groq LLM API key
  - `GEMINI_API_KEY`: Google Gemini API key

**Usage**: Imported throughout app as `settings` singleton

---

## 3. DATABASE LAYER

### Database Connection (`backend/app/db/database.py`)
**Purpose**: SQLAlchemy engine and session management

**How it works**:
- Creates SQLAlchemy engine from DATABASE_URL
- Configures SessionLocal factory for database sessions
- Defines Base class for ORM models
- Echo mode enabled for SQL query logging

### Database Models

#### `backend/app/db/models.py` - User Model
**Purpose**: Core user authentication table

**Schema**:
- `id`: Primary key
- `email`: Unique user email
- `hashed_password`: Bcrypt hashed password
- `created_at`: Timestamp

#### `backend/app/db/models_chat.py` - Chat Models
**Purpose**: Conversation history storage

**ChatSession Model**:
- `session_id`: Unique UUID for each conversation
- `user_id`: Foreign key to users
- `title`: Chat title (default "New Chat")
- `created_at`, `updated_at`: Timestamps

**ChatMessage Model**:
- `session_id`: Links to chat session
- `role`: "user" or "assistant"
- `content`: Message text
- `created_at`: Timestamp

**How it works**: Each chat session contains multiple messages, enabling conversation history retrieval

#### `backend/app/db/models_lab_values.py` - Lab Values Model
**Purpose**: Structured storage of parsed lab test results

**Schema**:
- `test_name`: Lab test identifier (e.g., "Hemoglobin")
- `value`: Numeric result
- `unit`: Measurement unit (e.g., "g/dL")
- `normal_range_min/max`: Reference ranges
- `status`: Clinical status (low/normal/high/critical)
- `severity`: Mild/moderate/severe
- `interpretation`: Human-readable explanation
- `extraction_confidence`: Parser confidence score
- `evaluation_details`: JSON metadata

**How it works**: Enables deterministic trend analysis by storing numeric values separately from text summaries

#### `backend/app/db/models_profile.py` - Health Profile Model
**Purpose**: User health context storage

**Schema**:
- Demographics: age, gender
- Vitals: height_cm, weight_kg, blood_type
- Lifestyle: activity_level, dietary_preferences
- Medical: known_conditions, allergies

**How it works**: Provides context for personalized AI responses and lifestyle plans

#### `backend/app/db/models_reports.py` - Report Models
**Purpose**: Medical document storage and analysis

**Report Model**:
- `filename`: Original file name
- `file_type`: pdf/image
- `user_id`: Owner
- `created_at`: Upload timestamp

**ReportExtract Model**:
- `report_id`: Links to report
- `raw_text`: OCR extracted text
- `entities_json`: NER extracted entities
- `summary_text`: Generated summary
- `medical_analysis_json`: Cached LLM analysis

**How it works**: Separates raw report from processed analysis for efficient retrieval

### Database Operations (`backend/app/db/crud.py`)
**Purpose**: Database CRUD operations abstraction

**Key Functions**:
- `get_health_profile()`: Fetch user health profile
- `create_or_update_health_profile()`: Upsert profile data
- `get_or_create_chat_session()`: Session management
- `save_message()`: Store chat messages
- `get_recent_messages()`: Retrieve conversation history
- `get_latest_lab_summary()`: Format recent lab results
- `create_report()`: Store uploaded report
- `create_report_extract()`: Store analysis results

**How it works**: Provides clean interface between API routes and database, handles session management

### Dependencies (`backend/app/db/deps.py`)
**Purpose**: FastAPI dependency injection for database and auth

**Functions**:
- `get_db()`: Yields database session, ensures cleanup
- `get_current_user()`: Validates JWT token, returns authenticated user

**How it works**: Used as FastAPI dependencies in route handlers for automatic session management and authentication

---

## 4. API ROUTES

### Authentication API (`backend/app/api/auth.py`)
**Purpose**: User registration and login

**Endpoints**:

**POST /api/auth/register**:
- Accepts email and password
- Checks if user exists
- Hashes password with bcrypt
- Creates user record
- Returns JWT access token

**POST /api/auth/login**:
- Accepts OAuth2 password form (username=email, password)
- Verifies credentials
- Returns JWT access token

**How it works**: Uses JWT tokens for stateless authentication, tokens stored in frontend localStorage

### Chat API (`backend/app/api/chat.py`)
**Purpose**: Conversational AI interface

**Endpoints**:

**GET /api/chat/sessions**:
- Returns list of user's chat sessions
- Ordered by most recent

**DELETE /api/chat/sessions/{session_id}**:
- Deletes session and all messages
- Requires ownership verification

**POST /api/chat/**:
- Main chat endpoint
- Creates new session if none provided
- Validates health-related content
- Retrieves conversation history
- Injects lab context and profile
- Calls Groq LLM for response
- Applies safety validation
- Saves messages to database

**How it works**:
1. User sends message
2. System checks if health-related (filters.py)
3. Loads conversation history (last 6 messages)
4. Injects user profile and lab results as context
5. Sends to Groq LLM (llama-3.3-70b-versatile)
6. Validates output for safety (emergency detection, diagnosis filtering)
7. Appends medical disclaimer
8. Saves to database
9. Returns response with session_id

**Special Features**:
- Detects plan generation keywords for lifestyle consultations
- Emergency symptom detection with redirect
- Diagnosis term sanitization

### Lifestyle API (`backend/app/api/lifestyle.py`)
**Purpose**: Personalized diet and workout plan generation

**Endpoints**:

**POST /api/lifestyle/diet/consult**:
- Starts interactive nutrition consultation
- Loads user profile and lab results
- Generates initial consultation questions
- Returns session_id for chat continuation

**POST /api/lifestyle/workout/consult**:
- Starts interactive fitness consultation
- Similar flow to diet consultation

**How it works**:
1. Validates user has health profile
2. Creates new chat session
3. Calls `start_plan_consultation()` with profile and lab data
4. LLM generates personalized questions about habits, preferences, limitations
5. Returns session for continued conversation
6. User answers questions in chat
7. When ready, user triggers plan generation
8. System analyzes conversation and generates detailed 7-day plan

### Medical API (`backend/app/api/medical.py`)
**Purpose**: Symptom analysis and medical reasoning

**Endpoints**:

**POST /api/medical/reason**:
- Accepts symptoms list, age, gender
- Calls local MediPhi model
- Returns findings, explanation, confidence

**How it works**: Routes to medical_reasoning_service which uses local GGUF model for offline medical inference

### Profile API (`backend/app/api/profile.py`)
**Purpose**: Health profile management

**Endpoints**:

**GET /api/profile/**:
- Returns user's health profile
- Returns null if not set

**PUT /api/profile/**:
- Creates or updates health profile
- Accepts partial updates

**How it works**: Simple CRUD operations on HealthProfile model

### Reports API (`backend/app/api/reports.py`)
**Purpose**: Medical report upload and analysis

**Endpoints**:

**GET /api/reports/**:
- Lists all user reports

**DELETE /api/reports/{report_id}**:
- Deletes report and associated lab values
- Requires ownership verification

**GET /api/reports/analytics/trends**:
- Analyzes health trends across multiple reports
- Uses LLM to identify patterns

**POST /api/reports/upload**:
- Main upload endpoint
- Handles both medical images (X-ray, CT, MRI) and lab reports

**Upload Flow for Lab Reports**:
1. Save file to uploads directory
2. Extract text using OCR (PaddleOCR or Tesseract)
3. Parse lab values using LabValueParser (deterministic regex)
4. Benchmark against reference ranges (ReferenceRangeEngine)
5. Store structured lab values in database
6. Generate clinical summary
7. Return analysis results

**Upload Flow for Medical Images**:
1. Detect image type from filename (xray, ct, mri keywords)
2. Call vision_service for analysis
3. Generate educational guide about image interpretation
4. Store analysis as report extract
5. Return with disclaimer

**POST /api/reports/{report_id}/explain**:
- Generates detailed explanation of report
- Uses Groq LLM for patient-friendly language
- Caches result in medical_analysis_json

**GET /api/reports/{report_id}/lab-values**:
- Returns structured lab values with clinical benchmarking
- Includes status, severity, interpretation for each test

**How it works**: Multi-stage pipeline combining deterministic parsing with AI narrative generation

### Users API (`backend/app/api/users.py`)
**Purpose**: User management (legacy, mostly replaced by auth)

**Endpoints**:
- POST /api/users/: Create user
- GET /api/users/: List users

---

## 5. SERVICES LAYER

### LLM Service (`backend/app/services/llm_service.py`)
**Purpose**: Groq API integration for medical chat

**Key Components**:
- Uses Groq client with llama-3.3-70b-versatile model
- System prompt defines medical assistant behavior
- Temperature 0.3 for consistent responses
- Max 800 tokens

**System Prompt Capabilities**:
- Evidence-based health advice
- Symptom explanation
- Home remedies and self-care
- OTC medication suggestions
- When to see doctor recommendations
- Cannot diagnose or prescribe

**How it works**: Wraps Groq API with medical-specific system prompt and formatting guidelines


### Auth Service (`backend/app/services/auth_service.py`)
**Purpose**: JWT token and password management

**Functions**:
- `verify_password()`: Compares plain password with bcrypt hash
- `get_password_hash()`: Hashes password with bcrypt
- `create_access_token()`: Generates JWT token with 24-hour expiry
- `decode_access_token()`: Validates and decodes JWT

**How it works**: Uses passlib for bcrypt hashing, jose for JWT encoding with HS256 algorithm

### OCR Service (`backend/app/services/ocr_service.py`)
**Purpose**: Text extraction from PDFs and images

**Supported Engines**:
1. **PaddleOCR** (preferred): More accurate, GPU-capable
2. **Tesseract** (fallback): CPU-only, requires installation

**Functions**:
- `preprocess_image()`: Enhances image quality
  - Converts to grayscale
  - Upscales 2x for better text detection
  - Applies auto-contrast
  - Sharpens image
- `extract_text()`: Main extraction function
  - PDF: Uses pdfplumber for native text extraction
  - Images: Uses PaddleOCR or Tesseract with preprocessing

**How it works**: 
- Tries PaddleOCR first for best accuracy
- Falls back to Tesseract if PaddleOCR unavailable
- Preprocessing significantly improves OCR accuracy on low-quality scans

### NER Service (`backend/app/services/ner_service.py`)
**Purpose**: Named Entity Recognition for medical terms

**How it works**:
- Uses spaCy with `en_core_sci_sm` model (scientific/medical NER)
- Extracts entities by label (diseases, medications, anatomy, etc.)
- Returns dictionary of entity types to entity lists

**Usage**: Provides context for report summaries and medical reasoning

### Lab Parser (`backend/app/services/lab_parser.py`)
**Purpose**: Deterministic extraction of numeric lab values

**Key Classes**:

**LabValueParser**:
- Uses regex patterns to extract test name, value, unit
- Supports multiple formats:
  - "Hemoglobin: 12.5 g/dL"
  - "Glucose - 120 mg/dL"
  - "WBC 8.5 x10^3/μL"
- Handles OCR artifacts (extra spaces, character separation)
- Extracts normal ranges from context
- Deduplicates results
- Returns LabValue objects with 0.9 confidence

**UnitNormalizer**:
- Standardizes unit formats (mg/dl → mg/dL)
- Converts between units (mmol/L ↔ mg/dL for glucose)

**Supported Tests**:
- Hematology: Hemoglobin, Hematocrit, WBC, RBC, Platelets
- Chemistry: Glucose, HbA1c, Creatinine, BUN
- Electrolytes: Sodium, Potassium, Chloride, Calcium
- Lipids: Total Cholesterol, LDL, HDL, Triglycerides
- Liver: ALT, AST, ALP, Bilirubin, Albumin
- Thyroid: TSH, T3, T4
- Vitamins: Vitamin D, B12, Iron, Ferritin

**How it works**:
1. Cleans OCR artifacts
2. Applies multiple regex patterns
3. Extracts test name, numeric value, unit
4. Searches nearby text for normal ranges
5. Normalizes test names and units
6. Deduplicates matches
7. Returns structured LabValue objects

**Why deterministic**: No LLM hallucination risk, reliable numeric extraction for trend analysis

### Reference Ranges Engine (`backend/app/services/reference_ranges.py`)
**Purpose**: Clinical benchmarking of lab values

**Key Classes**:

**ReferenceRangeEngine**:
- Contains medical reference ranges from Mayo Clinic, LabCorp
- Supports gender-specific ranges (e.g., Hemoglobin)
- Supports age-specific ranges
- Evaluates lab values against standards

**Evaluation Process**:
1. Select most specific reference range (gender/age)
2. Compare value to normal range
3. Determine status: critical_low, low, normal, high, critical_high
4. Calculate delta (distance from boundary)
5. Assess severity: mild (<15% deviation), moderate (15-30%), severe (>30%)
6. Generate human-readable interpretation

**Example**:
- Input: Hemoglobin 9.5 g/dL, Female, Age 35
- Reference: 12.0-15.5 g/dL
- Status: LOW
- Delta: -2.5 g/dL
- Severity: MODERATE (20% below minimum)
- Interpretation: "Moderate below normal range by 2.5 g/dL. Normal: 12.0-15.5 g/dL"

**How it works**: Pure deterministic logic, no AI involved, ensures consistent clinical evaluation

### Enhanced Report Analyzer (`backend/app/services/enhanced_report_analyzer.py`)
**Purpose**: Multi-stage report analysis pipeline

**Pipeline Stages**:

**Stage 1 - Deterministic Extraction**:
- Uses LabValueParser to extract numeric values
- Regex-based, no hallucination risk

**Stage 2 - Clinical Benchmarking**:
- Uses ReferenceRangeEngine to evaluate each value
- Flags critical values

**Stage 3 - Entity Extraction**:
- Uses spaCy NER for medical terms

**Stage 4 - Clinical Summary**:
- Generates deterministic summary from evaluations
- Counts normal vs abnormal tests
- Lists critical findings

**Stage 5 - AI Narrative** (optional):
- Uses local MediPhi model for patient-friendly explanation
- Grounded in structured data from stages 1-4

**Database Storage**:
- Saves structured lab values to lab_values table
- Enables longitudinal trend analysis

**How it works**: Hybrid approach - deterministic for accuracy, AI for narrative

### Report Summary Service (`backend/app/services/report_summary_service.py`)
**Purpose**: Basic report summarization

**How it works**: Simple text condensation with entity listing, used as fallback when enhanced analysis unavailable

### Medical Reasoning Service (`backend/app/services/medical_reasoning_service.py`)
**Purpose**: Symptom analysis using local LLM

**Key Features**:
- Uses local MediPhi-Instruct GGUF model
- Loads user health profile for context
- Prioritizes lab report data over general history
- Safety filter prevents unauthorized diagnoses

**Safety Mechanism**:
- Forbidden terms list (migraine, diabetes, cancer, etc.)
- Allows mirroring if term in user input
- Blocks AI from introducing new diagnosis terms
- Returns safe fallback if violation detected

**How it works**:
1. Fetch user health profile
2. Combine symptoms + report summary + profile
3. Call local LLM with structured prompt
4. Parse JSON response (findings, explanation, confidence)
5. Apply safety filter
6. Return sanitized result

### Lifestyle Service (`backend/app/services/lifestyle_service.py`)
**Purpose**: Interactive plan generation

**Functions**:

**start_plan_consultation()**:
- Generates initial consultation questions
- Reviews profile and lab results
- Asks about habits, preferences, limitations, goals
- Returns warm, conversational opening

**generate_final_plan()**:
- Analyzes full conversation
- Creates detailed 7-day plan
- Nutrition: Meals, portions, recipes, shopping list
- Fitness: Weekly schedule, exercises, sets/reps, safety tips

**How it works**: Uses Groq LLM with specialized system prompts for nutritionist/fitness coach personas

### Analytics Service (`backend/app/services/analytics_service.py`)
**Purpose**: Longitudinal health trend analysis

**How it works**:
1. Fetches all user reports
2. Extracts summaries with dates
3. Sends to local LLM for trend identification
4. LLM identifies metrics (BP, glucose, BMI, etc.)
5. Tracks changes over time
6. Returns JSON with overall summary and metric trends

**Output Format**:
```json
{
  "overall_summary": "Patient shows improvement in...",
  "trends": [
    {
      "metric": "Blood Pressure",
      "entries": [{"date": "2024-01-01", "value": "140/90"}, ...],
      "observation": "Decreasing trend, improved control"
    }
  ]
}
```

### Vision Service (`backend/app/services/vision_service.py`)
**Purpose**: Medical image analysis (X-ray, CT, MRI)

**How it works**:
- Generates educational guide about image interpretation
- Uses Groq LLM to provide structured information:
  - Image quality assessment criteria
  - Anatomical features visible
  - Common findings to look for
  - Warning signs requiring attention
  - Recommendations for professional consultation
- Returns educational content, not actual diagnosis
- Includes strong disclaimer about need for radiologist review

**Why educational only**: Cannot actually analyze image pixels, provides guidance on what radiologist would look for

### Local LLM Service (`backend/app/services/local_llm.py`)
**Purpose**: Offline medical reasoning with MediPhi model

**Configuration**:
- Model: MediPhi-Instruct-q4_k_m.gguf (quantized for CPU)
- Context window: 4096 tokens
- Uses llama-cpp-python for inference

**Key Methods**:

**predict()**:
- For medical reasoning tasks
- Temperature 0.2 (deterministic)
- Max 512 tokens
- Returns JSON: {findings, explanation, confidence}

**generate_raw()**:
- For creative tasks (lifestyle plans, summaries)
- Temperature 0.7 (more creative)
- Max 1024 tokens
- Returns raw text

**Prompt Template**:
- Uses Phi-3 format: `<|system|>...<|user|>...<|assistant|>`
- Instructs model to prioritize report data over profile
- Enforces JSON output for structured tasks

**How it works**: Singleton pattern ensures model loaded once, reused across requests

---

## 6. UTILITIES

### File Handler (`backend/app/utils/file_handler.py`)
**Purpose**: Upload file management

**How it works**:
- Generates UUID filename to prevent collisions
- Saves to uploads/ directory
- Returns path and normalized extension

### Intent Detector (`backend/app/utils/intent_detector.py`)
**Purpose**: Detect medical reasoning intent

**Patterns**:
- Symptom mentions
- Pain descriptions
- Lab report references
- Medical imaging mentions

**How it works**: Regex pattern matching to route to medical reasoning service

---

## 7. SAFETY LAYER

### Disclaimers (`backend/app/safety/disclaimers.py`)
**Purpose**: Medical disclaimer text

**How it works**: Returns standard disclaimer appended to all medical responses

### Filters (`backend/app/safety/filters.py`)
**Purpose**: Input validation

**How it works**:
- Blocks non-health topics (stocks, politics, programming)
- Blocks diagnosis requests
- Blocks emergency situations (redirects to emergency guidance)

### Output Guard (`backend/app/safety/output_guard.py`)
**Purpose**: Multi-layer output validation

**Safety Checks**:

**1. Emergency Detection**:
- Patterns: chest pain, difficulty breathing, severe bleeding, suicidal thoughts
- Action: Replace response with emergency guidance

**2. Diagnosis Detection**:
- Forbidden: heart attack, stroke, cancer, sepsis
- Allows mirroring if user mentioned term first
- Action: Redact unauthorized diagnoses

**3. Prescription Detection**:
- Blocks prescription medication dosages
- Allows OTC mentions
- Action: Redact prescription suggestions

**4. Hallucination Detection**:
- Implausible values (hemoglobin 50, BP 500/100)
- Action: Flag for logging

**5. Confidence Check**:
- Detects low confidence markers
- Action: Flag but allow

**How it works**:
1. Validate text against all patterns
2. Determine action: DISPLAY, SANITIZE, BLOCK, EMERGENCY_REDIRECT
3. Apply redactions if needed
4. Return sanitized text with flags

**Usage**: All LLM outputs pass through get_safety_guard().validate() before display

---


## FRONTEND ARCHITECTURE

### 1. Application Entry Points

#### `frontend/src/main.jsx`
**Purpose**: React application bootstrap

**How it works**:
- Creates root React element
- Renders App component in StrictMode
- Mounts to #root div in index.html

#### `frontend/src/App.jsx`
**Purpose**: Main application router and authentication guard

**How it works**:
1. Checks for JWT token in localStorage
2. If no token: Shows only Login page, redirects all routes to /login
3. If token exists: Shows Layout with authenticated routes
4. Routes:
   - `/` → Dashboard
   - `/reports` → Reports
   - `/chat` → Chat
   - `/lifestyle` → Lifestyle
   - `/profile` → Profile

**Authentication Flow**:
- Token stored in localStorage after login
- All routes protected except /login
- Axios interceptor adds token to all API requests

---

### 2. API Service Layer

#### `frontend/src/services/api.js`
**Purpose**: Centralized API client

**Configuration**:
- Base URL: http://127.0.0.1:8000/api
- Axios interceptor adds Authorization header from localStorage

**API Functions**:
- `getProfile()`: GET /profile/
- `updateProfile(data)`: PUT /profile/
- `uploadReport(formData)`: POST /reports/upload
- `explainReport(reportId)`: POST /reports/{id}/explain
- `getReports()`: GET /reports/
- `getLabValues(reportId)`: GET /reports/{id}/lab-values
- `getTrends()`: GET /reports/analytics/trends
- `sendMessage(message, sessionId)`: POST /chat/
- `getChatSessions()`: GET /chat/sessions
- `startDietConsultation(goal)`: POST /lifestyle/diet/consult
- `startWorkoutConsultation(goal)`: POST /lifestyle/workout/consult

**How it works**: Wraps axios with automatic token injection and base URL configuration

---

### 3. Pages

#### `frontend/src/pages/Login.jsx`
**Purpose**: Authentication interface

**Features**:
- Toggle between login and register modes
- Email and password inputs
- Error message display
- Loading state during authentication

**How it works**:
1. User enters credentials
2. Calls /auth/register or /auth/login
3. Stores JWT token in localStorage
4. Navigates to dashboard
5. Reloads page to update axios headers

**UI Elements**:
- Glass panel design
- Animated fade-in
- Logo icon with "H"
- Error messages in accent color

#### `frontend/src/pages/Dashboard.jsx`
**Purpose**: Overview of health metrics and recent activity

**Data Displayed**:
- Activity level from profile
- Body metrics (weight, height, blood type)
- Report count
- Recent 3 reports
- Known conditions (as tags)
- Allergies (as warning tags)

**How it works**:
1. Fetches profile and reports on mount
2. Displays stats in grid cards
3. Shows recent reports with file icons
4. Displays medical context (conditions, allergies)

**UI Components**:
- Stats grid with icon cards
- Reports list with badges
- Tag clouds for conditions/allergies
- Loading state

#### `frontend/src/pages/Chat.jsx`
**Purpose**: Conversational AI interface

**Features**:
- Chat sessions sidebar
- Message history display
- Real-time typing indicators
- Session management (create, load, delete)
- Message formatting (bold, line breaks)
- Medical insight badges

**How it works**:
1. Loads chat sessions on mount
2. Checks URL for session parameter (from lifestyle redirects)
3. User types message and sends
4. Displays user message immediately
5. Shows typing indicator
6. Receives AI response
7. Formats response (markdown-like)
8. Saves to session history

**Message Formatting**:
- `**text**` → bold
- `\n\n` → paragraph breaks
- Numbered lists preserved
- Bullet points preserved

**Session Management**:
- New chat button creates fresh session
- Click session to load history
- Delete button removes session
- Active session highlighted

**UI Elements**:
- Sidebar with session list
- Message bubbles (user right, assistant left)
- Avatar icons
- Medical insight tags for flagged responses
- Typing animation (3 bouncing dots)

#### `frontend/src/pages/Reports.jsx`
**Purpose**: Medical report upload and analysis

**Features**:
- Report upload with drag-and-drop
- Report list sidebar
- Report viewer with analysis
- Lab values display with clinical status
- Trend analysis across reports
- Medical image analysis support
- Report deletion

**How it works**:

**Upload Flow**:
1. User selects file
2. Shows "Analyzing..." state
3. Uploads to /reports/upload
4. Backend processes (OCR, parsing, benchmarking)
5. Shows success with confetti animation
6. Refreshes report list

**View Flow**:
1. Click report in sidebar
2. Loads lab values for report
3. Displays structured lab results with status indicators
4. Click "Generate Medical Explanation" for AI analysis
5. Shows detailed explanation with findings

**Trend Analysis**:
1. Click "Longitudinal Analysis" button
2. Switches to trends view
3. Shows overall clinical progress
4. Displays metric trends over time
5. Each metric shows date/value pairs and observations

**Lab Values Display**:
- Test name, value, unit
- Status badge (normal/low/high/critical)
- Severity indicator
- Reference range
- Interpretation text
- Color-coded by status

**Medical Image Support**:
- Detects X-ray/CT/MRI from filename
- Shows educational analysis
- Displays disclaimer prominently

**UI Components**:
- Sidebar with searchable report list
- Main viewer with tabs
- Lab values grid with status colors
- Trend cards with data points
- Loading states and animations
- Empty states for no data

#### `frontend/src/pages/Lifestyle.jsx`
**Purpose**: Personalized nutrition and fitness planning

**Features**:
- Diet consultation starter
- Workout consultation starter
- Interactive consultation flow
- Plan generation in chat

**How it works**:
1. User clicks "Start Consultation" for diet or workout
2. Calls /lifestyle/diet/consult or /lifestyle/workout/consult
3. Backend creates chat session with initial questions
4. Redirects to /chat?session={session_id}
5. User answers questions in chat
6. When ready, user says "generate plan"
7. AI creates detailed 7-day plan

**Consultation Questions**:
- Diet: Eating habits, preferences, restrictions, schedule, goals
- Workout: Fitness level, injuries, limitations, schedule, goals

**UI Elements**:
- Two-column grid
- Plan cards with icons
- Consultation info with checkmarks
- Loading states during startup

#### `frontend/src/pages/Profile.jsx`
**Purpose**: Health profile management

**Form Sections**:

**Personal Information**:
- Age (number)
- Gender (select: Male/Female/Other)
- Height in cm
- Weight in kg
- Blood type (select: A+, A-, B+, B-, AB+, AB-, O+, O-)

**Lifestyle & Context**:
- Activity level (select: Sedentary/Light/Moderate/Active)
- Dietary preferences (text)
- Known conditions (textarea)
- Allergies (textarea)

**How it works**:
1. Loads existing profile on mount
2. User edits fields
3. Click "Save Health Identity"
4. Calls PUT /profile/ with updated data
5. Shows success message

**UI Elements**:
- Two-column form grid
- Styled inputs with focus states
- Save button with loading state
- Security notice with shield icon

---

### 4. Components

#### `frontend/src/components/Layout.jsx`
**Purpose**: Main application shell

**Structure**:
- Sidebar navigation
- Main content area
- Logout functionality

**How it works**:
- Wraps all authenticated pages
- Provides consistent navigation
- Handles logout (clears token, reloads)

#### `frontend/src/components/Sidebar.jsx`
**Purpose**: Navigation menu

**Menu Items**:
- Dashboard (home icon)
- Reports (file icon)
- Chat (message icon)
- Lifestyle (activity icon)
- Profile (user icon)

**How it works**:
- Uses React Router NavLink for active states
- Highlights current page
- Logout button at bottom

#### `frontend/src/components/LabValuesDisplay.jsx`
**Purpose**: Structured lab results visualization

**Features**:
- Grid layout of lab tests
- Color-coded status badges
- Severity indicators
- Reference ranges
- Interpretation text
- Confidence scores

**Status Colors**:
- Normal: Green (#00ff88)
- Low: Yellow (#ffc107)
- High: Orange (#ff9800)
- Critical: Red (#ef4444)

**How it works**:
1. Receives lab values array as prop
2. Groups by status
3. Displays in cards with visual indicators
4. Shows reference ranges when available
5. Includes interpretation for each test

---

## 8. STYLING ARCHITECTURE

### CSS Variables (index.css)
**Color Scheme**:
- Background: Dark (#0a0e27)
- Surface: Lighter dark (#151932)
- Accent Primary: Blue (#3a86ff)
- Accent Secondary: Pink (#f72585)
- Success: Green (#00ff88)
- Text Primary: White
- Text Secondary: Gray (#94a3b8)

**Design System**:
- Glass morphism effects
- Gradient borders
- Smooth animations
- Consistent spacing
- Border radius: 12-20px
- Shadows with color tints

**Typography**:
- Font: Inter (sans-serif)
- Headings: Bold, larger sizes
- Body: Regular, 15-16px
- Labels: Uppercase, 12px, letter-spacing

---

## 9. KEY WORKFLOWS

### Complete Report Analysis Workflow

**User Action**: Upload lab report PDF

**Backend Processing**:
1. **File Handling** (file_handler.py):
   - Generate UUID filename
   - Save to uploads/

2. **OCR Extraction** (ocr_service.py):
   - Extract text with PaddleOCR/Tesseract
   - Preprocess image for better accuracy

3. **Lab Value Parsing** (lab_parser.py):
   - Apply regex patterns to extract test name, value, unit
   - Clean OCR artifacts
   - Extract normal ranges
   - Return LabValue objects

4. **Clinical Benchmarking** (reference_ranges.py):
   - Select appropriate reference range (gender/age-specific)
   - Evaluate status (low/normal/high/critical)
   - Calculate severity
   - Generate interpretation

5. **Database Storage** (enhanced_report_analyzer.py):
   - Save structured lab values to lab_values table
   - Store report metadata
   - Cache analysis results

6. **Response**:
   - Return lab_values_found count
   - Return risk_flags for critical values
   - Return clinical_summary

**Frontend Display**:
1. Show success message with confetti
2. Refresh reports list
3. Display new report in sidebar
4. Show lab values with status colors
5. Enable "Generate Explanation" button

### Complete Chat Workflow

**User Action**: Send health question

**Backend Processing**:
1. **Input Validation** (filters.py):
   - Check if health-related
   - Reject non-health topics

2. **Context Loading** (crud.py):
   - Get conversation history (last 6 messages)
   - Load user health profile
   - Get latest lab results summary

3. **Context Injection**:
   - Build system message with profile and lab data
   - Format as: "Patient: 35yo Female, Hemoglobin: 12.5 g/dL (normal)"

4. **LLM Call** (llm_service.py):
   - Send to Groq API (llama-3.3-70b-versatile)
   - Temperature 0.3 for consistency
   - Max 800 tokens

5. **Safety Validation** (output_guard.py):
   - Check for emergency symptoms
   - Detect unauthorized diagnoses
   - Redact prescriptions
   - Flag hallucinations

6. **Response Finalization**:
   - Append medical disclaimer
   - Save to database
   - Return with session_id

**Frontend Display**:
1. Show user message immediately
2. Display typing indicator
3. Receive and format response
4. Apply markdown-like formatting
5. Show medical insight badge if flagged
6. Scroll to bottom

### Complete Lifestyle Plan Workflow

**User Action**: Start diet consultation

**Backend Processing**:
1. **Validation**:
   - Check user has health profile
   - Return 404 if missing

2. **Session Creation**:
   - Generate new UUID session_id
   - Create ChatSession record

3. **Context Gathering**:
   - Load health profile (age, gender, weight, height, conditions, allergies)
   - Get latest lab results

4. **Initial Consultation** (lifestyle_service.py):
   - Call Groq LLM with nutritionist persona
   - Generate 3-4 personalized questions
   - Ask about eating habits, preferences, restrictions, schedule, goals

5. **Response**:
   - Return session_id and initial_message

**Frontend Flow**:
1. Show loading state
2. Receive session_id
3. Navigate to /chat?session={session_id}
4. Display initial questions
5. User answers in chat
6. Conversation continues naturally
7. User says "generate my plan"
8. Backend detects plan keywords
9. Analyzes full conversation
10. Generates detailed 7-day plan with meals/workouts
11. Returns formatted plan

---

## 10. SECURITY FEATURES

### Authentication
- JWT tokens with 24-hour expiry
- Bcrypt password hashing
- Token stored in localStorage
- Automatic token injection in API calls

### Authorization
- All routes require valid token
- User ID extracted from token
- Database queries filtered by user_id
- Ownership verification on delete operations

### Input Validation
- Health-related content filtering
- Emergency detection and redirect
- Non-health topic rejection

### Output Validation
- Multi-layer safety guard
- Emergency symptom detection
- Diagnosis term filtering
- Prescription redaction
- Hallucination detection

### Data Privacy
- User data isolated by user_id
- No cross-user data access
- Local file storage
- Database per-user filtering

---

## 11. PERFORMANCE OPTIMIZATIONS

### Backend
- Database session management with cleanup
- Singleton pattern for LLM models
- Cached analysis results
- Lazy loading of heavy models
- Efficient query patterns

### Frontend
- React component memoization
- Lazy loading of routes
- Optimistic UI updates
- Debounced search inputs
- Efficient re-renders

### API
- Structured data storage for fast retrieval
- Deterministic parsing before AI
- Cached LLM responses
- Batch operations where possible

---

## 12. ERROR HANDLING

### Backend
- Try-catch blocks around external calls
- Fallback mechanisms (Tesseract if PaddleOCR fails)
- Graceful degradation (basic summary if enhanced fails)
- Detailed error logging
- User-friendly error messages

### Frontend
- Loading states for async operations
- Error message display
- Empty states for no data
- Fallback UI components
- Network error handling

---

## 13. TESTING INFRASTRUCTURE

### Test Files
- `test_lifestyle.py`: Lifestyle service tests
- `test_medical_inference.py`: Medical reasoning tests
- `test_ner.py`: NER extraction tests
- `test_ocr.py`: OCR accuracy tests
- `test_profile_integration.py`: Profile CRUD tests
- `test_reports_pipeline.py`: End-to-end report analysis tests

### Scripts
- `debug_users.py`: User database inspection
- `demo_active_features.py`: Feature demonstration
- `download_model.py`: MediPhi model downloader
- `fix_db_schema.py`: Database migration
- `inspect_users.py`: User data viewer
- `migrate_*.py`: Various database migrations
- `reset_database.py`: Clean database reset
- `test_robustness.py`: Stress testing
- `test_tier1.py`: Core functionality tests

---

## 14. DEPLOYMENT CONSIDERATIONS

### Environment Variables Required
```
DATABASE_URL=sqlite:///./healthora.db
SECRET_KEY=<random-secret-key>
GROQ_API_KEY=<groq-api-key>
GEMINI_API_KEY=<optional-gemini-key>
HF_API_TOKEN=<optional-huggingface-token>
```

### Dependencies
**Backend**:
- FastAPI, Uvicorn
- SQLAlchemy
- Groq, llama-cpp-python
- PaddleOCR or Tesseract
- spaCy with en_core_sci_sm
- pdfplumber, Pillow
- python-jose, passlib

**Frontend**:
- React, React Router
- Axios
- Lucide React (icons)
- Canvas Confetti

### File Structure
```
backend/
  app/
    api/          # Route handlers
    db/           # Database models and CRUD
    services/     # Business logic
    safety/       # Safety validation
    utils/        # Utilities
  models/         # LLM model files
  uploads/        # User uploaded files
  scripts/        # Maintenance scripts
  tests/          # Test suite

frontend/
  src/
    pages/        # Page components
    components/   # Reusable components
    services/     # API client
```

---

## 15. FUTURE ENHANCEMENTS

### Planned Features
- Real-time chat streaming
- Voice input/output
- Mobile app
- Multi-language support
- Advanced visualizations
- Medication tracking
- Appointment scheduling
- Doctor collaboration features

### Technical Improvements
- Redis caching
- PostgreSQL migration
- Docker containerization
- CI/CD pipeline
- Comprehensive test coverage
- API rate limiting
- WebSocket support
- CDN for static assets

---

## SUMMARY

Healthora is a sophisticated healthcare AI platform combining:
- **Deterministic parsing** for reliable lab value extraction
- **Clinical benchmarking** against medical standards
- **AI narrative generation** for patient-friendly explanations
- **Multi-layer safety** to prevent medical harm
- **Interactive consultations** for personalized plans
- **Longitudinal analysis** for health trend tracking
- **Modern UI/UX** with glass morphism design

The architecture prioritizes **accuracy** (deterministic where possible), **safety** (multi-layer validation), and **user experience** (conversational AI, visual feedback).

