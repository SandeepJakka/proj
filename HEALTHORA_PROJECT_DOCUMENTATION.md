# Healthora Project Documentation

## 1. Project Overview

* **Project Name**: Healthora
* **Purpose**: Healthora is an AI-powered healthcare assistant designed to empower users with clear, patient-friendly medical information. It bridges the gap between complex medical data and patient understanding by offering tools to analyze medical reports, scan prescriptions, manage family health records, evaluate insurance claims, and have contextual health conversations in local languages (e.g., Telugu, English).
* **Target Users**: Patients, caretakers, and individuals looking for affordable, easy-to-understand health guidance, particularly within the Indian healthcare context (with specific focus on India/Andhra Pradesh).
* **Core Problem it Solves**: Removes the complexity of understanding medical reports, finding affordable medicine alternatives (generic vs. branded), navigating health insurance policies, and getting instant, reliable (but safely guarded) health answers and second opinions.

---

## 2. Features Implemented

Here is a comprehensive list of all major modules and features implemented in the system:

### 🏥 Medical Report Analysis
* **What it does**: Allows users to upload medical reports (PDF, X-Ray, Lab results) to get a simplified explanation, extract key lab values, track trends, and even request an AI second opinion or decode a hospital discharge summary.
* **Input**: PDF or Image files (X-ray, MRI, etc.)
* **Output**: Structured JSON explaining findings, abnormal values, and patient-friendly summaries.
* **Technologies used**: Python Magic, PyMuPDF, PIL, Gemini (for parsing complex medical structures), Groq (for plain language explanations).

### 💬 Chat Assistant (Health Companion)
* **What it does**: A conversational AI that provides warm, accurate, and context-aware health advice. It detects emergency intents, redirects patients if necessary, and uses previous health profile and lab data as conversation context. Fully supports Telugu.
* **Input**: User natural language query or symptoms.
* **Output**: Conversational guidance, Pre-appointment preparation guides (specialists, estimated costs at Indian hospitals).
* **Technologies used**: Groq (Llama-3 multilingual), Custom Safety Guard layer, SQLAlchemy (chat history).

### 💊 Medicine Intelligence & Reminders
* **What it does**: Extracts medicines from a prescription image and schedules reminders. Allows users to check medicine info, discover cheap generic alternatives (Jan Aushadhi), scrape real-time prices from 1mg/Pharmeasy, and check for severe drug-drug interactions.
* **Input**: Medicine names, prescription images (JPEG/PNG/PDF).
* **Output**: Cost savings, generic substitutes, FDA warning data, automated scheduling frequencies.
* **Technologies used**: Groq Vision, OpenFDA API, BeautifulSoup/HTTPX (for web scraping), APScheduler.

### 🛡️ Health Insurance Manager
* **What it does**: Processes lengthy insurance policy PDFs, allows the user to query what is covered, and checks claim eligibility against uploaded medical bills.
* **Input**: Insurance Policy PDF / Image, Medical Bill PDF, Patient situation query.
* **Output**: Claim eligibility (cashless vs. reimbursement), covered amounts, exclusions, Aarogyasri applicability.
* **Technologies used**: PDF Chunking/Regex Text Retrieval, Gemini API.

### 👨‍👩‍👧‍👦 Family Vault & Profiles
* **What it does**: Allows the primary user to maintain health profiles, allergies, track conditions, and save medical reports for multiple dependent family members.
* **Input**: Member details, report files.
* **Output**: Securely segregated health data retrieval.
* **Technologies used**: FastAPI CRUD, S3 Storage (Boto3).

---

## 3. System Architecture

The application is built on a modern decoupled architecture:

* **Frontend (React)**: Built with Vite, React 19, React Router, and TailwindCSS (via custom `index.css`). Framer Motion is used for micro-animations and smooth transitions. The UI state manages JWT tokens and interfaces via Axios.
* **Backend (FastAPI)**: A purely asynchronous REST API built using Python 3. FastAPI manages all incoming HTTP traffic, rate-limiting (via SlowAPI), and delegates tasks to specialized service modules.
* **Database (PostgreSQL)**: Managed via SQLAlchemy ORM. Contains tables for Users, Chat History, Reports, Lab Values, Reminders, and Insurance Policies.
* **External APIs**:
  * **Groq**: Primary driver for fast conversational AI, medical translations (Telugu), and vision (reading prescriptions).
  * **Gemini**: Used heavily for parsing complex structured documents (like PDFs of insurance policies and messy lab reports).
  * **OpenFDA**: Used for fetching verified pharmaceutical data, side effects, and drug interactions.

