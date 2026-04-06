# NexusAI Team 🤖

> 12 specialized AI agents working together — animated canvas, free models, no login required.

## ✨ Features

- **12 AI Agents** — Code, Image, Text, Translate, Data, SEO, Debug, Test, Summarize, Math, Design, Chat
- **Free model auto-import** — OpenRouter + Groq free models, refreshed every 60 seconds
- **Animated canvas** — real-time data packets between agents and NEXUS hub
- **Mux HLS video background** — your branded video as background
- **Live Dashboard** — uptime, request stats, agent activity, server log feed
- **Source code viewer** — browse all files with syntax highlighting in-browser
- **One-click ZIP download** — full project export from the running server
- **No login required** — open and use immediately

## 🚀 Deploy to Render

1. **Fork** this repo on GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Set **Environment Variables** (in Render's dashboard):

| Variable | Value |
|---|---|
| `OPENROUTER_API_KEY` | from [openrouter.ai/keys](https://openrouter.ai/keys) |
| `GROQ_API_KEY` | from [console.groq.com/keys](https://console.groq.com/keys) |

5. **Build Command:** `npm install`
6. **Start Command:** `npm start`
7. Click **Create Web Service** ✅

> `MUX_PLAYBACK_ID` is already hardcoded in `public/app.js`. Add it as ENV only if you want to override it.

## 🛠 Local Development

```bash
git clone https://github.com/your-username/nexusai-team
cd nexusai-team
npm install

# Create .env (NEVER commit this file)
echo "OPENROUTER_API_KEY=sk-or-v1-xxxx" >> .env
echo "GROQ_API_KEY=gsk_xxxx" >> .env

node server.js
# → http://localhost:3000
```

## 🤖 Agent Roster

| Short | Name | Specialty |
|---|---|---|
| CODE | Code Writer | Clean, commented, multi-language code |
| IMG | Image Prompt | Midjourney / DALL-E 3 / SD prompts |
| TEXT | Content Writer | Blogs, copy, articles, scripts |
| TRANS | Translator | All languages, preserves tone |
| DATA | Data Analyst | Patterns, insights, analysis |
| SEO | SEO Expert | Meta, keywords, content structure |
| DEBUG | Bug Fixer | Find & fix with explanation |
| TEST | Test Writer | Unit / integration / E2E tests |
| SUMM | Summarizer | Concise, accurate summaries |
| MATH | Math Solver | Step-by-step solutions |
| DESIGN | UI Designer | Layouts, palette, UX flows |
| CHAT | General AI | Open conversation & Q&A |

## 📄 License

MIT — Mr. Abdulloh · Software Developer & Web Engineer
