# NexusAI Team 🚀

**15 AI Agents working together in real-time** — powered by OpenRouter (free models) and Groq.

Live demo at: `https://nexusai-team.onrender.com`

---

## ✨ Features

- 🎬 **Mux video background** — cinematic animated backdrop
- 🤖 **15 specialized AI agents** — Code, Image, Video, Debug, Data, SEO, SQL, API and more
- 📡 **Auto-refresh models** — free models reloaded every 60 seconds from OpenRouter + Groq
- 🕸 **Canvas visualization** — animated data-flow between agents with glow effects
- 💬 **Per-agent chat** — each agent has its own system prompt and chat history
- 📁 **Source browser** — view all source files inline, download as ZIP
- 🔒 **No login required** — zero auth, open platform

---

## 🚀 Deploy to Render

1. Push this repo to GitHub (`.env` is gitignored — keys stay safe)
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect your GitHub repo
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`
6. Add these **Environment Variables** in the Render dashboard:

| Key | Value |
|-----|-------|
| `OPENROUTER_API_KEY` | Your key from openrouter.ai |
| `GROQ_API_KEY` | Your key from console.groq.com |
| `MUX_PLAYBACK_ID` | `GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM` |

> ⚠️ **Never commit your API keys!** Set them only in Render's Environment Variables panel.

---

## 🏃 Run locally

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/nexusai-team

# 2. Install
cd nexusai-team
npm install

# 3. Set env vars (create .env — it's gitignored)
echo "OPENROUTER_API_KEY=sk-or-..." >> .env
echo "GROQ_API_KEY=gsk_..." >> .env

# 4. Start
npm run dev  # or: npm start
# → http://localhost:3000
```

---

## 🤖 The 15 Agents

| Agent | Role |
|-------|------|
| **CODE** | Full-stack code writer |
| **DEBUG** | Bug finder & fixer |
| **TEST** | Unit & E2E test writer |
| **IMG** | AI image prompt generator |
| **VIDEO** | Video script & storyboard |
| **TEXT** | Content & copywriter |
| **SEO** | SEO optimizer |
| **TRANS** | Multilingual translator |
| **DATA** | Data analyst |
| **MATH** | Step-by-step math solver |
| **DESIGN** | UI/UX designer |
| **SQL** | Database query builder |
| **API** | REST/GraphQL API designer |
| **SUMM** | Document summarizer |
| **CHAT** | General-purpose assistant |

---

## 🛠 Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JS + Canvas API
- **Video**: Mux HLS via hls.js
- **AI APIs**: OpenRouter (free models) + Groq
- **Deploy**: Render.com

---

MIT License
