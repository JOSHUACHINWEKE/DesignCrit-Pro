# DesignCrit Pro

Research-ready starter project for an automated design feedback platform focused on beginner designers.

## Included

- Public design analysis page
- Secure Express backend
- Anthropic image-analysis endpoint
- Research Mode with participant IDs
- Pre-test → feedback → post-test workflow
- Improvement scoring
- Questionnaire
- Firestore persistence
- Research dashboard
- CSV export

## Setup

1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run:

   npm install

4. Copy `.env.example` and rename the copy to `.env`.
5. Add your Anthropic API key and Firebase Admin credentials.
6. Run:

   npm run dev

7. Open:

   http://localhost:3000

## Pages

- `/` - normal design analysis
- `/research` - participant research flow
- `/dashboard` - researcher dashboard
- `/api/health` - backend health check

## Firebase

Create a Firebase project and enable Firestore.

Then create a Firebase Admin service account and add these values to `.env`:

- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY

The app creates the `research_sessions` collection automatically when the first participant begins.

## Important

Never commit `.env` or Firebase service account keys to GitHub.

## Recommended testing order

1. Visit `/api/health`
2. Test normal analysis at `/`
3. Start one participant at `/research`
4. Complete pre-test
5. Complete post-test
6. Complete questionnaire
7. Check `/dashboard`
8. Export CSV
