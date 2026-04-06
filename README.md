# NexusAI Team 🤖

> 12 AI agents working together in real-time — powered by OpenRouter & Groq free models.

## ✨ Features

- **12 Specialized AI Agents** – Code, Image Prompts, Translation, SEO, Debug, Math, and more
- **Live Model Fetching** – Free models auto-imported every 60 seconds from OpenRouter + Groq
- **Animated Dashboard** – Canvas visualization showing data flow between agents
- **Mux Video Background** – Looping branded video via HLS
- **No Login Required** – Open and use immediately
- **Source Code Viewer** – Browse all source files in-browser
- **One-Click ZIP Download** – Download the entire project

## 🚀 Deploy to Render

1. Fork this repo on GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect your GitHub repo
4. Set the following **Environment Variables** in Render's dashboard:

| Key | Value |
|-----|-------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `GROQ_API_KEY` | Your Groq API key |
| `MUX_PLAYBACK_ID` | Your Mux video playback ID |

5. Build command: `npm install`
6. Start command: `npm start`

## 🛠 Local Development

```bash
# Clone
git clone https://github.com/your-username/nexusai-team
cd nexusai-team

# Install
npm install

# Set env vars (create .env — never commit this!)
OPENROUTER_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
MUX_PLAYBACK_ID=GEpj38bbxKjkAo6Ij3qmxbYeNTQ011TTnl2eH9ftDTFM

# Start
npm run dev
```

## 🤖 Agent List

| Agent | Specialty |
|-------|-----------|
| CODE  | Code Writer — clean, commented code |
| IMG   | Image Prompt Generator — Midjourney/DALL-E |
| TEXT  | Content Writer — blogs, copy, articles |
| TRANS | Translator — preserves tone & meaning |
| DATA  | Data Analyst — patterns, insights, charts |
| SEO   | SEO Optimizer — meta, keywords, structure |
| DEBUG | Bug Fixer — find & fix with explanation |
| TEST  | Test Writer — unit, integration, e2e |
| SUMM  | Summarizer — concise accurate summaries |
| MATH  | Math Solver — step-by-step solutions |
| DESIGN| UI Designer — layouts, color, UX |
| CHAT  | General Assistant — open conversation |

## 📄 License

MIT — built by Mr. Abdulloh