### Data Flow
1. **Frontend Request**: The React app sends an authenticated request (JWT) with user inputs or file blobs to FastAPI APIs.
2. **Backend Validation**: FastAPI routes validate the request (Pydantic), checks rate limit, and assigns a background DB session.
3. **AI/Processing Layer**: 
    - If a file is uploaded, the backend extracts text using PyMuPDF/OCR.
    - If it's a chat, the user's past DB medical context (profile/labs) is injected into the System Prompt.
    - The compiled prompt is sent to the LLM (Gemini or Groq).
4. **Safety & Post-Processing**: AI outputs pass through `app.safety.output_guard` to enforce medical disclaimers and block dangerous hallucination.
5. **Response Return**: Synthesized, safe JSON is returned to the React UI for rendering.

---

## 4. Folder & File Structure

```text
project-root/
│
├── backend/
│   ├── main.py                   # FastAPI Application entry point / CORS setup
│   ├── requirements.txt          # Python dependencies
│   ├── app/
│   │   ├── api/                  # REST API Endpoints (Controllers)
│   │   │   ├── chat.py           # Handles conversational AI & history
│   │   │   ├── reports.py        # PDF upload, analysis, comparisons
│   │   │   ├── medicines.py      # Price scraping, FDA interaction checks
│   │   │   ├── insurance.py      # Policy upload and Claim analysis
│   │   │   └── reminders.py      # Scan prescriptions & scheduler APIs
│   │   ├── db/                   # Database Layer
│   │   │   ├── crud.py           # Database transaction queries
│   │   │   ├── database.py       # SQL Alchemy engine definition
│   │   │   ├── models_*.py       # SQLAlchemy schema definitions for various entities
│   │   ├── services/             # Core Business & AI Logic (Services)
│   │   │   ├── llm_service.py    # Prompts and interaction with Groq API
│   │   │   ├── vision_service.py # Image extraction (Prescriptions, X-Rays)
│   │   │   ├── report_analyzer.py# Parsing medical PDFs
│   │   │   └── analytics_service.py # Generates health trend charts
│   │   └── safety/               # Medical Safety Guardrails
│   │       ├── output_guard.py   # Prevents AI hallucinations & unsafe advice
│   │       └── filters.py        # Filters out non-medical queries
│   └── migrations/               # Alembic DB Migrations
│
├── frontend/
│   ├── package.json              # Node dependencies (React, Framer Motion, Axios)
│   ├── vite.config.js            # Vite bundler config
│   ├── src/
│   │   ├── App.jsx               # Main React Router setup
│   │   ├── main.jsx              # Application mount point
│   │   ├── components/           # Reusable UI components (Layouts, Modals)
│   │   ├── context/              # React Context (e.g., LanguageContext for Telugu/Eng)
│   │   └── pages/                # Page components (Dashboard, Chat, Reports, Reminders)
```

---

## 5. Backend API Documentation

### 🔹 Chat API (`/api/chat`)
* **Endpoint**: `POST /api/chat/`
* **Purpose**: Send a message to the Healthora AI assistant.
* **Input JSON**: `{"message": "I have a headache", "language": "english", "session_id": "uuid"}`
* **Output JSON**: `{"response": "...", "session_id": "uuid", "is_medical": false}`

* **Endpoint**: `POST /api/chat/appointment-prep`
* **Purpose**: Generates a guide on which specialist to see in AP India & estimated costs based on symptoms.
* **Input JSON**: `{"symptoms": "chest pain", "city": "Hyderabad"}`
* **Output JSON**: `{"success": true, "data": {"specialist": {...}, "tests_beforehand": [...]}}`

### 🔹 Reports API (`/api/reports`)
* **Endpoint**: `POST /api/reports/analyze`
* **Purpose**: Upload and analyze a medical report (Multipart form-data).
* **Input**: `file` (UploadFile), `language` (String)
* **Output JSON**: `{"success": true, "gemini_extraction": {...}, "explanation": "..."}`

