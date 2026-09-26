# CTU

Classroom cleanliness monitoring and reporting system for Cebu Technological University - Naga Extension Campus.

## Tech Stack

 - **Frontend**: React 18 + Vite + React Router + Tailwind CSS 4
- **Backend**: Express.js + Node.js
- **Database/Auth/Storage**: Supabase (PostgreSQL)
- **QR Code**: html5-qrcode (scanner) + qrcode (generator)

## Project Structure

```
ctu-clean-track-update/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── layouts/        # Layout components (Admin, Student, Special)
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── context/        # React context (Auth)
│   │   ├── utils/          # Utility functions
│   │   ├── hooks/          # Custom hooks
│   │   ├── routes/         # Route configuration
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/         # Supabase config
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   ├── validators/     # Input validators
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
├── supabase/               # Database migrations & seeds
│   ├── migrations/
│   └── seed.sql
├── .env.example
└── package.json            # Root package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Supabase credentials:
   ```
   SUPABASE_URL=your-project-url
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. Run database migrations in Supabase SQL Editor:
   - Run `supabase/migrations/001_initial_schema.sql`
   - Run `supabase/migrations/002_rls_policies.sql`
   - Run `supabase/migrations/003_storage_policies.sql`
   - Run `supabase/seed.sql`

5. Start development servers:
   ```bash
   npm run dev
   ```

   This starts both frontend (port 5173) and backend (port 5000).

## User Roles

- **Admin**: Full system management (sections, rooms, schedules, reports, analytics)
- **Student**: Section-based account, QR scanning, before/after submissions, reports
- **Student Special**: Alternative workflow with manual image upload and time entry

## Features

- QR code-based room identification
- Before/After room condition photo submissions
- Cleanliness reporting with predefined reasons
- Admin dashboard with analytics
- Role-based access control
- Responsive design for all devices

## API Endpoints

### Health
- `GET /api/health` - Health check

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Admin (requires admin role)
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/sections` - List sections
- `POST /api/admin/sections` - Create section
- `GET /api/admin/rooms` - List rooms
- `POST /api/admin/rooms` - Create room
- `GET /api/admin/schedules` - List schedules
- `GET /api/admin/occupations` - List occupations
- `GET /api/admin/reports` - List reports
- `GET /api/admin/analytics/overview` - Analytics
- `GET /api/admin/audit-logs` - Audit logs

### Student (requires student or student_special role)
- `GET /api/student/dashboard` - Dashboard
- `GET /api/student/schedule` - Schedule
- `POST /api/submissions/before` - Submit before photo
- `POST /api/submissions/after` - Submit after photo
- `GET /api/reports/my` - My reports
- `POST /api/reports` - Create report

### Public
- `GET /api/rooms/qr/:token` - Validate QR code
- `GET /api/report-reasons` - Get report reasons

## Development

```bash
# Run frontend only
npm run dev:client

# Run backend only
npm run dev:server

# Build for production
npm run build
```

## Deployment

### Vercel (Recommended)

This project is configured for Vercel deployment with both client and server:

1. Push your code to GitHub
2. Import the project in Vercel
3. Set the following environment variables in Vercel:
   - `CLIENT_URL` - Your Vercel domain (e.g., `https://your-project.vercel.app`)
   - `NODE_ENV` - Set to `production`
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
4. Deploy

The project uses:
- `vercel.json` for build configuration
- `api/index.mjs` as the serverless function entry point
- Vercel automatically routes `/api/*` requests to the Express server
- All other routes serve the React client

### Manual Deployment

1. Build the frontend: `npm run build`
2. Set production environment variables
3. Deploy the server to your hosting platform
4. Deploy the client build to your static hosting

## License

MIT