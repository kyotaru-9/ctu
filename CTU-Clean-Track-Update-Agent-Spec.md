# CTU Clean-Track-Update
## Full Agent Implementation Specification

> **Project Type:** Web-based classroom cleanliness monitoring and reporting system  
> **Frontend:** React.js + Bootstrap  
> **Backend:** Express.js  
> **Database/Auth/Storage:** Supabase  
> **QR:** Permanent unique QR code per room  
> **Primary Users:** Admin, Student, Student Special  
> **Target Environment:** Cebu Technological University (CTU) classroom/section workflow

---

# 1. PROJECT OVERVIEW

Build a complete responsive web application named **CTU Clean-Track-Update**.

The purpose of the system is to help CTU administrators monitor classroom cleanliness by recording classroom occupancy, before/after room-condition submissions, cleanliness reports, image proof, schedules, and section compliance.

The system should reduce manual monitoring by creating a digital record for each classroom occupation.

The application must be usable on:
- Desktop
- Laptop
- Tablet
- Mobile phone

The UI should be simple, clean, modern, and suitable for a university environment.

---

# 2. CORE CONCEPT

A student account represents a **whole class/section**, not an individual student.

When a section occupies a classroom:

1. The section logs into the system.
2. The student scans the classroom's permanent QR code.
3. The system identifies the room.
4. The section submits a **Before** room-condition photo.
5. Before leaving, the section submits an **After** room-condition photo.
6. The system records date/time, section, room, schedule, and images.
7. If the room is dirty/not clean, the section can submit a report.
8. The report contains a predefined reason, optional other reason/comment, and image proof.
9. Admin can monitor all submissions and reports.
10. The system calculates compliance statistics.

---

# 3. USER ROLES

## 3.1 Admin

Admin has complete management and monitoring access.

Admin functions:

- Login/logout
- Dashboard
- Manage students/sections
- Manage rooms
- Manage schedules
- Manage occupations/submissions
- Manage room QR codes
- View reports
- View analytics
- View compliance
- View submission history
- View student/section details
- Enable/disable student accounts
- Reset student passwords
- View system activity
- Manage predefined report reasons

---

## 3.2 Student

A Student account represents a class/section.

Student functions:

- Login/logout
- Dashboard
- View class information
- View schedule
- Scan room QR
- Submit Before room photo
- Submit After room photo
- View own submissions
- Report a room problem
- Upload image proof
- Select report reason
- Enter other reason/comment
- View report status
- View section compliance
- View submission history

---

## 3.3 Student Special

Student Special has a separate interface but follows the same general workflow.

Student Special functions:

- Login/logout
- Dashboard
- View schedule
- Identify/select room
- Upload Before image
- Enter submission time
- Upload After image
- Enter submission time
- Submit room condition
- Report room problems
- Upload image proof
- View reports
- View submission history

Important difference:

**Normal Student**
- Uses the website camera / device camera for photo capture.
- Uses room QR code.

**Student Special**
- Can upload an existing image.
- Manually enters the time when required.
- Has a separate dashboard/page navigation.

---

# 4. TECHNOLOGY STACK

## Frontend

Use:

- React
- Vite
- React Router
- Bootstrap
- React-Bootstrap
- JavaScript or TypeScript
- Axios or fetch
- QR scanner library compatible with browser camera
- QR display/generator library
- Responsive Bootstrap layout

Recommended:

```text
React
Vite
React Router
React-Bootstrap
Bootstrap Icons
Axios
html5-qrcode
qrcode
```

---

## Backend

Use:

- Node.js
- Express.js
- REST API
- dotenv
- CORS
- Supabase JavaScript client
- Multer only if needed for controlled upload handling

The frontend must communicate with the Express API for application operations.

Do not place Supabase service-role credentials in the frontend.

---

## Backend responsibilities

Express should handle:

- Authentication/session verification where applicable
- Role authorization
- Student management
- Section management
- Room management
- Schedule management
- QR validation
- Occupation/submission creation
- Before/after submission handling
- Reports
- Analytics
- Compliance calculations
- Admin operations
- File upload authorization
- Input validation
- Error handling

Supabase should provide:

- PostgreSQL database
- Authentication
- Storage
- Row Level Security
- Database functions/triggers where appropriate

---

# 5. PROJECT STRUCTURE

Use a structure similar to:

```text
ctu-clean-track-update/
│
├── client/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── admin/
│   │   │   ├── student/
│   │   │   └── special/
│   │   │
│   │   ├── layouts/
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── StudentLayout.jsx
│   │   │   └── SpecialStudentLayout.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   ├── student/
│   │   │   └── special/
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── authService.js
│   │   │   ├── roomService.js
│   │   │   ├── submissionService.js
│   │   │   └── reportService.js
│   │   │
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── utils/
│   │   ├── routes/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── app.js
│   │   └── server.js
│   │
│   └── package.json
│
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── README.md
│
├── .env.example
├── README.md
└── package.json
```

---

# 6. DATABASE DESIGN

Use Supabase PostgreSQL.

Create the following main tables.

---

## 6.1 profiles

Stores application user information linked to Supabase Auth.

Fields:

```text
id UUID PRIMARY KEY
auth_user_id UUID UNIQUE
role ENUM
full_name TEXT
email TEXT
is_active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

Roles:

```text
admin
student
student_special
```

---

## 6.2 sections

Represents a class/section.

Fields:

```text
id UUID PRIMARY KEY
program TEXT
year_level TEXT
section_name TEXT
shift ENUM(day, night)
mayor_name TEXT
student_type ENUM(student, student_special)
is_active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

Example:

