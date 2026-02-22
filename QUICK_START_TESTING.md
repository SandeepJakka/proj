# 🚀 Quick Start - Test New Features

## Step 1: Restart Backend Server

```bash
# In backend directory
# Stop current server (Ctrl+C if running)
uvicorn app.main:app --reload
```

**Expected Output:**
```
INFO:     Will watch for changes in these directories: ['D:\\Healthora\\proj\\backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

## Step 2: Test Chat Persistence

### A. Create First Chat
1. Open browser: `http://localhost:5173`
2. Login (if needed)
3. Go to **Chat AI** page
4. Send message: "What are my latest lab results?"
5. Wait for response

### B. Verify Persistence
1. **Refresh the page** (F5)
2. Check left sidebar - your chat should appear
3. Message history should still be there

### C. Create Multiple Chats
1. Click **"+ New Chat"** button
2. Send different message: "Tell me about healthy eating"
3. Click **"+ New Chat"** again
4. Send: "What exercises should I do?"
5. Check sidebar - all 3 chats should be listed

---

## Step 3: Test Lab Integration

### A. Upload Lab Report (if not done)
1. Go to **Reports** page
2. Click **"Upload New Report"**
3. Select: `d:\Healthora\proj\test_lab_report.txt`
4. Wait for processing

### B. Test Lab-Aware Chat
1. Go back to **Chat AI**
2. Click **"+ New Chat"**
3. Ask: "What do my glucose levels show?"
4. AI should reference your actual lab values!

**Expected Response:**
```
Based on your recent lab results, your glucose is 145 mg/dL, 
which is above the normal range (70-99 mg/dL). This indicates...
```

---

## Step 4: Verify Database

```bash
# In backend directory
python -c "from app.db.database import engine; from sqlalchemy import text; conn = engine.connect(); result = conn.execute(text('SELECT COUNT(*) FROM chat_sessions')); print(f'Chat sessions: {result.scalar()}')"
```

**Expected:** Should show number of chat sessions created

---

## What to Look For

### ✅ Success Indicators
- [ ] Chat sidebar appears on left
- [ ] "New Chat" button visible
- [ ] Messages persist after refresh
- [ ] Multiple sessions work independently
- [ ] AI references actual lab values
- [ ] No errors in browser console (F12)
- [ ] No errors in backend logs

### ❌ Potential Issues

**Issue:** Sidebar doesn't appear
- **Fix:** Check browser console for errors
- **Fix:** Verify backend is running on port 8000

**Issue:** "Lab values not found"
- **Fix:** Upload a lab report first
- **Fix:** Check Reports page shows lab values

**Issue:** Sessions not saving
- **Fix:** Check backend logs for database errors
- **Fix:** Verify migration ran successfully

---

## Test Scenarios

### Scenario 1: New User Experience
1. Create account / Login
2. Upload lab report
3. Start chat
4. Ask about lab results
5. Verify AI knows the values

### Scenario 2: Returning User
1. Login
2. Check sidebar - previous chats appear
3. Click on old chat - history loads
4. Continue conversation

### Scenario 3: Multiple Sessions
1. Create 5 different chats
2. Switch between them
3. Each maintains separate history
4. Lab context available in all

---

## API Testing (Optional)

### Test Sessions Endpoint
```bash
curl -X GET "http://127.0.0.1:8000/api/chat/sessions" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
[
  {
    "session_id": "abc-123",
    "title": "New Chat",
    "created_at": "2026-02-12T00:10:10",
    "updated_at": "2026-02-12T00:15:30"
  }
]
```

### Test Chat with Session
```bash
curl -X POST "http://127.0.0.1:8000/api/chat/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are my lab results?", "session_id": "abc-123"}'
```

---

## Troubleshooting

### Backend Won't Start
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process if needed
taskkill /PID <PID> /F

# Restart
uvicorn app.main:app --reload
```

### Frontend Not Updating
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R

# Or restart Vite
cd frontend
npm run dev
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
# Windows: Services → PostgreSQL

# Test connection
psql -U healthora_user -d healthora_db
# Password: password
```

---

## Success Confirmation

When everything works, you should see:

1. **Chat Sidebar** with session list
2. **Lab Context** in AI responses
3. **Persistent History** across refreshes
4. **Multiple Sessions** working independently
5. **No Console Errors**

---

## Next Actions

After confirming everything works:

1. ✅ Mark chat persistence as COMPLETE
2. ✅ Mark lab integration as COMPLETE
3. 📋 Plan Tier 2 features (streaming, trends, etc.)
4. 🎉 Celebrate the integration!

---

## Support

If issues persist:
1. Check `CHAT_INTEGRATION_COMPLETE.md` for details
2. Review backend logs for errors
3. Check browser console (F12) for frontend errors
4. Verify database migration completed

**Migration Status:** ✅ Completed
**Files Modified:** 7
**New Features:** 3
**Integration Level:** 100%
