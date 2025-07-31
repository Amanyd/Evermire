# Mood Journal App

A private mood journal platform built with Next.js, MongoDB, and AI analysis.

## Features

- 🔐 User authentication with NextAuth.js
- 📸 Upload images with captions and mood tags
- 🤖 AI-powered mood analysis with personal descriptions
- 🗑️ Post management (create, delete)
- 📊 Analytics dashboard (coming soon)
- 💬 AI chat assistant with personalized suggestions (coming soon)

## Current Status

✅ **Completed:**
- User registration and authentication
- Post creation with image upload and mood tags
- AI mood analysis using Google Gemini
- Personal mood descriptions ("You seem happy today")
- Post deletion functionality
- Database storage and retrieval

🚧 **Coming Soon:**
- Analytics page with mental health score charts
- Chat assistant for mood improvement suggestions
- Complete black theme UI redesign

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local` file:**
   ```env
   # Database
   MONGODB_URI=your_mongodb_connection_string_here

   # NextAuth
   NEXTAUTH_SECRET=your_nextauth_secret_here
   NEXTAUTH_URL=http://localhost:3000

   # Google AI (Gemini)
   GOOGLE_AI_API_KEY=your_google_ai_api_key_here

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

3. **Set up services:**
   - **MongoDB Atlas:** Create a free cluster and get your connection string
   - **Google AI:** Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - **Cloudinary:** Create a free account and get your credentials

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000) in your browser**

## How it works

1. **User logs in** → Authenticated session created
2. **User creates a post** → Uploads image + caption + selects mood tags
3. **AI analyzes the post** → Generates personal mood description and mental health trait scores
4. **Data is stored** → Post and analysis saved to database
5. **Posts displayed** → Clean interface showing caption and AI-generated mood
6. **Analytics (coming soon)** → Charts and insights from all mood data
7. **Chat assistant (coming soon)** → Personalized suggestions based on mood history

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── login/         # Login page
│   ├── posts/         # Posts page (✅ working)
│   ├── analytics/     # Analytics page (🚧 coming soon)
│   └── chat/          # Chat page (🚧 coming soon)
├── components/        # React components
├── lib/              # Utilities and configurations
├── models/           # MongoDB models
└── utils/            # Helper functions
```

## Development Roadmap

### Phase 1: Core Features ✅
- [x] User authentication
- [x] Post creation with AI analysis
- [x] Post management (delete)
- [x] Database integration

### Phase 2: Analytics 🚧
- [ ] Analytics page with charts
- [ ] Mental health score visualization
- [ ] Mood trend analysis

### Phase 3: Chat Assistant 🚧
- [ ] AI chat interface
- [ ] Personalized mood improvement suggestions
- [ ] Activity and content recommendations

### Phase 4: UI Enhancement 🎨
- [ ] Complete black theme redesign
- [ ] Modern, sleek interface
- [ ] Responsive design improvements

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** MongoDB with Mongoose
- **Authentication:** NextAuth.js
- **AI:** Google Gemini 2.0 Flash
- **Image Storage:** Cloudinary