```text
Program: BSIT
Year: 4
Section: A
Shift: Day
Mayor: Juan Dela Cruz
Type: Student
```

---

## 6.3 rooms

Stores classroom information.

Fields:

```text
id UUID PRIMARY KEY
room_code TEXT UNIQUE
room_name TEXT
building TEXT
floor TEXT
description TEXT
qr_token TEXT UNIQUE
qr_generated_at TIMESTAMP
is_active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

Important:

Each room has **one permanent unique QR token**.

Do not regenerate the QR token during normal editing.

---

# 7. QR CODE REQUIREMENTS

Every room must have exactly one permanent QR code.

Example:

```text
ROOM-001
QR TOKEN: random cryptographically secure token
```

The QR should contain a safe URL such as:

```text
https://your-domain.com/scan/<qr-token>
```

Do not place sensitive information in the QR.

The QR token must be:

- Unique
- Random
- Non-sequential
- Permanent unless an administrator explicitly regenerates it
- Validated by the backend

Admin can:

- View QR
- Generate/download QR image
- Print QR
- Regenerate QR only through an explicit action

If regenerated, the old QR becomes invalid.

---

# 8. schedules

Stores scheduled room usage.

Fields:

```text
id UUID PRIMARY KEY
section_id UUID
room_id UUID
subject_name TEXT
instructor_name TEXT
day_of_week INTEGER
start_time TIME
end_time TIME
is_active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

Day:

```text
0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
```

Prevent conflicting schedules where possible.

---

# 9. occupations

Represents a classroom occupation by a section.

Fields:

```text
id UUID PRIMARY KEY
section_id UUID
room_id UUID
schedule_id UUID NULL
occupation_date DATE
started_at TIMESTAMP
ended_at TIMESTAMP NULL
status ENUM(active, completed, cancelled)
created_at TIMESTAMP
updated_at TIMESTAMP
```

A section should not have multiple active occupations for the same room/date unless explicitly allowed.

---

# 10. room_submissions

Stores Before and After room-condition submissions.

Fields:

```text
id UUID PRIMARY KEY
occupation_id UUID
section_id UUID
room_id UUID
submission_type ENUM(before, after)
image_url TEXT
submitted_at TIMESTAMP
submitted_time TIME
condition ENUM(clean, not_clean)
notes TEXT NULL
submitted_by UUID
created_at TIMESTAMP
```

Important:

A normal Student uses the camera to create the image.

Student Special uploads an image and may manually provide the submission time.

---

# 11. reports

Stores room cleanliness reports.

Fields:

```text
id UUID PRIMARY KEY
section_id UUID
room_id UUID
occupation_id UUID NULL
reported_by UUID
reason_id UUID
other_reason TEXT NULL
description TEXT NULL
image_url TEXT
status ENUM(pending, reviewed, resolved, rejected)
admin_note TEXT NULL
reported_at TIMESTAMP
reviewed_at TIMESTAMP NULL
reviewed_by UUID NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

Image proof should be required.

---

# 12. report_reasons

Predefined cleanliness problems.

Fields:

```text
id UUID PRIMARY KEY
name TEXT
description TEXT NULL
is_active BOOLEAN
created_at TIMESTAMP
```

Seed examples:

```text
Trash left in room
Dirty floor
Dirty chairs/desks
Unclean board
Food waste
Improperly arranged chairs
Dust/dirt present
Damaged or messy classroom area
Other
```

Admin can manage these reasons.

---

# 13. compliance_records

This can be calculated dynamically or stored for reporting.

Recommended fields:

```text
id UUID PRIMARY KEY
section_id UUID
period_start DATE
period_end DATE
total_expected_submissions INTEGER
total_completed_submissions INTEGER
total_late_submissions INTEGER
total_reports INTEGER
compliance_rate NUMERIC
created_at TIMESTAMP
updated_at TIMESTAMP
```

Prefer calculating current compliance from actual records rather than trusting manually entered values.

---

# 14. audit_logs

Stores important administrative actions.

Fields:

```text
id UUID PRIMARY KEY
user_id UUID
action TEXT
entity_type TEXT
entity_id UUID NULL
description TEXT
ip_address TEXT NULL
created_at TIMESTAMP
```

Examples:

```text
Created room
Updated room
Deleted section
Created schedule
Generated QR
Regenerated QR
Changed report status
Disabled student account
```

---

# 15. STORAGE

Create Supabase Storage buckets.

Recommended:

```text
room-submissions
report-proofs
profile-images
```

Storage rules must prevent unauthorized users from viewing private data.

Do not make all buckets public unless the security design explicitly requires it.

Prefer signed URLs for private images.

---

# 16. AUTHENTICATION

Use Supabase Auth.

Login form:

```text
Email
Password
Login
```

After login:

```text
Admin → /admin
Student → /student
Student Special → /special
```

Do not trust the frontend role alone.

The Express API must verify the authenticated user and role.

---

# 17. AUTHORIZATION

Create middleware:

```text
authenticateUser
requireAdmin
requireStudent
requireStudentSpecial
requireStudentOrSpecial
```

Example:

```text
GET /api/admin/rooms
→ authenticated admin only
```

Student must never be able to call admin management endpoints successfully.

---

# 18. ADMIN DASHBOARD

Route:

```text
/admin
```

Display:

- Total active sections
- Total active rooms
- Today's schedules
- Today's occupations
- Completed submissions
- Missing submissions
- Clean rooms
- Reported rooms
- Pending reports
- Overall compliance rate

Dashboard cards:

```text
Total Sections
Total Rooms
Today's Occupations
Completed
Pending
Reports
Compliance Rate
```

Charts:

- Daily submission count
- Clean vs not-clean submissions
- Reports by reason
- Section compliance
- Room issue frequency

---

# 19. ADMIN STUDENTS/SECTIONS PAGE

Route:

```text
/admin/students
```

The interface should focus on sections/classes.

Top controls:

- Search
- Filter program
- Filter year
- Filter shift
- Filter status
- Add Section

Statistics:

```text
Total Sections
Active Sections
Inactive Sections
```

Table columns:

```text
Mayor
Program
Year
Section
Shift
Status
Submissions
Compliance Rate
Actions
```

Actions:

```text
View
Message
Edit
Manage Credentials
Disable/Enable
Delete
```

---

# 20. ADD SECTION MODAL

Fields:

```text
Mayor Name
Program
Year Level
Section
Shift
Student Type
Email
Password
```

Student type:

```text
Student
Student Special
```

When creating the section account:

1. Create Supabase Auth user.
2. Create profile.
3. Create section.
4. Link profile to section.

If using an admin-created account, the server must use a secure service-role operation without exposing the service key to the browser.

---

# 21. ADMIN ROOMS PAGE

Route:

```text
/admin/rooms
```

Display:

```text
Room Code
Room Name
Building
Floor
Status
QR
Actions
```

Actions:

```text
View
Edit
Print QR
Download QR
Regenerate QR
Deactivate
Delete
```

Add Room modal:

```text
Room Code
Room Name
Building
Floor
Description
```

When a room is created:

1. Generate secure random QR token.
2. Save token.
3. Generate QR.
4. Display QR.

---

# 22. QR PRINT PAGE

Create a print-friendly QR page.

Display:

```text
CTU CLEAN-TRACK-UPDATE

