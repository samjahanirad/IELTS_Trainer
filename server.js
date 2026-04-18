const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'writing-practice.html'));
});

const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');
const DEFAULT_DIR = path.join(__dirname, 'default');

function loadSubmissions() {
  if (!fs.existsSync(SUBMISSIONS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8')); }
  catch { return []; }
}

function saveSubmissions(data) {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(data, null, 2));
}

function loadQuestions() {
  const load = (file) => {
    const p = path.join(DEFAULT_DIR, file);
    if (!fs.existsSync(p)) return [];
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch { return []; }
  };
  return { task1: load('task1.json'), task2: load('task2.json') };
}

app.get('/questions', (req, res) => {
  res.json(loadQuestions());
});

app.post('/questions', (req, res) => {
  const { task, question, modelAnswer } = req.body;
  if (!task || !question || !question.trim()) {
    return res.status(400).json({ error: 'task and question are required' });
  }
  const file = path.join(DEFAULT_DIR, task === 1 ? 'task1.json' : 'task2.json');
  let list = [];
  if (fs.existsSync(file)) {
    try { list = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  }
  const prefix = task === 1 ? 't1' : 't2';
  const id = `${prefix}_${String(list.length + 1).padStart(3, '0')}`;
  list.push({ id, task, question: question.trim(), modelAnswer: (modelAnswer || '').trim() });
  fs.writeFileSync(file, JSON.stringify(list, null, 2));
  res.json({ success: true, id, total: list.length });
});

app.post('/submit', (req, res) => {
  const { questionId, task, question, answer } = req.body;
  if (!questionId || !answer || !answer.trim()) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const submissions = loadSubmissions();
  const entry = {
    id: Date.now(),
    questionId,
    task,
    question,
    answer,
    submittedAt: new Date().toISOString()
  };
  submissions.push(entry);
  saveSubmissions(submissions);
  res.json({ success: true, id: entry.id });
});

app.get('/submissions', (req, res) => {
  res.json(loadSubmissions());
});

const client = new Anthropic();

app.post('/analyze', async (req, res) => {
  const { text, taskType = 'task1' } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const taskContext = taskType === 'task1'
    ? 'IELTS Academic Writing Task 1 (describing charts, graphs, or data)'
    : 'IELTS Academic Writing Task 2 (argumentative or opinion essay)';

  const task1YellowExamples = '"the percentage of", "reached a peak", "overall it can be seen that", "the highest proportion", "in the final year", "at the start of the period", "a significant increase", "remained relatively stable"';
  const task2YellowExamples = '"it is widely argued that", "on the other hand", "in conclusion", "to what extent", "there is no doubt that", "a growing number of people", "this essay will discuss"';

  const yellowExamples = taskType === 'task1' ? task1YellowExamples : task2YellowExamples;

  const prompt = `You are an expert IELTS examiner and writing coach. Analyze the following ${taskContext} writing sample and identify specific words/phrases to highlight for a learner.

COLOR SYSTEM:
- green: HIGH-VALUE VOCABULARY — advanced, reusable words that directly improve band score. Target: "accounted for", "peaked", "proportion", "respectively", "steadily", "climbed", "remained", "gradual", "albeit", "fluctuated", "surpassed", "marginally"
- blue: STRUCTURE & GRAMMAR TOOLS — sentence-building connectors and framing phrases. Target: relative clauses (who/which/where), sequence markers (after which, from this point), approximations (just over, almost, roughly, around), framing phrases (in terms of, with regard to, in contrast to)
- yellow: IELTS SCORING PHRASES — task-specific high-value phrases examiners reward. Target: ${yellowExamples}
- red: MISTAKES & WEAK USAGE — wrong tense, informal word, grammatical error, vague/weak vocabulary, or phrase copied verbatim from the question prompt

CRITICAL RULES — read carefully:
1. DO NOT highlight obvious/common words such as: shows, illustrates, increases, decreases, high, low, both, each, the, is, was, more, less, many, few, also, very, really, big, small, good, bad
2. ONLY highlight words that genuinely improve band score: advanced, slightly formal, academic-register vocabulary
3. Hard limit per sentence: at most 2 green + 1 blue + 1 yellow; red only for genuine errors
4. Prioritize GREEN above all — vocabulary is the highest-impact category
5. For RED: only flag real errors — incorrect tense, non-academic/informal word, grammatical mistake, or an exact phrase copied from the question
6. Every "phrase" value must appear verbatim (exact match, case-sensitive) in the submitted text
7. Do not annotate the same phrase twice

Return ONLY a valid JSON object — no explanation, no markdown fences:
{
  "annotations": [
    {"phrase": "exact phrase from text", "color": "green", "reason": "brief reason"},
    {"phrase": "exact phrase from text", "color": "blue", "reason": "brief reason"}
  ]
}

Text to analyze:
${text}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    let raw = message.content[0].text.trim();

    // Strip markdown code fences if present
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) raw = fenceMatch[1];

    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/deep-analyze', async (req, res) => {
  const { question, answer, taskType = 'task2', questionId } = req.body;

  if (!answer || !answer.trim()) {
    return res.status(400).json({ error: 'No answer provided' });
  }

  const taskContext = taskType === 'task1'
    ? 'Academic Writing Task 1 (describing charts, graphs, or data)'
    : 'Academic Writing Task 2 (argumentative or opinion essay)';

  // Build a short history note from previous submissions for the same question
  const allSubmissions = loadSubmissions();
  const prev = allSubmissions.filter(s => s.questionId === questionId && s.answer.trim() !== answer.trim());
  const historyNote = prev.length
    ? `The student has ${prev.length} previous submission(s) for this question. Mention improvement trends in progressNote.`
    : 'This appears to be the student\'s first attempt at this question.';

  const prompt = `You are an expert IELTS examiner and writing coach. Analyze the following IELTS ${taskContext} sample in detail.

Question: "${question}"

Student's Answer:
${answer}

${historyNote}

Return ONLY a valid JSON object — no explanation, no markdown fences — with this exact structure:
{
  "questionType": "e.g. Problem/Solution, Opinion, Discussion, Advantages/Disadvantages, etc.",
  "requirements": ["requirement 1", "requirement 2"],
  "criteria": {
    "taskResponse": {
      "band": 6.5,
      "positives": ["strength 1", "strength 2"],
      "negatives": ["weakness 1", "weakness 2"]
    },
    "coherenceCohesion": {
      "band": 6.5,
      "positives": ["strength 1"],
      "negatives": ["weakness 1"]
    },
    "lexicalResource": {
      "band": 6.5,
      "vocabulary": [{"phrase": "exact phrase from answer", "observation": "short comment"}],
      "positives": ["strength 1"],
      "negatives": ["weakness 1"]
    },
    "grammaticalRange": {
      "band": 7.0,
      "positives": ["strength 1"],
      "negatives": ["weakness 1"]
    }
  },
  "overallBand": "6.5",
  "overallBandRange": "6.5 – 7.0",
  "whyNotHigher": "One paragraph explaining what the student needs to do to reach the next band.",
  "actionableFeedback": [{"issue": "issue description", "suggestion": "concrete fix"}],
  "exampleHighBand": "A complete Band 7.5+ version of the answer.",
  "improvedVersion": "The student's answer rewritten one band higher, keeping their voice.",
  "progressNote": "Brief encouraging note on what improved and what to focus on next."
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3500,
      messages: [{ role: 'user', content: prompt }]
    });

    let raw = message.content[0].text.trim();
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) raw = fenceMatch[1];

    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (error) {
    console.error('Deep analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`IELTS Trainer running at http://localhost:${PORT}`);
});
