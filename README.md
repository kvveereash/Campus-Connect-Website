# Campus Connect 🎓

**Campus Connect** is a comprehensive student engagement and collaboration platform. It unifies event discovery, club management, and peer-to-peer connection into a single, vibrant ecosystem.

![Campus Connect Banner](public/og-image.png)

## 🚀 Features

### Core Experience
-   **Smart Feed**: Personalized event and club recommendations.
-   **Global Search**: Instantly find Users, Events, and Clubs.
-   **Interactive Map**: Explore campus venues and event locations.
-   **Leaderboard**: Gamified student engagement tracking.

### 💬 Advanced Chat System
-   **Real-Time Messaging**: Powered by Pusher (WebSockets).
-   **Group Chats**: Create and manage student communities.
-   **Rich Media**: Send images and file attachments.
-   **Engagement**: Typing indicators, Read receipts (double tick), and Message reactions.
-   **Global Notifications**: Instant toasts for new messages.

### 🛡️ Admin & Club Management
-   **Admin Dashboard**: Overview of platform stats (Users, Events, Clubs).
-   **Verification Queue**: Admin-approval workflow for new Clubs and Events.
-   **Club Roles**: Role-based access (Admin/Member) for clubs.
-   **Host Events**: Create and manage events with image uploads.

### 💎 Premium UI/UX
-   **Modern Design**: Glassmorphism, blurred backdrops, and sleek animations.
-   **Responsive**: Fully optimized for Desktop and Mobile.
-   **Themes**: Dark mode optimized.

## 🛠️ Tech Stack

-   **Frontend**: Next.js 15 (App Router), React, CSS Modules.
-   **Backend**: Next.js Server Actions.
-   **Database**: SQLite (via Prisma ORM).
-   **Real-time**: Pusher Channels.
-   **Storage**: Local FS (Uploads) / Cloudinary (ready).
-   **Authentication**: Custom JWT-based Auth (encrypted sessions).

## 🏃‍♂️ Getting Started

### Prerequisites
-   Node.js (v18+)
-   npm

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/campus-connect.git
    cd campus-connect
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Setup Environment**:
    Create a `.env` file based on `.env.example` (ensure Pusher keys are set).

4.  **Initialize Database**:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Run Development Server**:
    ```bash
    npm run dev
    ```

Visit [http://localhost:3000](http://localhost:3000) to see the app!

## 🔐 Admin Access

The platform includes a protected Admin Dashboard at `/admin`.
To promote a user to Admin, run the script:
```bash
npx tsx scripts/promote-admin.ts
```

## 🔮 Future Roadmap
-   [ ] Mobile App (React Native/Capacitor).
-   [ ] AI-powered Event Recommendations.
-   [ ] Payment Gateway for key events.

---
Built with ❤️ for Students.