ROOM: LAB 101
ROOM CODE: LAB-101

[ QR CODE ]

Scan this QR code before submitting room condition.
```

Make it suitable for printing and posting outside a classroom.

---

# 23. ADMIN SCHEDULE PAGE

Route:

```text
/admin/schedules
```

Features:

- Create schedule
- Edit schedule
- Delete schedule
- Activate/deactivate
- Filter by day
- Filter by room
- Filter by section
- Detect schedule conflicts

Fields:

```text
Section
Room
Subject
Instructor
Day
Start Time
End Time
```

---

# 24. ADMIN OCCUPATIONS PAGE

Route:

```text
/admin/occupations
```

Display classroom usage records.

Columns:

```text
Date
Section
Room
Subject
Start
End
Before
After
Status
```

Statuses:

```text
Active
Completed
Cancelled
```

Clicking a record should show:

- Occupation details
- Before image
- After image
- Submission timestamps
- Condition
- Reports

---

# 25. ADMIN REPORTS PAGE

Route:

```text
/admin/reports
```

Display all room cleanliness reports.

Filters:

```text
Date
Room
Section
Reason
Status
```

Table:

```text
Date
Time
Section
Room
Reason
Image
Status
Actions
```

Actions:

```text
View
Mark Reviewed
Resolve
Reject
Add Admin Note
```

Report details:

```text
Reporter
Section
Room
Date/time
Reason
Other reason
Description
Image proof
Status
Admin note
```

---

# 26. ADMIN ANALYTICS PAGE

Route:

```text
/admin/analytics
```

Display:

### Section compliance

```text
Section
Expected
Completed
Missing
Late
Compliance %
```

### Room issues

```text
Room
Total reports
Most common issue
```

### Report reasons

Chart showing:

```text
Dirty floor
Trash
Messy desks
Food waste
Other
...
```

### Time trends

Display:

- Daily reports
- Weekly reports
- Monthly reports
- Cleanliness trends

---

# 27. ADMIN AUDIT LOG PAGE

Route:

```text
/admin/audit-logs
```

Display:

```text
Date
User
Action
Entity
Description
```

Add filters:

- Date
- User
- Action
- Entity

---

# 28. STUDENT DASHBOARD

Route:

```text
/student
```

Display:

```text
Welcome, [Section/Major]

Today's Schedule
Current Room
Today's Submission Status
Compliance Rate
Recent Reports
```

Cards:

```text
Today's Classes
Completed Submissions
Pending Submission
Compliance
```

Quick buttons:

```text
Scan Room QR
Submit Room Condition
Report Room
View Schedule
View History
```

---

# 29. STUDENT SCHEDULE PAGE

Route:

```text
/student/schedule
```

Display:

```text
Day
Time
Subject
Instructor
Room
Status
```

Highlight the current/upcoming class.

---

# 30. STUDENT QR SCANNER

Route:

```text
/student/scan
```

Use device camera.

UI:

```text
Scan Room QR Code
[ Camera Area ]
```

After successful scan:

```text
Room:
LAB 101

