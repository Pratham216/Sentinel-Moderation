# Sentinel | AI Enterprise Moderation Suite

![Sentinel Banner](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=400&fit=crop)

Live Demo : [Sentinel Moderation App](https://sentinel-moderation-web.vercel.app/)

Sentinel is a high-fidelity, AI-powered moderation platform designed for elite community management. It combines advanced contextual analysis with a premium executive dashboard to provide real-time oversight and automated enforcement across digital ecosystems.

## ✨ Core Features

### 🛡️ AI-Assisted Moderation
- **Contextual Safety Scoring**: Uses LLMs to analyze posts for toxicity, bias, and guideline violations.
- **Dynamic Confidence Mapping**: Real-time reliability scoring for automated decisions.
- **Automated Enforcement**: Auto-rejects high-risk content and auto-approves safe contributions based on customizable thresholds.

### 📊 Executive Dashboard
- **System Overview**: Real-time metrics for total contributions, flagged items, and platform health.
- **Moderation Activity Chart**: Interactive visualization of enforcement volume with live background synchronization.
- **Queue Spotlight**: Instant access to the highest-priority flagged items requiring human intervention.
- **Live Activity Stream**: A real-time feed of all automated and manual moderation actions.

### ⚖️ Moderation Workspace
- **High-Priority Queue**: A specialized view for `FLAGGED` items with detailed AI reasoning.
- **Detailed Post Review**: Deep-dive analysis for individual posts, including trust scores, safety breakdowns, and engagement stats.
- **Trust Index**: Author reputation tracking based on historical contribution quality.

### ⚙️ Admin & Control
- **Content Management**: Advanced table-based oversight for all community contributions with granular status tracking.
- **Rule Engine**: Dynamic community guideline management with real-time rule synchronization.
- **Elite Identity System**: Professional avatar mapping and session-aware identity tracking for moderators.

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, TanStack Query
- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Authentication**: Clerk (Enterprise-grade identity management)
- **AI Engine**: Advanced Contextual Analysis (OpenAI/OpenRouter integration)
- **Real-time**: Socket.io for live dashboard updates

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (Recommended)
- PostgreSQL database
- Clerk API keys

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pratham216/Sentinel-Moderation.git
   cd Sentinel-Moderation
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root and add the following:
   ```env
   DATABASE_URL="your_postgresql_url"
   CLERK_PUBLISHABLE_KEY="your_clerk_key"
   CLERK_SECRET_KEY="your_clerk_secret"
   VITE_CLERK_PUBLISHABLE_KEY="your_clerk_key"
   ```

4. **Initialize Database**
   ```bash
   pnpm prisma migrate dev
   pnpm db:seed
   ```

5. **Run the application**
   ```bash
   pnpm dev
   ```

## 📐 Architecture

Sentinel is built as a workspace-based monorepo:
- `packages/web`: The premium React dashboard.
- `packages/api`: The high-performance Node.js moderation engine.
- `packages/shared`: Shared schemas, types, and business logic.

## 📄 License

Internal Enterprise Use Only.

---
*Built with precision for elite communities.*
