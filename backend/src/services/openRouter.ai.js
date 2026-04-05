const { z } = require("zod");
const puppeteer = require("puppeteer");
const buildResumeHTML = require("../utils/resumeTemplate");

const interviewReportSchema = z.object({
    matchScore: z.number(),
    technicalQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })),
    behavioralQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })),
    skillGaps: z.array(z.object({
        skill: z.string(),
        severity: z.enum(["low", "medium", "high"])
    })),
    preparationPlan: z.array(z.object({
        day: z.number(),
        focus: z.string(),
        tasks: z.array(z.string())
    })),
    title: z.string()
});

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `
Return ONLY valid JSON.

DO NOT include:
- explanations
- markdown (no \`\`\`)
- text before or after JSON

RULES:
- No explanation
- No stringified JSON
- All fields required
- matchScore must be between 0 and 100
- preparationPlan days MUST be sequential starting from 1

FORMAT:
{
  "matchScore": number,
  "technicalQuestions": [{ "question": "", "intention": "", "answer": "" }],
  "behavioralQuestions": [{ "question": "", "intention": "", "answer": "" }],
  "skillGaps": [{ "skill": "", "severity": "low|medium|high" }],
  "preparationPlan": [{ "day": number, "focus": "", "tasks": [""] }],
  "title": ""
}

DATA:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}
`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "meta-llama/llama-3-8b-instruct",
                messages: [
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        if (!data.choices || data.choices.length === 0) {
            throw new Error("No response from AI");
        }

        const text = data.choices[0].message?.content;

        if (!text) {
            throw new Error("Empty AI response");
        }

        // console.log("AI RAW RESPONSE:\n", text);

        const cleaned = text.trim()
            .replace(/```json/g, "")
            .replace(/```/g, "");

        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}") + 1;

        if (start === -1 || end === -1) {
            throw new Error("No valid JSON found in AI response");
        }

        const jsonString = cleaned.slice(start, end);

        // console.log("CLEANED JSON:\n", jsonString);

        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch (err) {
            console.error("JSON PARSE FAILED:\n", jsonString);
            throw new Error("Invalid JSON returned by AI");
        }

        // Fix stringified arrays
        const fixArray = (arr) =>
            arr.map(item => typeof item === "string" ? JSON.parse(item) : item);

        if (parsed.technicalQuestions) parsed.technicalQuestions = fixArray(parsed.technicalQuestions);
        if (parsed.behavioralQuestions) parsed.behavioralQuestions = fixArray(parsed.behavioralQuestions);
        if (parsed.skillGaps) parsed.skillGaps = fixArray(parsed.skillGaps);
        if (parsed.preparationPlan) parsed.preparationPlan = fixArray(parsed.preparationPlan);

        // Validate with Zod
        const result = interviewReportSchema.safeParse(parsed);

        if (!result.success) {
            console.error("ZOD ERROR:", result.error);
            throw new Error("Schema validation failed");
        }

        const finalData = result.data;

        if (finalData.matchScore <= 1) {
            finalData.matchScore = Math.round(finalData.matchScore * 100);
        }

        if (finalData.preparationPlan && finalData.preparationPlan.length > 0) {
            finalData.preparationPlan = finalData.preparationPlan.map((item, index) => ({
                ...item,
                day: index + 1
            }));
        }

        return finalData;

    } catch (error) {
        throw new Error(`AI Service Error: ${error.message}`);
    }
}
async function generatePdfFromHtml(html) {
    const browser = await puppeteer.launch({ headless: true });

    try {
        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: "domcontentloaded"
        });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true
        });

        return pdfBuffer;

    } finally {
        await browser.close();
    }
}

async function generateResumeData({ resume, selfDescription, jobDescription }) {

    const prompt = `
Return ONLY valid JSON. No explanation.

STRICT JSON FORMAT (DO NOT BREAK THIS):
{
  "name": "string",
  "title": "string",
  "email": "string",
  "phone": "string",
  "summary": "string",
  "skills": ["string"],
  "projects": [{ "name": "string", "description": "string" }],
  "experience": [{ "role": "string", "company": "string", "description": "string" }],
  "education": [{ "degree": "string", "institute": "string" }]
}

RULES:
- skills MUST be an array of strings (NOT a single string)
- experience/projects/education MUST be arrays
- NEVER return string instead of array
- If data missing → return empty array []

CONTENT RULES:
- Summary: 2–3 lines, professional and impactful
- Use strong action verbs (Built, Designed, Optimized, Implemented)
- Include measurable impact when possible
- Keep everything concise and ATS-friendly

DATA:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "openai/gpt-4o-mini", // ✅ upgraded model
            messages: [{ role: "user", content: prompt }]
        })
    });

    const data = await response.json();

    // Error handling
    if (data.error) throw new Error(data.error.message);
    if (!data.choices || data.choices.length === 0) {
        throw new Error("No AI response");
    }

    let text = data.choices[0].message?.content?.trim();

    if (!text) throw new Error("Empty AI response");

    // Clean markdown wrappers
    text = text.replace(/```json|```/g, "").trim();

    //  Extract JSON safely
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON from AI");

    let parsed;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
        throw new Error("JSON parse failed");
    }

    // CRITICAL: Normalize data (prevents runtime errors)
    parsed.skills = Array.isArray(parsed.skills)
        ? parsed.skills
        : typeof parsed.skills === "string"
            ? parsed.skills.split(",").map(s => s.trim())
            : [];

    parsed.experience = Array.isArray(parsed.experience) ? parsed.experience : [];
    parsed.projects = Array.isArray(parsed.projects) ? parsed.projects : [];
    parsed.education = Array.isArray(parsed.education) ? parsed.education : [];

    // Ensure all fields exist (avoid undefined in HTML)
    parsed.name = parsed.name || "";
    parsed.title = parsed.title || "";
    parsed.email = parsed.email || "";
    parsed.phone = parsed.phone || "";
    parsed.summary = parsed.summary || "";

    return parsed;
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    try {
        // Step 1: AI → JSON
        const data = await generateResumeData({
            resume,
            selfDescription,
            jobDescription
        });

        // Step 2: JSON → HTML (fixed template)
        const html = buildResumeHTML(data);

        // Step 3: HTML → PDF
        const pdfBuffer = await generatePdfFromHtml(html);

        return pdfBuffer;

    } catch (error) {
        throw new Error(`Resume Service Error: ${error.message}`);
    }
}


module.exports = { generateInterviewReport, generateResumePdf };