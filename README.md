# IELTS Trainer

AI-powered IELTS writing practice app. Annotates your essays with color-coded vocabulary and grammar feedback using Claude.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- An [Anthropic API key](https://console.anthropic.com/)

## Setup

1. **Clone / open the project folder**

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set your Anthropic API key**

   The server reads `ANTHROPIC_API_KEY` from the environment. Set it before starting:

   **Windows (Command Prompt)**
   ```cmd
   set ANTHROPIC_API_KEY=sk-ant-...
   ```

   **Windows (PowerShell)**
   ```powershell
   $env:ANTHROPIC_API_KEY="sk-ant-..."
   ```

   **macOS / Linux**
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```

   Alternatively, create a `.env` file in the project root — but note the server does **not** auto-load `.env`; you must source it manually or use a tool like `dotenv-cli`.

## Running

```bash
npm start
```

The server starts on **http://localhost:3000** by default.

To use a different port:

```bash
PORT=4000 npm start          # macOS / Linux
set PORT=4000 && npm start   # Windows CMD
$env:PORT=4000; npm start    # Windows PowerShell
```

## Pages

| URL | Description |
|-----|-------------|
| `/` or `/writing-practice.html` | Main writing practice interface |
| `/ielts-trainer.html` | Full IELTS trainer |
| `/text-analyzer.html` | Standalone text analyzer |
| `/instructions.html` | Usage instructions |
| `/animation-demo.html` | Animation demo |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/analyze` | Annotate a writing sample (body: `{ text, taskType }`) |
| `POST` | `/submit` | Save a submission (body: `{ questionId, task, question, answer }`) |
| `GET` | `/submissions` | Retrieve all saved submissions |

## Project Structure

```
IELTS_Trainer/
├── server.js               # Express server + Claude API integration
├── package.json
├── writing-practice.html   # Main app page
├── ielts-trainer.html
├── text-analyzer.html
├── instructions.html
├── animation-demo.html
├── dramatic-text-animation.js
├── questions.json          # IELTS question bank
├── prompts.json            # Prompt templates
├── submissions.json        # Created at runtime when answers are submitted
└── 1200 Words.txt / .pdf   # Vocabulary reference material
```
