# File Viewing Feature - Test Checklist

## Database Migration
- [ ] Run migration SQL: `psql -U your_user -d healthora < backend/migrations/add_local_path_to_reports.sql`
- [ ] Verify column added: `\d reports` in psql should show `local_path` column

## Backend Testing

### File Storage
- [ ] Upload a new PDF report - verify file saved to `uploads/` folder
- [ ] Upload a new image report (JPG/PNG) - verify file saved to `uploads/` folder
- [ ] Check database - verify `local_path` column populated with file path

### File Serving Endpoint
- [ ] Test `/api/reports/{report_id}/file` endpoint with valid report ID
- [ ] Verify authentication required (401 without token)
- [ ] Verify user can only access their own reports (404 for other users' reports)
- [ ] Test with PDF file - verify correct Content-Type: `application/pdf`
- [ ] Test with JPG file - verify correct Content-Type: `image/jpeg`
- [ ] Test with PNG file - verify correct Content-Type: `image/png`
- [ ] Test with old report (no local_path) - verify fallback to S3 or 404

## Frontend Testing

### View Report Button
- [ ] Click on a report in left panel
- [ ] Verify "View Report" button appears in header
- [ ] Click "View Report" button
- [ ] Verify overlay opens with loading spinner

### PDF Viewer
- [ ] Upload and view a PDF report
- [ ] Verify PDF displays correctly in embed viewer
- [ ] Verify PDF is scrollable
- [ ] Verify PDF zoom controls work (browser native)
- [ ] Test on Chrome, Firefox, Edge

### Image Viewer
- [ ] Upload and view a JPG report
- [ ] Verify image displays correctly centered
- [ ] Verify image is responsive (scales to fit)
- [ ] Upload and view a PNG report
- [ ] Verify PNG transparency renders correctly

### Viewer Controls
- [ ] Verify filename and upload date display correctly
- [ ] Click Download button - verify file downloads with correct name
- [ ] Click Close button - verify overlay closes
- [ ] Click outside overlay - verify overlay closes
- [ ] Verify blob URL is revoked on close (check browser DevTools)

### Error Handling
- [ ] View old report (uploaded before feature) - verify helpful error message
- [ ] Test with network error - verify toast error appears
- [ ] Test with deleted file - verify graceful error handling

### Memory Management
- [ ] Open and close viewer multiple times
- [ ] Verify no memory leaks (check browser Task Manager)
- [ ] Verify blob URLs are properly revoked

## Edge Cases
- [ ] Very large PDF (>5MB) - verify loads correctly
- [ ] High resolution image - verify displays without breaking layout
- [ ] Report with special characters in filename
- [ ] Multiple rapid clicks on View Report button
- [ ] Switch between reports while viewer is open

## Security Testing
- [ ] Verify files are served through authenticated endpoint (not public static)
- [ ] Verify user cannot access other users' files by changing report_id
- [ ] Verify file paths are not exposed in frontend
- [ ] Verify uploads folder is not publicly accessible

## Backward Compatibility
- [ ] Old reports (before feature) still show in list
- [ ] Old reports can still generate AI analysis
- [ ] Old reports show appropriate message when View Report clicked
- [ ] Re-uploading old report enables file viewing

## Performance
- [ ] File loads in <2 seconds for typical report
- [ ] No lag when opening/closing viewer
- [ ] Multiple reports can be viewed in sequence smoothly

## Cross-Browser Testing
- [ ] Chrome - PDF and images
- [ ] Firefox - PDF and images
- [ ] Edge - PDF and images
- [ ] Safari (if available) - PDF and images

## Mobile Responsive (if applicable)
- [ ] Viewer overlay responsive on mobile
- [ ] PDF viewer works on mobile browsers
- [ ] Image viewer scales correctly on mobile
- [ ] Touch gestures work (pinch zoom on images)

## Notes
- PDF viewing uses browser's native PDF viewer (embed tag)
- Images are displayed with CSS max-width for responsiveness
- Blob URLs are created client-side for security
- Files are authenticated through backend endpoint
- Old reports need to be re-uploaded to enable file viewing
