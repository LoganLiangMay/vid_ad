# AI Video Ad Generator - Setup Guide

Complete setup instructions for getting the application running locally.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or higher (✅ You have v24.11.0)
- **npm** (comes with Node.js)
- **Firebase CLI** (for Firebase Functions)
- **Git** (for version control)

### Install Firebase CLI

```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

Login to Firebase:
```bash
firebase login
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install root project dependencies
npm install

# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

### 2. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local
```

Then edit `.env.local` and fill in your actual values (see sections below for where to get each value).

### 3. Start Development Server

```bash
# Start Next.js dev server
npm run dev
```

The app will be available at `http://localhost:3000`

## 🔧 Detailed Setup

### Firebase Setup

#### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create Project" or select an existing project
3. Name your project (e.g., "ai-video-ad-generator")

#### 2. Enable Required Services

In Firebase Console, enable:

- **Authentication** → Sign-in method → Enable Email/Password
- **Firestore Database** → Create database → Start in test mode (or production mode)
- **Storage** → Get started → Start in test mode

#### 3. Get Firebase Web App Config

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click the **Web** icon (`</>`) to add a web app
4. Register app with a nickname
5. Copy the configuration object

Add these to `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...your-actual-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

#### 4. Get Firebase Admin SDK Credentials

1. In Firebase Console → **Project Settings** → **Service Accounts**
2. Click "Generate new private key"
3. Save the JSON file (keep it secure!)
4. Extract values and add to `.env.local`:

```env
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your-key...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**Note:** The private key should be on a single line with `\n` for newlines.

#### 5. Initialize Firebase in Your Project

```bash
firebase init
```

Select:
- ✅ Firestore
- ✅ Functions
- ✅ Hosting
- ✅ Emulators (optional, for local development)

When prompted:
- Use existing project (select your Firebase project)
- Use default file names
- Install dependencies: Yes

### OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Navigate to **API Keys**: https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Copy the key (you won't see it again!)

Add to `.env.local`:
```env
OPENAI_API_KEY=sk-your-openai-api-key
```

### Replicate Setup

1. Go to [Replicate](https://replicate.com)
2. Sign up or log in
3. Navigate to **Account** → **API Tokens**: https://replicate.com/account/api-tokens
4. Click "Create token"
5. Copy the token (starts with `r8_`)

Add to `.env.local`:
```env
REPLICATE_API_TOKEN=r8_your-replicate-api-token
REPLICATE_API_KEY=r8_your-replicate-api-token  # Some functions use this name
```

### AWS S3 Setup (Optional)

If you want to use AWS S3 for video storage instead of Firebase Storage:

1. Create an AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Create an S3 bucket (see `AWS_S3_SETUP.md` for detailed instructions)
3. Create an IAM user with S3 permissions
4. Get access keys

Add to `.env.local`:
```env
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-video-storage-bucket
```

See `AWS_S3_SETUP.md` for complete AWS setup instructions.

## 🧪 Testing the Setup

### 1. Test Firebase Connection

Visit: `http://localhost:3000/test-firebase`

Click "Re-test Connection" - you should see green checkmarks for:
- ✅ Firebase Auth
- ✅ Firestore Database

### 2. Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Firebase test
curl http://localhost:3000/api/firebase-test
```

### 3. Test Authentication

1. Visit `http://localhost:3000/auth/signup`
2. Create a test account
3. Try logging in at `http://localhost:3000/auth/login`

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Format code
npm run format

# Firebase Functions
cd functions
npm run build      # Build TypeScript
npm run serve      # Run functions locally with emulators
npm run deploy     # Deploy to Firebase
```

## 🔥 Firebase Emulators (Local Development)

To run Firebase services locally:

```bash
# Start all emulators
npm run emulators

# Or start specific emulators
firebase emulators:start --only auth,firestore,functions
```

The emulator UI will be available at `http://localhost:4000`

**Note:** Set `USE_FIREBASE_EMULATORS=true` in `.env.local` to connect to local emulators.

## 📁 Project Structure

```
vid_ad/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Protected dashboard
│   ├── generate/         # Ad generation flow
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── form/             # Multi-step form components
│   └── AdGenerationForm.tsx
├── functions/             # Firebase Cloud Functions
│   ├── src/              # TypeScript source
│   └── lib/              # Compiled JavaScript
├── lib/                   # Shared utilities
│   ├── firebase/        # Firebase configuration
│   ├── aws/             # AWS S3 helpers
│   ├── contexts/        # React contexts
│   └── services/        # Service layer
├── .env.local            # Environment variables (create this)
├── .env.example          # Environment template
└── package.json          # Dependencies
```

## 🐛 Troubleshooting

### "Module not found" errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Also reinstall functions dependencies
cd functions
rm -rf node_modules package-lock.json
npm install
cd ..
```

### Firebase connection errors

1. Verify all Firebase env vars are set in `.env.local`
2. Check that Firebase services are enabled in Firebase Console
3. Restart the dev server after changing env vars
4. Clear browser cache and localStorage

### TypeScript errors

```bash
# Check for type errors
npm run type-check

# If errors persist, try:
rm -rf .next tsconfig.tsbuildinfo
npm run dev
```

### Port already in use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Firebase Functions not working

1. Make sure you've built the functions:
   ```bash
   cd functions
   npm run build
   cd ..
   ```

2. Check that environment variables are set for functions:
   ```bash
   firebase functions:config:get
   ```

3. For local testing, use emulators:
   ```bash
   npm run emulators
   ```

## 📚 Additional Documentation

- **Firebase Setup**: See `FIREBASE_SETUP.md`
- **AWS S3 Setup**: See `AWS_S3_SETUP.md`
- **Architecture**: See `docs/architecture/README.md`
- **PRD**: See `AI-Ad-Generator-PRD-FINAL.md`

## ✅ Verification Checklist

Before considering setup complete:

- [ ] Node.js 20+ installed
- [ ] Firebase CLI installed and logged in
- [ ] All dependencies installed (`npm install` in root and `functions/`)
- [ ] `.env.local` created with all required variables
- [ ] Firebase project created and services enabled
- [ ] Firebase test page shows green checkmarks
- [ ] Dev server starts without errors (`npm run dev`)
- [ ] Can access home page at `http://localhost:3000`
- [ ] Can create and log in with test account
- [ ] TypeScript compiles without errors

## 🎉 Next Steps

Once setup is complete:

1. Read the [PRD](AI-Ad-Generator-PRD-FINAL.md) to understand the application
2. Explore the codebase structure
3. Check out the [Architecture docs](docs/architecture/README.md)
4. Start developing!

## 💡 Tips

- **Environment Variables**: Never commit `.env.local` to git (it's in `.gitignore`)
- **Firebase Emulators**: Use emulators for local development to avoid costs
- **API Keys**: Keep your API keys secure and rotate them regularly
- **Costs**: Monitor usage on Firebase Console and OpenAI/Replicate dashboards

---

**Need Help?** Check the troubleshooting section or review the detailed setup guides for each service.