* **Endpoint**: `POST /api/reports/{report_id}/second-opinion`
* **Purpose**: Request an independent medical AI second opinion on an already analyzed report.
* **Input JSON**: None required (Uses route path).
* **Output JSON**: `{"overall_assessment": "...", "agree_with": [...], "questions_for_doctor": [...]}`

### 🔹 Medicine & Reminders API (`/api/medicines` | `/api/reminders`)
* **Endpoint**: `POST /api/medicines/price-check`
* **Purpose**: Web-scrapes 1mg/Pharmeasy and compares prices with Jan Aushadhi generic equivalents.
* **Input JSON**: `{"medicines": ["Paracetamol 500mg"]}`
* **Output JSON**: `{"medicines": [{"brand_price": "...", "generic_price": "...", "savings_percent": "..."}]}`

* **Endpoint**: `POST /api/reminders/scan-prescription`
* **Purpose**: Extracts medicine names and dosages straight from an image upload.
* **Input**: `file` (UploadFile)
* **Output JSON**: `{"medicines": [{"name": "...", "dosage": "...", "instructions": "..."}]}`

### 🔹 Insurance API (`/api/insurance`)
* **Endpoint**: `POST /api/insurance/upload-policy`
* **Purpose**: Reads lengthy insurance PDFs and extracts the insurer and basic policy terms.
* **Input**: `file` (UploadFile), `policy_name` (String)
* **Output JSON**: `{"id": 1, "insurer_name": "...", "policy_type": "...", "page_count": 5}`

* **Endpoint**: `POST /api/insurance/check-claim`
* **Purpose**: Analyzes the patient's situation against the uploaded policy to forecast claim eligibility.
* **Input JSON**: `{"policy_id": 1, "situation": "Knee surgery", "bill_text": "..."}`
* **Output JSON**: `{"eligible": true, "claim_type": "cashless", "not_covered": ["Consumables"]}`

---

## 6. AI/ML Components

* **Groq (Llama-3 & Llama-4 Vision)**:
  * **Usage**: General conversational chat, Telugu translations, prescription image reading (`vision_service.py`), and medical second opinions. 
  * **Why**: Provides instantaneous, ultra-fast token generation to make conversations feel real-time.
* **Gemini (Google GenAI)**: 
  * **Usage**: Complex Medical Report Analysis (`analyze_report`), Insurance Policy parsing, and complex JSON extractions.
  * **Why**: Capable of reading unstructured data (tables inside PDFs) and producing reliable nested JSON outputs.
* **Prompt Flow Framework**:
  * Contextual prompts are dynamically built. For example, during a chat, the user's latest labs from the DB are injected into the LLM context so the assistant remembers who they are talking to.
  * System Prompts strictly enforce Indian Healthcare context (e.g., suggesting Arogyasri, government hospitals, Jan Aushadhi generic stores).

---

## 7. Database Design

* **Users**: Stores typical auth profiles (email, hashed password).
* **HealthProfile**: Demographics, allergies, known conditions, blood type (injectable as AI context).
* **ChatSession & ChatMessage**: Stores continuous encrypted conversation histories.
* **Report & ReportExtract**: Stores the report metadata, S3 URL, and the structured JSON output obtained from Gemini (Lab values, summary).
* **LabValue**: Specifically stores extracted lab metrics (test name, value, normal ranges, status high/low).
* **MedicineReminder**: Tracks scheduling items (active, medicine name, frequency).
* **InsurancePolicy**: Holds the raw text chunks of uploaded PDFs so they can be queried later for claim checks.

---

## 8. Processing Pipelines

### Medical Report Pipeline
1. **Input**: User uploads a Blood Test PDF.
2. **Processing**: Backend receives file -> Detects format -> Uses PyMuPDF or `gemini_client` to extract raw text -> Passes text to Gemini with a highly constrained prompt asking for nested JSON evaluation -> Saves generated Lab Values and Summary to DB.
3. **Output**: Renders colorful charts (Normal, High, Low) and plain language translations of the results on the frontend.

