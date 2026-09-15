import express from "express";
import path from "path";
import { promises as fs } from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { TUTOR_PROFILES } from "./src/tutors";

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const systemInstruction = `You are the virtual guide / chatbot for "Ser o Estar", a premium specialized Spanish language academy designed for English speakers.
Your tone is welcoming, bilingual (using Spanish words friendly to beginners), encouraging, and clear.
We offer intensive adult group courses (A1 Beginner, A2 Elementary, B1 Intermediate) of max 6 students per group, both online and in-person.
Our unique teaching methodology is built on active, dynamic speaking and cognitive metaphors:
- SER is taught as the "Why" (Identity, Core Origin, Permanent Characteristics).
- ESTAR is taught as the "How" (Location, Temporary State, Physical Conditions).
Answer the user's questions about Spanish learning, Ser vs Estar grammar, our levels, active attendance tracker, recorded digital archives, personal student notes, or scheduling classes. Keep responses friendly, structured, and short.`;

let ai: any = null;

/**
 * Account credentials live in one place only: the FastAPI backend's persistent
 * database. This server used to keep a parallel `database/portal-people.json`
 * store with SHA-256 password hashes and answer logins from it whenever the
 * backend was unreachable. That store was the reason credentials created during
 * a dev session stopped working later: the account never reached the database,
 * and the fallback was only consulted when ALLOW_DEMO_AUTH was set.
 *
 * Every auth and account route below now proxies straight through and surfaces
 * a clear error when the backend is down. Authorization for the developer-shell
 * routes is the backend's job: it checks the caller's JWT role, so this server
 * no longer needs an ADMIN_PORTAL_KEY of its own.
 */

function templateTeacherToAdminList(tutor: (typeof TUTOR_PROFILES)[number]) {
  return {
    id: tutor.id,
    teacher_id_code: tutor.id,
    name: tutor.name,
    display_name: tutor.displayName,
    email: tutor.email,
    assigned_levels: tutor.assignedLevels,
    source: "template",
  };
}