Continue
```

The QR token must be validated by Express.

Do not trust room IDs supplied directly by the browser.

---

# 31. STUDENT BEFORE SUBMISSION

After scanning:

```text
Room: LAB 101
Section: BSIT 4A
Date: September 25, 2026
Time: 1:30 PM
```

Display camera.

Buttons:

```text
Capture Photo
Retake
Submit Before Condition
```

Optional condition:

```text
Clean
Not Clean
```

The image must be uploaded to Supabase Storage.

Then create:

```text
room_submissions
```

with:

```text
submission_type = before
```

---

# 32. STUDENT AFTER SUBMISSION

Before leaving the room:

```text
Room: LAB 101
Section: BSIT 4A
```

Camera:

```text
Capture After Photo
Retake
Submit
```

Save:

```text
submission_type = after
```

Update occupation status when appropriate.

---

# 33. SUBMISSION VALIDATION

Before submission, backend should verify:

1. User is authenticated.
2. User has student role.
3. Student belongs to a valid active section.
4. QR token belongs to an active room.
5. Date/time is valid.
6. Student has a relevant schedule/occupation when required.
7. Duplicate submission rules are respected.
8. Image exists.
9. Image type is allowed.
10. File size is within configured limit.

Recommended image restrictions:

```text
JPEG
PNG
WEBP
```

Example maximum:

```text
10 MB
```

Compress images on the client when reasonable.

---

# 34. STUDENT REPORT ROOM

Route:

```text
/student/report
```

Form:

```text
Room
Reason
Other Reason
Description
Image Proof
```

Reason dropdown comes from:

```text
report_reasons
```

If "Other" is selected:

```text
Other Reason
```

becomes required.

Image proof is required.

Submit button:

```text
Submit Report
```

After submission:

```text
Report submitted successfully.
```

---

# 35. STUDENT REPORT HISTORY

Route:

```text
/student/reports
```

Display:

```text
Date
Room
Reason
Status
```

Clicking opens details.

Status:

```text
Pending
Reviewed
Resolved
Rejected
```

Students cannot change admin status.

---

# 36. STUDENT SUBMISSION HISTORY

Route:

```text
/student/history
```

Display:

```text
Date
Room
Subject
Before
After
Status
```

Click a record to view:

- Before image
- After image
- Times
- Conditions
- Related report

---

# 37. STUDENT SPECIAL DASHBOARD

Route:

```text
/special
```

Use a separate layout/navigation.

Display:

```text
Today's Schedule
Current Room
Submission Status
Compliance
Recent Reports
```

Buttons:

```text
Submit Before
Submit After
Report Room
Schedule
History
Reports
```

---

# 38. STUDENT SPECIAL SUBMISSION

Student Special does not have to use the embedded camera.

Form:

```text
Room
Date
Submission Time
Upload Image
Condition
Notes
```

For Before:

```text
Before Image
Before Time
```

For After:

```text
After Image
After Time
```

The backend should still validate the submitted time and prevent unreasonable/future timestamps according to project rules.

---

# 39. NAVIGATION

## Admin

```text
Dashboard
Students / Sections
Rooms
Schedules
Occupations
Reports
Analytics
Audit Logs
Settings
Logout
```

## Student

```text
Dashboard
Scan QR
Schedule
Submit Condition
Reports
History
Logout
```

## Student Special

```text
Dashboard
Submit Before
Submit After
Schedule
Reports
History
Logout
```

---

# 40. API DESIGN

Base URL:

```text
/api
```

---

## Authentication

```text
GET /api/auth/me
POST /api/auth/logout
```

Supabase Auth should handle actual authentication.

---

## Admin sections

```text
GET    /api/admin/sections
GET    /api/admin/sections/:id
POST   /api/admin/sections
PUT    /api/admin/sections/:id
DELETE /api/admin/sections/:id
PATCH  /api/admin/sections/:id/status
```

---

## Rooms

```text
GET    /api/admin/rooms
GET    /api/admin/rooms/:id
POST   /api/admin/rooms
PUT    /api/admin/rooms/:id
DELETE /api/admin/rooms/:id
POST   /api/admin/rooms/:id/regenerate-qr
GET    /api/rooms/qr/:token
```

---

## Schedules

```text
GET    /api/admin/schedules
POST   /api/admin/schedules
PUT    /api/admin/schedules/:id
DELETE /api/admin/schedules/:id
```

---

## Occupations

```text
GET  /api/admin/occupations
GET  /api/admin/occupations/:id
POST /api/occupations
POST /api/occupations/:id/complete
```

---

## Submissions

```text
POST /api/submissions/before
POST /api/submissions/after
GET  /api/submissions/my
GET  /api/submissions/:id
```

---

## Reports

```text
GET  /api/admin/reports
GET  /api/admin/reports/:id
PATCH /api/admin/reports/:id/status
POST /api/reports
GET  /api/reports/my
GET  /api/reports/:id
```

---

## Analytics

```text
GET /api/admin/analytics/overview
GET /api/admin/analytics/sections
GET /api/admin/analytics/rooms
GET /api/admin/analytics/reasons
GET /api/admin/analytics/trends
```

---

## Audit

```text
GET /api/admin/audit-logs
```

---

# 41. API RESPONSE FORMAT

Use consistent responses.

Success:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Unable to complete operation.",
  "error": "Detailed developer-safe error"
}
```

Do not expose database secrets or stack traces to the browser.

---

# 42. IMAGE UPLOAD FLOW

Recommended:

```text
React
 ↓
Validate file
 ↓
Express API
 ↓
Validate authenticated user
 ↓
Upload to Supabase Storage
 ↓
Save file path in database
 ↓
Return submission/report
```

File names should not contain sensitive information.

Use generated unique paths:

```text
room-submissions/{sectionId}/{occupationId}/{uuid}.jpg
```

Reports:

```text
report-proofs/{sectionId}/{reportId}/{uuid}.jpg
```

---

# 43. DATABASE SECURITY

Enable Row Level Security.

Admin:

- Full access according to admin policies.

Student:

- Read/write only their own section's records.
- Cannot access another section's submissions.
- Cannot modify reports after submission.
- Cannot access admin data.

Student Special:

- Same data restrictions as Student.

Do not rely only on frontend route protection.

---

# 44. SUPABASE RLS CONCEPT

Policies should enforce:

### Student

Can view:

```text
Own profile
Own section
Own schedules
Own occupations
Own submissions
Own reports
```

Can insert:

```text
Own submissions
Own reports
```

Cannot:

```text
Delete submissions
Change report status
Change compliance values
Modify room data
Modify schedules
Modify another section
```

### Admin

Can manage all application records.

---