### Prescription Pipeline
1. **Input**: User uploads a handwritten/printed prescription image.
2. **Processing**: Sent to `analyze_prescription_image` -> Groq Vision AI evaluates the image -> Returns JSON array of `[name, dosage, instruction]` -> Sent back to frontend UI wizard. User verifies details -> Hits save.
3. **Output**: New `MedicineReminder` DB records are created and the backend APScheduler begins tracking times.

### Chat Workflow
1. **Input**: User asks "Can I take Dolo 650?".
2. **Processing**: Language detected -> User's Health Profile pulled from DB -> User's Lab Summaries pulled from DB -> Context + Question fed into Llama-3 (Groq) -> Output passes through `is_health_related` guard -> If safe, injected with Medical Disclaimer.
3. **Output**: Assistant replies in matched language (Telugu/English).

### Insurance Workflow
1. **Input**: User asks "Will my policy cover cataract surgery?".
2. **Processing**: Backend loads the previously extracted 5,000-word `policy_text` from DB -> Runs `find_relevant_chunks` (which scores text blocks based on keyword overlap) -> Injects the top 3 chunks + user query into Gemini -> Generates claim verdict.
3. **Output**: Returns JSON indicating eligibility, required documents, and waiting periods.

---

## 9. Current Limitations / Missing Features

* **Missing Advanced RAG / Vector DB**: The system currently uses simple keyword matching and word-overlap scores (`find_relevant_chunks`) to find policy information. It *does not* use a dedicated Vector Database (like Pinecone/FAISS) with proper embeddings.
* **Notification Delivery Mechanism**: Reminders are saved to DB, but actual Push Notifications (FCM/WebPush) or SMS delivery to the user's device is currently a placeholder/not fully connected to production infrastructure.
* **Third Party API Limits**: Web scraping of 1mg/Pharmeasy relies on easily breakable CSS selectors and HTTPX logic. It is prone to being blocked by captchas and lacks proxy rotation.
* **Incomplete Features**: The `/api/news/` endpoints are basic RSS parsers but lack heavy personalization.

---

## 10. Readiness for Advanced Features

* ❌ **Is RAG already implemented?** Partially. It uses text chunking and keyword association, but lacks a formal embedding pipeline.
* ❌ **Is vector DB used?** No. Context is currently stored plainly in PostgreSQL.
* ⚠️ **Is confidence scoring present?** Partially implemented. Reports and vision APIs artificially default to setting a "confidence" key, but true statistical confidence metrics are not derived.
* ✅ **Any hallucination control?** Yes. `app.safety.output_guard` is fully implemented to prevent dangerous suggestions and automatically intercept emergency keywords (e.g., suicide, heart attack) to redirect the user to 108.

---

## 11. Setup Instructions

**Backend Setup**
1. Navigate to the `backend/` directory.
2. Create virtual environment: `python -m venv venv` and activate it.
3. Install reqs: `pip install -r requirements.txt`
4. Set up `.env` file containing `DATABASE_URL`, `GROQ_API_KEY`, `GEMINI_API_KEY`, and `SECRET_KEY`.
5. Run the server: `uvicorn app.main:app --reload`

**Frontend Setup**
1. Navigate to the `frontend/` directory.
2. Install Node dependencies: `npm install`
3. Start the Vite dev server: `npm run dev`

---

## 12. Summary for Next Development

### What is complete
The foundational architecture is entirely stable. Core APIs for conversational AI, medical report reading, prescription scanning, web-scraping medicine prices, chat history retention, and language localization work flawlessly and interact smoothly with the React frontend interfaces.

### What needs to be built next
1. **Implement true RAG**: Migrate `InsurancePolicy` text and `Report` texts into a Vector Database (like Qdrant or Pgvector) using proper embeddings (like `all-MiniLM-L6-v2`) to perform actual semantic search instead of keyword matching.
2. **Push Notifications**: Integrate web push or SMS (via Twilio/Firebase) hooked directly into the APScheduler for real-time reminders.
3. **Robust Scraping Infrastructure**: Replace raw HTTPX web-scraping in `medicines.py` with an official pharmacy API or use rotating proxies for sustainable price lookups. 
4. **Enhanced Security**: Further harden user PII through full encrypted-at-rest implementations.
