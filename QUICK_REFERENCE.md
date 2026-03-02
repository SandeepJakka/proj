# Quick Reference: Manual Frontend Updates

## 1. Profile.jsx - Add Toast & Sharing

### Step 1: Add imports at top
```jsx
import toast from 'react-hot-toast';
import { Share2, Copy, ExternalLink } from 'lucide-react';
import { getProfileSharing, updateProfileSharing } from '../services/api';
```

### Step 2: Replace alerts (lines 44-46)
```jsx
// OLD:
alert("Profile updated successfully!");
alert("Update failed.");

// NEW:
toast.success("Profile saved successfully!");
toast.error("Failed to save profile. Please try again.");
```

### Step 3: Add ProfileSharing component before closing </div> of profile-page
```jsx
{/* Add this entire section before the closing </div> of profile-page */}
<div className="form-section card" style={{ marginTop: 24 }}>
  <div className="section-title">
    <Share2 size={20} color="var(--accent-primary)" />
    <h2>🔗 Share Your Profile</h2>
  </div>
  <ProfileSharingSection />
</div>
```

### Step 4: Add ProfileSharingSection component (paste at end of file, before export)
See PHASE3_IMPLEMENTATION.md lines 150-250 for complete component code.

---

## 2. Sidebar.jsx - Add Reminders Link

### Add import
```jsx
import { Bell } from 'lucide-react';
```

### Add link (after Health Tips, before Lifestyle)
```jsx
<NavLink to="/reminders" className="sidebar-link">
  <Bell size={20} />
  <span>Reminders</span>
</NavLink>
```

---

## 3. App.jsx - Add Routes

### Add imports
```jsx
import Reminders from './pages/Reminders';
import PublicProfile from './pages/PublicProfile';
```

### Add routes
```jsx
{/* Public profile - no auth */}
<Route path="/profile/:username" element={<PublicProfile />} />

{/* Reminders - protected */}
<Route path="/reminders" element={
  <Protected>
    <Layout showSidebar={true}>
      <Reminders />
    </Layout>
  </Protected>
} />
```

---

## 4. Reports.jsx - Add Comparison

### Add imports
```jsx
import { compareReports } from '../services/api';
import ReactMarkdown from 'react-markdown';
```

### Add state
```jsx
const [comparison, setComparison] = useState(null);
const [comparing, setComparing] = useState(false);
```

### Add comparison handler
```jsx
const handleCompare = async (reportId1, reportId2) => {
  setComparing(true);
  try {
    const res = await compareReports(reportId1, reportId2, 'english');
    setComparison(res.data.comparison);
    toast.success('Comparison generated!');
  } catch (err) {
    toast.error('Failed to compare reports');
  } finally {
    setComparing(false);
  }
};
```

### Add comparison banner (in report detail view, after analysis)
```jsx
{selectedReport.previous_report_available && (
  <div style={{
    background: 'rgba(37,99,235,0.08)',
    border: '1px solid rgba(37,99,235,0.2)',
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }}>
    <span style={{ color: '#F8F9FA', fontSize: '0.875rem' }}>
      📊 You have a previous {selectedReport.report_type}. Compare to track your progress.
    </span>
    <button 
      className="btn btn-primary btn-sm"
      onClick={() => handleCompare(selectedReport.id, selectedReport.previous_report_id)}
      disabled={comparing}
    >
      {comparing ? 'Comparing...' : 'Compare Reports'}
    </button>
  </div>
)}

{comparison && (
  <div className="card" style={{ marginTop: 16 }}>
    <h3>📊 Report Comparison</h3>
    <ReactMarkdown>{comparison}</ReactMarkdown>
  </div>
)}
```

---

## ✅ VERIFICATION

After making these changes:

1. **Test Profile page:**
   - Save profile → should show toast, not alert
   - Set username → should validate 3-20 chars
   - Toggle public → should show field checkboxes
   - Copy link → should copy to clipboard

2. **Test Sidebar:**
   - Click Reminders → should navigate to /reminders

3. **Test Reminders page:**
   - Add reminder → should create successfully
   - Edit times → should update
   - Delete → should confirm and remove

4. **Test Reports:**
   - Upload report → should show comparison offer if previous exists
   - Click Compare → should show AI comparison

5. **Test Public Profile:**
   - Visit /profile/{username} → should show public fields only
   - Visit without username → should show 404

---

## 🐛 TROUBLESHOOTING

**Toast not showing:**
- Check if `<Toaster />` is in App.jsx or Layout.jsx
- Import: `import { Toaster } from 'react-hot-toast'`

**Reminders page blank:**
- Check console for errors
- Verify API endpoint is running
- Check localStorage for access_token

**Public profile 404:**
- Verify username is set in profile sharing
- Check profile_public is true
- Test API endpoint directly: GET /api/profile/public/{username}

**Comparison not working:**
- Verify both reports are same type
- Check report has previous_report_available flag
- Test API endpoint: POST /api/reports/compare

---

## 📞 SUPPORT

If you encounter issues:
1. Check browser console for errors
2. Check backend logs for API errors
3. Verify database tables created (medicine_reminders, health_plans)
4. Confirm scheduler started (check backend logs for "Reminder scheduler started")
5. Test API endpoints with Postman/curl

---

## 🎯 ESTIMATED TIME

- Profile.jsx updates: 15 minutes
- Sidebar.jsx update: 2 minutes
- App.jsx updates: 3 minutes
- Reports.jsx updates: 10 minutes

**Total: ~30 minutes**