# 45. SECURITY REQUIREMENTS

Implement:

- Supabase Auth
- Backend authorization
- Role checks
- Input validation
- SQL-safe Supabase queries
- CORS configuration
- Environment variables
- Rate limiting for sensitive endpoints if practical
- File type validation
- File size validation
- Secure QR tokens
- No service-role key in frontend
- No passwords stored manually
- No sensitive information in QR codes

Never commit:

```text
.env
service-role keys
database passwords
API secrets
```

---

# 46. ENVIRONMENT VARIABLES

Create:

```text
.env.example
```

Example:

```env
# Server
PORT=5000
CLIENT_URL=http://localhost:5173

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The service role key must exist only on the Express server.

Frontend should only receive safe public configuration.

---

# 47. UI DESIGN

Use Bootstrap.

General style:

- Clean
- Modern
- Academic
- Responsive
- Easy to navigate
- Large buttons on mobile
- Clear status badges
- Consistent cards
- Minimal unnecessary animations

Suggested layout:

```text
Sidebar
    ↓
Main Content
```

Mobile:

```text
Top Navbar
Content
Bottom/Collapsible Navigation
```

Use Bootstrap components:

```text
Navbar
Sidebar
Cards
Tables
Modals
Forms
Badges
Alerts
Pagination
Dropdowns
Offcanvas
Spinner
Toast
```

---

# 48. STATUS COLORS

Use semantic Bootstrap classes.

Examples:

```text
Success → clean/completed/resolved
Warning → pending/reviewed
Danger → not clean/rejected
Secondary → inactive
Primary → active/information
```

Do not depend on color alone.

Always include text labels.

---

# 49. FORM VALIDATION

Frontend:

- Required fields
- Correct formats
- File validation
- Time validation
- Duplicate prevention where possible

Backend:

Repeat all important validation.

Never trust frontend validation alone.

---

# 50. ERROR HANDLING

Create a global Express error handler.

Frontend should display friendly messages.

Examples:

```text
"Your session has expired. Please log in again."

"The QR code is invalid or inactive."

"You already submitted a Before photo for this occupation."

"Image upload failed. Please try again."

"You are not authorized to perform this action."
```

---

# 51. LOADING STATES

Every API action should have a loading state.

Examples:

```text
Loading dashboard...
Saving section...
Uploading image...
Submitting report...
Generating QR...
```

Disable buttons during submission to prevent duplicates.

---

# 52. EMPTY STATES

Do not leave blank screens.

Examples:

```text
No schedules found.
No reports yet.
No submissions found.
No rooms available.
No sections found.
```

Provide useful action buttons where appropriate.

---

# 53. RESPONSIVE REQUIREMENTS

Test:

```text
1920px desktop
1440px desktop
1024px tablet
768px tablet
390px mobile
360px mobile
```

Tables should become responsive.

Camera submission must work well on mobile.

---

# 54. QR CAMERA REQUIREMENTS

The scanner must request camera permission.

If denied:

```text
Camera access is required to scan the room QR code.
```

Provide an alternative:

```text
Enter QR token manually
```

only if the project rules allow it.

The normal workflow should prioritize camera scanning.

---

# 55. DUPLICATE SUBMISSION RULES

Prevent duplicate Before submissions for the same occupation.

Prevent duplicate After submissions for the same occupation.

Recommended:

```text
One Before
One After
```

per occupation.

If correction is required, Admin can handle it rather than allowing unlimited duplicates.

---

# 56. OCCUPATION LOGIC

When a Student scans a QR:

1. Validate QR.
2. Find today's applicable schedule.
3. Find section.
4. Check whether an occupation exists.
5. Create occupation if permitted.
6. Allow Before submission.
7. Later allow After submission.

The UI should show:

```text
Before: Completed
After: Pending
```

After submission:

```text
Before: Completed
After: Completed
Occupation: Completed
```

---

# 57. COMPLIANCE LOGIC

Compliance should be based on actual expected vs completed submissions.

Example:

```text
Expected: 20
Completed: 18
Compliance = 90%
```

The exact project formula can be configured in one service.

Do not hard-code calculations across many frontend components.

Create:

```text
complianceService.js
```

---

# 58. REPORT WORKFLOW

```text
Student submits report
        ↓
Status = Pending
        ↓
Admin reviews
        ↓
Reviewed
        ↓
Admin resolves or rejects
        ↓