async function getGeminiClient() {
  if (!geminiApiKey) return null;
  if (ai) return ai;

  const { GoogleGenAI } = await import("@google/genai");
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  return ai;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:8000";

  // Keep multipart uploads intact so they can be forwarded to FastAPI with the
  // original boundary. Forwarding the Express request stream directly can
  // produce a truncated multipart body after middleware has handled it.
  app.use(express.raw({
    type: (req) => String(req.headers["content-type"] || "").includes("multipart/form-data"),
    limit: "110mb",
  }));
  app.use(express.json());

  const getBackendRequestOptions = (req: any, headers: Record<string, string>) => {
    if (req.method === "GET" || req.method === "HEAD") {
      delete headers["content-length"];
      delete headers["transfer-encoding"];
      return { method: req.method, headers };
    }

    const isMultipart = String(req.headers["content-type"] || "").includes("multipart/form-data");
    if (isMultipart) {
      if (!Buffer.isBuffer(req.body)) {
        throw new Error("Multipart upload body was not captured as a buffer.");
      }
      delete headers["transfer-encoding"];
      headers["content-length"] = String(req.body.length);
      return { method: req.method, headers, body: req.body };
    }

    delete headers["content-length"];
    delete headers["transfer-encoding"];
    return { method: req.method, headers, body: JSON.stringify(req.body) };
  };

  const proxyToBackend = async (req: any, res: any) => {
    const backendUrl = `${BACKEND_API_URL}${req.originalUrl}`;
    const headers: Record<string, string> = {
      ...req.headers,
      host: new URL(BACKEND_API_URL).host,
    };

    try {
      const requestOptions = getBackendRequestOptions(req, headers);
      const backendResponse = await fetch(backendUrl, requestOptions);

      backendResponse.headers.forEach((value, name) => {
        if (name.toLowerCase() === "set-cookie") {
          res.setHeader(name, value);
        } else if (name.toLowerCase() !== "content-encoding") {
          res.setHeader(name, value);
        }
      });

      res.status(backendResponse.status);
      const bodyText = await backendResponse.text();
      res.send(bodyText);
    } catch (err) {
      console.error(`Backend proxy failed for ${backendUrl}:`, err);
      res.status(502).json({
        detail: `Backend API unavailable at ${BACKEND_API_URL}. Start or restart the FastAPI server, then try again.`,
      });
    }
  };

  const fetchBackendForRequest = async (req: any) => {
    const backendUrl = `${BACKEND_API_URL}${req.originalUrl}`;
    const headers: Record<string, string> = {
      ...req.headers,
      host: new URL(BACKEND_API_URL).host,
    };
    const requestOptions = getBackendRequestOptions(req, headers);
    const backendResponse = await fetch(backendUrl, requestOptions);

    return {
      response: backendResponse,
      bodyText: await backendResponse.text(),
    };
  };

  const sendBackendResult = (res: any, backendResult: { response: Response; bodyText: string }) => {
    const contentType = backendResult.response.headers.get("content-type");
    if (contentType) {
      res.setHeader("content-type", contentType);
    }
    const responseHeaders = backendResult.response.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = responseHeaders.getSetCookie?.() || [];
    if (setCookies.length > 0) {
      res.setHeader("set-cookie", setCookies);
    } else {
      const setCookie = backendResult.response.headers.get("set-cookie");
      if (setCookie) res.setHeader("set-cookie", setCookie);
    }
    res.status(backendResult.response.status).send(backendResult.bodyText);
  };

  // API Route: AI Chatbot Endpoint
  app.post("/api/chatbot", async (req, res) => {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: "Message content is required" });
      return;
    }

    try {
      if (openaiApiKey) {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: message },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI error: ${errorText}`);
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || "";
        res.json({ text });
        return;
      }

      const client = await getGeminiClient();
      if (!client) {
        res.status(500).json({
          error: "No AI service is configured. Set OPENAI_API_KEY or GEMINI_API_KEY.",
        });
        return;
      }

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: message,
        config: {
          systemInstruction,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Chatbot error:", error);
      res.status(500).json({
        error: "Failed to generate query response from AI services.",
        details: error.message || error,
      });
    }
  });

  // API Route: Send Welcome Email Immediately
  app.post("/api/send-welcome", async (req, res) => {
    const { email, fullName, studentIdCode } = req.body;
    if (!email || !fullName) {
      res.status(400).json({ error: "Email and fullName are required" });
      return;
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpFromName = process.env.SMTP_FROM_NAME || "Iniciativa Ser o Estar";

    const subject = "Official Welcome Letter - Group 1 Intensive A1 Spanish Course";

    const textContent = `
OFFICIAL WELCOME LETTER
Group 1 – Intensive A1 Spanish Course

Dear ${fullName},

On behalf of Iniciativa Ser o Estar (ISoE), it is our pleasure to officially welcome you to the intensive A1 Spanish course. This program is tailored for beginners who are passionate about starting their journey toward Spanish fluency.

Student ID: ${studentIdCode}

As the world continues to evolve through new market strategies and global trade driven by technological advancements, staying ahead has become crucial. Enhancing your professional skills for the global marketplace helps you remain competitive and strengthens your position in the international business environment.

Classes are online, and will be held on:

Course dates: 19 May to 27 June 2026 (six weeks of intensive learning)

Time | Day | Hours by Session | Session
19:00-20:00 | Tuesday | 1 | Grammar-Lab
19:00-20:00 | Thursday | 1 | Vocabulary & Conversation
10:00-11:00 | Saturday | 1 | Listening Practice. Review
11:00-12:00 | Saturday | 1 | Final Project Coaching. (Week 3-6)

WORKING PLAN OVERVIEW
- Grammar Lab: Focused sessions on essential Spanish grammar topics.
- Vocabulary & Conversation: Practical vocabulary building and interactive speaking exercises.
- Listening Practice: Activities to improve comprehension and pronunciation.
- Progress Assessments: Periodic evaluations to track progress and address learning gaps.
- Coaching on participant final project design and rehearsals.
- Max 16 participants per session.
- One recovery class available every two weeks.

CERTIFICATION PROCESS
For this six-week A1 Spanish Intensive Course, a certificate of participation will be awarded by the Embassy of Spain in Guinea and Sierra Leone, in partnership with the Honorary Consulate of Spain in Freetown.

Requirements: Attendance is the main criterion.
If your attendance is below 85%, you may continue with the course by paying a registration fee of 250 leones. This fee is reimbursable if you attend at least 80% of the course.

A minimum of 80% attendance is required for certification.

If your attendance is below 80%, the registration fee is not reimbursable. You may continue attending the remaining classes and you will receive all course materials; however, a certificate of participation will not be issued in this case.

OFFICIAL REGISTRATION
If you are still interested in improving your Spanish skills through this course, kindly confirm your acceptance of this letter via email or WhatsApp.

Once you have confirmed, you will receive:
- Participant Card
- Detailed Working Plan
- Schedule with specific dates and activities.
- Address and access to interactive classroom in Freetown. Available for those who consider it an ideal option to have access to steady power supply and internet. This option also provides the opportunity to interact one on one with other participants.

We look forward to supporting your learning journey and ensuring your experience is both enjoyable and productive.

¡Nos vemos pronto!
Saludos del Equipo de Iniciativa Ser o Estar

Contact: +232 72 057646 or seroestar@icloud.com
May 2026
`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Official Welcome Letter</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #ffffff;
      padding: 30px;
      border-bottom: 1px solid #f1f5f9;
      text-align: center;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
      letter-spacing: -0.025em;
    }
    .subtitle {
      font-size: 14px;
      font-weight: 600;
      color: #0d9488;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 20px;
    }
    p {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #334155;
      text-align: justify;
    }
    .course-dates {
      background: #f0fdfa;
      border-left: 4px solid #0d9488;
      padding: 12px 16px;
      font-weight: 700;
      color: #0f766e;
      margin: 20px 0 15px 0;
      font-size: 14px;
      border-radius: 0 8px 8px 0;
    }
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0 25px 0;
      font-size: 13px;
    }
    .schedule-table th {
      background-color: #f1f5f9;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 10px 12px;
      border-bottom: 2px solid #e2e8f0;
    }
    .schedule-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .schedule-table tr:last-child td {
      border-bottom: none;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin: 25px 0 12px 0;
      text-transform: uppercase;
      letter-spacing: 0.025em;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .list-item {
      margin-bottom: 8px;
      font-size: 14px;
      color: #334155;
      padding-left: 15px;
      position: relative;
    }
    .list-item::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #0d9488;
      font-weight: bold;
    }
    .signature {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 30px;
      line-height: 1.4;
    }
    .signature-accent {
      color: #0d9488;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 30px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .footer a {
      color: #0d9488;
      text-decoration: none;
    }
    .badge {
      display: inline-block;
      background-color: #f1f5f9;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 15px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 28px; line-height: 1; margin-bottom: 10px;">🎓</div>
      <h1 class="title">Official Welcome Letter</h1>
      <div class="subtitle">Group 1 &ndash; Intensive A1 Spanish Course</div>
    </div>
    
    <div class="content">
      <div class="badge">STUDENT ID: ${studentIdCode}</div>
      
      <div class="greeting">Dear ${fullName},</div>
      
      <p>On behalf of <strong>Iniciativa Ser o Estar (ISoE)</strong>, it is our pleasure to officially welcome you to the intensive A1 Spanish course. This program is tailored for beginners who are passionate about starting their journey toward Spanish fluency.</p>
      
      <p>As the world continues to evolve through new market strategies and global trade driven by technological advancements, staying ahead has become crucial. Enhancing your professional skills for the global marketplace helps you remain competitive and strengthens your position in the international business environment.</p>
      
      <p>Classes are online, and will be held on:</p>
      
      <div class="course-dates">
        Course dates: 19 May to 27 June 2026 (six weeks of intensive learning)
      </div>
      
      <table class="schedule-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Day</th>
            <th>Hours by Session</th>
            <th>Session</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>19:00-20:00</strong></td>
            <td>Tuesday</td>
            <td>1</td>
            <td>Grammar-Lab</td>
          </tr>
          <tr>
            <td><strong>19:00-20:00</strong></td>
            <td>Thursday</td>
            <td>1</td>
            <td>Vocabulary & Conversation</td>
          </tr>
          <tr>
            <td><strong>10:00-11:00</strong></td>
            <td>Saturday</td>
            <td>1</td>
            <td>Listening Practice. Review</td>
          </tr>
          <tr>
            <td><strong>11:00-12:00</strong></td>
            <td>Saturday</td>
            <td>1</td>
            <td>Final Project Coaching. (Week 3-6)</td>
          </tr>
        </tbody>
      </table>
      
      <div class="section-title">Working Plan Overview</div>
      <div class="list-item"><strong>Grammar Lab:</strong> Focused sessions on essential Spanish grammar topics.</div>
      <div class="list-item"><strong>Vocabulary & Conversation:</strong> Practical vocabulary building and interactive speaking exercises.</div>
      <div class="list-item"><strong>Listening Practice:</strong> Activities to improve comprehension and pronunciation.</div>
      <div class="list-item"><strong>Progress Assessments:</strong> Periodic evaluations to track progress and address learning gaps.</div>
      <div class="list-item"><strong>Coaching</strong> on participant final project design and rehearsals.</div>
      <div class="list-item">Max 16 participants per session.</div>
      <div class="list-item">One recovery class available every two weeks.</div>
      
      <div class="section-title">Certification Process</div>
      <p>For this six-week A1 Spanish Intensive Course, a certificate of participation will be awarded by the <strong>Embassy of Spain in Guinea and Sierra Leone</strong>, in partnership with the <strong>Honorary Consulate of Spain in Freetown</strong>.</p>
      
      <p><strong>Requirements: Attendance is the main criterion.</strong></p>
      <p>If your attendance is below 85%, you may continue with the course by paying a registration fee of 250 leones. This fee is reimbursable if you attend at least 80% of the course.</p>
      <p>A minimum of 80% attendance is required for certification.</p>
      <p>If your attendance is below 80%, the registration fee is not reimbursable. You may continue attending the remaining classes and you will receive all course materials; however, a certificate of participation will not be issued in this case.</p>
      
      <div class="section-title">Official Registration</div>
      <p>If you are still interested in improving your Spanish skills through this course, kindly confirm your acceptance of this letter via email or WhatsApp.</p>
      
      <p>Once you have confirmed, you will receive:</p>
      <div class="list-item">Participant Card</div>
      <div class="list-item">Detailed Working Plan</div>
      <div class="list-item">Schedule with specific dates and activities.</div>
      <div class="list-item">Address and access to interactive classroom in Freetown. Available for those who consider it an ideal option to have access to steady power supply and internet. This option also provides the opportunity to interact one on one with other participants.</div>
      
      <p style="margin-top: 20px;">We look forward to supporting your learning journey and ensuring your experience is both productive and enjoyable.</p>
      
      <div class="signature">
        ¡Nos vemos pronto!<br>
        <span class="signature-accent">Saludos del Equipo de Iniciativa Ser o Estar</span>
      </div>
    </div>
    
    <div class="footer">
      If you need more details or have any questions, please contact us at <br>
      <strong>+232 72 057646</strong> or via email at <a href="mailto:seroestar@icloud.com">seroestar@icloud.com</a><br>
      <span style="font-size: 10px; display: block; margin-top: 10px;">May 2026</span>
    </div>
  </div>
</body>
</html>
`;

    if (smtpUser && smtpPass) {
      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: `"${smtpFromName}" <${smtpUser}>`,
          to: email,
          subject: subject,
          text: textContent,
          html: htmlContent,
        });

        console.log(`[SMTP] Welcome letter sent successfully to ${email}`);
        res.json({ status: "success", message: "Welcome email delivered via SMTP." });
        return;
      } catch (smtpError: any) {
        console.error("[SMTP ERROR] Failed to send email via real SMTP, falling back to simulation.", smtpError);
      }
    }

    console.log("====================================================================");
    console.log("📨 [SIMULATED EMAIL TRANSMISSION] - Gmail Welcome Letter Sent!");
    console.log(`From: "${smtpFromName}" <noreply@seroestar.com>`);
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log("----------------------- MESSAGE TEXT CONTENT -----------------------");
    console.log(textContent);
    console.log("====================================================================");

    res.json({
      status: "simulated",
      message: "Gmail welcome letter logged and simulated successfully (no SMTP credentials found).",
      recipient: email,
      studentCode: studentIdCode
    });
  });

  // Authentication is delegated entirely to the backend, which verifies the
  // bcrypt hash stored in the database. There is no local credential path.
  app.post("/api/login", proxyToBackend);

  app.get("/api/admin/students", async (req, res) => {
    await proxyToBackend(req, res);
  });

  // Created accounts must be written to the database or not at all, so that a
  // credential handed out today still works after a restart or a redeploy.
  app.post("/api/admin/students", async (req, res) => {
    await proxyToBackend(req, res);
  });

  app.get("/api/admin/teachers", async (req, res) => {
    try {
      const backendResult = await fetchBackendForRequest(req);
      if (backendResult.response.ok || ![404, 502].includes(backendResult.response.status)) {
        sendBackendResult(res, backendResult);
        return;
      }
    } catch (error) {
      console.warn("Backend tutor list unavailable, showing the static tutor roster:", error);
    }

    // Display-only roster. It carries no credentials and cannot be signed in to.
    res.json(TUTOR_PROFILES.map(templateTeacherToAdminList));
  });

  app.post("/api/admin/teachers", async (req, res) => {
    await proxyToBackend(req, res);
  });

  app.get("/api/admin/teacher-progress", async (req, res) => {
    try {
      const backendResult = await fetchBackendForRequest(req);
      if (backendResult.response.ok || ![404, 502].includes(backendResult.response.status)) {
        sendBackendResult(res, backendResult);
        return;
      }
    } catch (error) {
      console.warn("Backend teacher progress unavailable, using portal fallback store:", error);
    }

    const teachers = TUTOR_PROFILES.map(templateTeacherToAdminList);

    res.json(teachers.map((teacher) => ({
      teacher_id: teacher.teacher_id_code,
      teacher_name: teacher.name,
      email: teacher.email,
      assigned_levels: teacher.assigned_levels,
      total_hours: 0,
      classes_given: 0,
      attendance: {
        present: 0,
        late: 0,
        absent: 0,
        rate: 100,
      },
      recent_sessions: [],
    })));
  });

  app.get("/api/tutors", async (req, res) => {
    try {
      const backendResult = await fetchBackendForRequest(req);
      if (backendResult.response.ok) {
        sendBackendResult(res, backendResult);
        return;
      }
    } catch (error) {
      console.warn("Backend tutor list unavailable, using portal fallback store:", error);
    }

    res.json(TUTOR_PROFILES.map(templateTeacherToAdminList));
  });

  // API Route: Health Check. Proxied so it reports the backend's database
  // state rather than just "this Express process is running".
  app.get("/api/health", async (req, res) => {
    try {
      const backendResult = await fetchBackendForRequest(req);
      sendBackendResult(res, backendResult);
    } catch (error) {
      res.status(503).json({
        status: "degraded",
        detail: `Backend API unavailable at ${BACKEND_API_URL}. Start the FastAPI server so logins can reach the database.`,
      });
    }
  });

  app.get("/uploads/*", async (req, res) => {
    try {
      const backendResponse = await fetch(`${BACKEND_API_URL}${req.originalUrl}`);
      if (!backendResponse.ok) {
        res.status(backendResponse.status).send(await backendResponse.text());
        return;
      }
      const contentType = backendResponse.headers.get("content-type");
      const contentDisposition = backendResponse.headers.get("content-disposition");
      if (contentType) res.setHeader("content-type", contentType);
      if (contentDisposition) res.setHeader("content-disposition", contentDisposition);
      const fileBuffer = Buffer.from(await backendResponse.arrayBuffer());
      res.send(fileBuffer);
    } catch (error) {
      console.error("Uploaded file proxy failed:", error);
      res.status(502).json({ detail: "Uploaded file storage is temporarily unavailable." });
    }
  });

  app.all("/api/*", proxyToBackend);

  // Vite development vs production asset serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