Resolved / Rejected
```

Admin may add:

```text
Admin Note
```

Students can view status but cannot alter it.

---

# 59. NOTIFICATION SYSTEM

For the first implementation, use in-app notifications/toasts.

Optional database table:

```text
notifications
```

Fields:

```text
id
user_id
title
message
type
is_read
created_at
```

Examples:

```text
Your report has been reviewed.
Your report has been resolved.
Your submission is incomplete.
```

Email/push notifications are not required for the MVP.

---

# 60. SETTINGS

Admin settings can include:

```text
System Name
Submission Time Rules
Allowed Image Types
Maximum Image Size
Report Reasons
```

Keep configuration centralized.

---

# 61. SEED DATA

Create `seed.sql`.

Include:

### Rooms

```text
LAB-101
LAB-102
ROOM-201
ROOM-202
```

### Sections

```text
BSIT 4A
BSIT 4B
```

### Report reasons

```text
Trash left in room
Dirty floor
Dirty chairs/desks
Food waste
Unclean board
Improperly arranged furniture
Other
```

Do not hard-code these values into React.

---

# 62. DATABASE INDEXES

Add indexes for frequently queried fields.

Examples:

```text
profiles.auth_user_id
profiles.role
sections.program
sections.is_active
rooms.room_code
rooms.qr_token
rooms.is_active
schedules.section_id
schedules.room_id
schedules.day_of_week
occupations.section_id
occupations.room_id
occupations.occupation_date
room_submissions.occupation_id
room_submissions.section_id
room_submissions.room_id
reports.section_id
reports.room_id
reports.status
reports.reported_at
audit_logs.user_id
audit_logs.created_at
```

---

# 63. API PAGINATION

Admin lists should support pagination.

Example:

```text
?page=1&limit=20
```

Return:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

# 64. SEARCH

Implement server-side search for large lists.

Sections:

```text
mayor
program
section
```

Rooms:

```text
room code
room name
building
```

Reports:

```text
section
room
reason
```

---

# 65. MODAL REQUIREMENTS

Use reusable Bootstrap modal components.

Examples:

```text
ConfirmDeleteModal
ConfirmActionModal
AddSectionModal
EditSectionModal
AddRoomModal
EditRoomModal
AddScheduleModal
ReportDetailsModal
QRModal
```

---

# 66. REUSABLE COMPONENTS

Create:

```text
LoadingSpinner
EmptyState
ErrorAlert
ConfirmModal
StatusBadge
SearchBar
Pagination
ImagePreview
PageHeader
StatCard
DataTable
QRDisplay
CameraCapture
FileUpload
```

Do not duplicate large UI sections unnecessarily.

---

# 67. CAMERA COMPONENT

Create:

```text
CameraCapture.jsx
```

Functions:

```text
Start camera
Capture image
Retake
Confirm
Stop camera
```

Handle:

- Permission denied
- No camera
- Mobile camera orientation
- Browser compatibility
- Camera cleanup

Stop media tracks when leaving the page.

---

# 68. IMAGE PREVIEW

Before upload, show:

```text
Preview
File size
File type
Remove
Replace
```

Do not upload invalid files.

---

# 69. ROUTING

Use protected routes.

Example:

```text
/login

/admin
/admin/students
/admin/rooms
/admin/schedules
/admin/occupations
/admin/reports
/admin/analytics
/admin/audit-logs

/student
/student/scan
/student/schedule
/student/submit
/student/reports
/student/history

/special
/special/before
/special/after
/special/schedule
/special/reports
/special/history

/scan/:qrToken
```

Unauthorized users should be redirected appropriately.

---

# 70. QR DEEP LINK

When scanning a QR:

```text
/scan/:qrToken
```

The application should:

1. Check authentication.
2. If not logged in:
   - Show room information.
   - Ask user to log in.
   - Preserve QR token after login.
3. If logged in as Student:
   - Validate token.
   - Show submission screen.
4. If Student Special:
   - Show special submission workflow.
5. If Admin:
   - Show room information/admin view.

---

# 71. ADMIN DELETE RULES

Avoid hard deleting records that are needed for history.

Prefer:

```text
is_active = false
```

for:

- Sections
- Rooms
- Schedules
- Users

Reports and submissions should normally be preserved for audit/history.

---

# 72. AUDIT REQUIREMENTS

Log:

```text
Create
Update
Delete/deactivate
QR regeneration
Report status change
Account status change
Schedule change
Room change
```

Do not log passwords.

---

# 73. TESTING REQUIREMENTS

Create tests for:

### Authentication

- Valid login
- Invalid login
- Logout
- Unauthorized route

### Roles

- Admin access
- Student access
- Student Special access
- Cross-role access rejection

### QR

- Valid QR
- Invalid QR
- Inactive room QR
- Regenerated QR invalidates old QR

### Submission

- Valid Before
- Duplicate Before
- Valid After
- Duplicate After
- Missing image
- Invalid image
- Unauthorized submission

### Reports

- Valid report
- Missing reason
- Missing proof
- Other reason validation
- Admin status update

### Admin

- CRUD rooms
- CRUD sections
- CRUD schedules
- Analytics

---

# 74. SECURITY TESTING

Verify:

- Student cannot access `/api/admin/*`.
- Student cannot access another section's data.
- Student cannot modify report status.
- Student cannot change another section's submission.
- Service role key is not present in frontend bundle.
- Invalid QR tokens are rejected.
- Malicious file types are rejected.
- Oversized files are rejected.
- Invalid IDs are handled safely.
- CORS is configured correctly.

---

# 75. ACCESSIBILITY

Use:

- Proper labels
- Keyboard-accessible buttons
- `aria-label` where needed
- Good contrast
- Visible focus states
- Descriptive error messages
- Alt text for images
- Do not use color as the only status indicator

---

# 76. DEVELOPMENT PHASES

The agent should build the project in phases.

## Phase 1 — Project setup

Tasks:

- Create React Vite app
- Create Express server
- Configure Bootstrap
- Configure Supabase
- Configure environment variables
- Configure CORS
- Create folder structure
- Create routing
- Create basic layouts

Deliverable:

```text
Frontend and backend run successfully.
```

---

## Phase 2 — Database

Tasks:

- Create migrations
- Create enums
- Create tables
- Create indexes
- Create foreign keys
- Create RLS policies
- Create storage buckets
- Create seed data

Deliverable:

```text
Database is ready.
```

---

## Phase 3 — Authentication

Tasks:

- Supabase Auth
- Login
- Logout
- Profile retrieval
- Role detection
- Protected routes
- Express authentication middleware

Deliverable:

```text
Admin / Student / Student Special can log in correctly.
```

---

## Phase 4 — Admin foundation

Build:

- Admin layout
- Sidebar
- Dashboard
- Sections
- Rooms
- Schedules

Deliverable:

```text
Admin can manage basic system data.
```

---

## Phase 5 — QR system

Build:

- Permanent room QR token
- QR generation
- QR display
- QR printing
- QR scanning
- QR validation

Deliverable:

```text
Room QR workflow works end-to-end.
```

---

## Phase 6 — Student workflow

Build:

- Student dashboard
- Schedule
- QR scanner
- Before submission
- After submission
- Submission history

Deliverable:

```text
Student can complete a room occupation.
```

---

## Phase 7 — Student Special

Build:

- Separate layout
- Dashboard
- Upload Before
- Manual time
- Upload After
- Manual time
- History

Deliverable:

```text
Student Special can complete the alternative workflow.
```

---

## Phase 8 — Reports

Build:

- Report form
- Image proof
- Predefined reasons
- Other reason
- Student report history
- Admin report management
- Report statuses

Deliverable:

```text
Complete report workflow.
```

---

## Phase 9 — Analytics

Build:

- Compliance
- Room issues
- Section statistics
- Report trends
- Dashboard charts

Deliverable:

```text
Admin can monitor cleanliness trends.
```

---

## Phase 10 — Security and audit

Build:

- Audit logs
- RLS verification
- Role middleware
- File restrictions
- Rate limiting where needed
- Error handling
- Security review

---

## Phase 11 — Testing

Test all major workflows.

Fix:

- Broken routes
- UI bugs
- Database errors
- Permission issues
- Duplicate submissions
- Mobile camera issues

---

## Phase 12 — Final polish

Improve:

- Responsive UI
- Loading states
- Empty states
- Error messages
- Accessibility
- Print QR page
- Dashboard layout

---

# 77. AGENT TASK TRACKER

The coding agent should maintain this checklist.

## Setup

- [ ] Initialize repository
- [ ] Initialize React/Vite
- [ ] Initialize Express
- [ ] Install dependencies
- [ ] Configure environment
- [ ] Configure Supabase
- [ ] Configure Bootstrap

## Database

- [ ] Create profiles
- [ ] Create sections
- [ ] Create rooms
- [ ] Create schedules
- [ ] Create occupations
- [ ] Create room_submissions
- [ ] Create report_reasons
- [ ] Create reports
- [ ] Create compliance_records
- [ ] Create audit_logs
- [ ] Create notifications if used
- [ ] Add indexes
- [ ] Add RLS
- [ ] Add storage policies
- [ ] Add seed data

## Authentication

- [ ] Login
- [ ] Logout
- [ ] Current user
- [ ] Role detection
- [ ] Protected routes
- [ ] Backend auth middleware
- [ ] Role middleware

## Admin

- [ ] Dashboard
- [ ] Sections
- [ ] Section CRUD
- [ ] Rooms
- [ ] Room CRUD
- [ ] QR generation
- [ ] QR printing
- [ ] QR regeneration
- [ ] Schedules
- [ ] Occupations
- [ ] Reports
- [ ] Analytics
- [ ] Audit logs

## Student

- [ ] Dashboard
- [ ] Schedule
- [ ] QR scanner
- [ ] Before submission
- [ ] After submission
- [ ] Submission history
- [ ] Report room
- [ ] Report history

## Student Special

- [ ] Dashboard
- [ ] Schedule
- [ ] Before upload
- [ ] Manual time
- [ ] After upload
- [ ] Manual time
- [ ] Report
- [ ] History

## Security

- [ ] RLS
- [ ] Backend role authorization
- [ ] File validation
- [ ] QR validation
- [ ] Input validation
- [ ] CORS
- [ ] Environment secrets
- [ ] Audit logs

## Testing

- [ ] Authentication
- [ ] Authorization
- [ ] QR
- [ ] Before submission
- [ ] After submission
- [ ] Reports
- [ ] Admin CRUD
- [ ] Analytics
- [ ] Mobile
- [ ] Camera
- [ ] Storage

---

# 78. ACCEPTANCE CRITERIA

The project is considered complete only when all of these work.

## Authentication

- [ ] Admin can log in.
- [ ] Student can log in.
- [ ] Student Special can log in.
- [ ] Users are redirected to the correct dashboard.
- [ ] Unauthorized users cannot access protected pages.

## Rooms

- [ ] Admin can create a room.
- [ ] Every room gets a unique permanent QR.
- [ ] Admin can display QR.
- [ ] Admin can print QR.
- [ ] Admin can deactivate room.
- [ ] Old QR becomes invalid after regeneration.

## Student workflow

- [ ] Student scans room QR.
- [ ] Backend validates QR.
- [ ] Relevant room appears.
- [ ] Student submits Before image.
- [ ] Student submits After image.
- [ ] Duplicate submissions are prevented.
- [ ] History displays both images.

## Student Special

- [ ] Special student sees separate interface.
- [ ] Special student uploads Before image.
- [ ] Special student enters time.
- [ ] Special student uploads After image.
- [ ] Special student enters time.

## Reports

- [ ] Student can report a room.
- [ ] Reason is required.
- [ ] Other reason works.
- [ ] Image proof is required.
- [ ] Admin sees report.
- [ ] Admin can change status.
- [ ] Student can see status.

## Admin

- [ ] Admin can manage sections.
- [ ] Admin can manage rooms.
- [ ] Admin can manage schedules.
- [ ] Admin can view occupations.
- [ ] Admin can view reports.
- [ ] Admin can view analytics.
- [ ] Admin can view audit logs.

## Security

- [ ] Student cannot access admin API.
- [ ] Students cannot view other sections' private records.
- [ ] Service key never reaches browser.
- [ ] Storage access is protected.
- [ ] QR tokens are secure.

---

# 79. IMPORTANT BUSINESS RULES

The coding agent MUST follow these rules.

### Rule 1

A Student account represents a **section/class**, not an individual student.

### Rule 2

Each room has **one permanent unique QR code**.

### Rule 3

Normal Students use the website/device camera for room photos.

### Rule 4

Student Special has a separate interface and can upload images with manually entered time.

### Rule 5

A room report requires an image proof.

### Rule 6

Reports use predefined reasons plus an Other option.

### Rule 7

Students cannot change admin decisions.

### Rule 8

Submissions cannot be freely duplicated.

### Rule 9

Historical records should be preserved.

### Rule 10

Frontend security is not enough. Backend authorization and Supabase RLS are required.

---

# 80. DO NOT DO THESE

The agent must NOT:

- Store passwords in the database manually.
- Put Supabase service-role key in React.
- Trust role values from the frontend.
- Trust room IDs without QR validation.
- Allow students to access admin endpoints.
- Allow students to modify historical submissions.
- Make all storage files public without a security reason.
- Hard-code report reasons in React.
- Hard-code room data.
- Hard-code schedule data.
- Duplicate business logic across components.
- Create unnecessary microservices.
- Use an unnecessarily complex architecture.
- Delete historical submissions just to clean the UI.

---

# 81. CODE QUALITY

Use:

- Clear naming
- Small reusable components
- Centralized API service
- Centralized error handling
- Environment variables
- Async/await
- Consistent response format
- Validation
- Comments for non-obvious logic

Avoid:

- Giant React components
- Repeated API code
- Repeated database logic
- Hard-coded IDs
- Hard-coded secrets
- Excessive dependencies
- Unnecessary abstraction

---

# 82. FINAL PROJECT FLOW

## Admin setup

```text
Admin Login
    ↓
Create Sections
    ↓
Create Rooms
    ↓
Generate Permanent Room QR
    ↓
Create Schedules
    ↓
System Ready
```

## Normal Student

```text
Student Login
    ↓
View Schedule
    ↓
Go to Classroom
    ↓
Scan Room QR
    ↓
System Validates Room
    ↓
Submit BEFORE Photo
    ↓
Attend Class
    ↓
Submit AFTER Photo
    ↓
Occupation Completed
```

## Student Special

```text
Student Special Login
    ↓
View Schedule
    ↓
Select/identify Room
    ↓
Upload BEFORE Photo
    ↓
Enter Time
    ↓
Class
    ↓
Upload AFTER Photo
    ↓
Enter Time
    ↓
Complete
```

## Room Report

```text
Student
    ↓
Report Room
    ↓
Select Reason
    ↓
Add Other Reason if needed
    ↓
Add Description
    ↓
Upload Image Proof
    ↓
Submit
    ↓
Admin Reviews
    ↓
Reviewed
    ↓
Resolved / Rejected
```

## Admin monitoring

```text
Submissions
     ↓
Occupations
     ↓
Reports
     ↓
Analytics
     ↓
Compliance
```

---

# 83. EXPECTED FINAL DELIVERABLES

The coding agent must produce:

```text
1. Complete React frontend
2. Complete Express.js backend
3. Supabase database migrations
4. Supabase RLS policies
5. Supabase storage policies
6. Seed data
7. Authentication
8. Role-based authorization
9. QR generation
10. QR scanning
11. Before/After submissions
12. Student Special workflow
13. Room reports
14. Image proof uploads
15. Admin dashboard
16. Student dashboard
17. Student Special dashboard
18. Schedule management
19. Occupation management
20. Analytics
21. Audit logs
22. Responsive Bootstrap UI
23. Error handling
24. Loading states
25. Empty states
26. Test coverage for critical workflows
27. .env.example
28. Setup documentation
29. Deployment documentation
```

---

# 84. DEFINITION OF DONE

The application is DONE when a fresh developer can clone the repository, configure:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

run the database migrations/seed, start the Express server and React frontend, and complete the following test:

```text
Admin creates a section
        ↓
Admin creates Room LAB-101
        ↓
System creates permanent QR
        ↓
Admin creates schedule
        ↓
Student logs in
        ↓
Student scans LAB-101 QR
        ↓
Student submits Before photo
        ↓
Student later submits After photo
        ↓
Student reports a cleanliness issue
        ↓
Admin sees the report
        ↓
Admin reviews/resolves report
        ↓
Dashboard/analytics reflect the records
```

The complete workflow must work without manually editing database records.

---

# 85. AGENT EXECUTION INSTRUCTION

Build this system incrementally.

Do not attempt to create the entire application as one unverified code dump.

For each phase:

1. Implement the feature.
2. Run the application.
3. Check for build errors.
4. Check API responses.
5. Check database operations.
6. Check authorization.
7. Test the UI.
8. Fix errors.
9. Only then proceed to the next phase.

At the end of every major phase, verify that previously completed functionality still works.

Prioritize:

```text
Correctness
Security
Data integrity
Simple architecture
Responsive UI
Maintainability
```

The final system should feel like a real university management system while remaining practical and understandable for a BSIT capstone project.

---

# 86. FIRST TASK FOR THE AGENT

Start with **Phase 1 — Project Setup**.

Before building UI features:

1. Create the repository structure.
2. Initialize React/Vite.
3. Initialize Express.
4. Install required dependencies.
5. Configure Bootstrap.
6. Configure React Router.
7. Configure Supabase.
8. Configure environment variables.
9. Create Express health endpoint:

```text
GET /api/health
```

Expected:

```json
{
  "success": true,
  "message": "CTU Clean-Track-Update API is running."
}
```

10. Create initial React page.
11. Verify frontend can call `/api/health`.
12. Verify both frontend and backend run successfully.
13. Then proceed to Phase 2 database implementation.

Do not move to advanced features until the foundation is working.
