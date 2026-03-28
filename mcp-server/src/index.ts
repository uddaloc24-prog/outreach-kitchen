import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

import { researchRestaurant, researchRestaurantInput } from "./tools/research-restaurant.js";
import { generateResearchBrief, generateResearchBriefInput } from "./tools/generate-research-brief.js";
import { generateEmail, generateEmailInput } from "./tools/generate-email.js";
import { sendEmail, sendEmailInput } from "./tools/send-email.js";
import { checkReplies, checkRepliesInput } from "./tools/check-replies.js";
import { generateFollowup, generateFollowupInput } from "./tools/generate-followup.js";
import { parseCv, parseCvInput } from "./tools/parse-cv.js";

const PORT = parseInt(process.env.MCP_SERVER_PORT ?? "3001", 10);
const SERVER_SECRET = process.env.MCP_SERVER_SECRET ?? "";

const app = express();
app.use(express.json());

// Auth middleware
app.use("/mcp", (req, res, next) => {
  const auth = req.headers.authorization;
  if (SERVER_SECRET && auth !== `Bearer ${SERVER_SECRET}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "restaurant-outreach",
    version: "1.0.0",
  });

  // Tool 1: research_restaurant
  server.tool(
    "research_restaurant",
    "Scrapes a restaurant's website and returns structured raw research data.",
    researchRestaurantInput.shape,
    async (args) => {
      const result = await researchRestaurant(args as z.infer<typeof researchRestaurantInput>);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    }
  );

  // Tool 2: generate_research_brief
  server.tool(
    "generate_research_brief",
    "Takes raw restaurant research and generates a 3-part analysis brief using Claude.",
    generateResearchBriefInput.shape,
    async (args) => {
      const result = await generateResearchBrief(args as z.infer<typeof generateResearchBriefInput>);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    }
  );

  // Tool 3: generate_email
  server.tool(
    "generate_email",
    "Writes a personalised cover email from the research brief using Claude.",
    generateEmailInput.shape,
    async (args) => {
      const result = await generateEmail(args as z.infer<typeof generateEmailInput>);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    }
  );

  // Tool 4: send_email
  server.tool(
    "send_email",
    "Sends an email via Gmail API and logs it to Supabase.",
    sendEmailInput.shape,
    async (args) => {
      const result = await sendEmail(args as z.infer<typeof sendEmailInput>);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    }
  );

  // Tool 5: check_replies
  server.tool(
    "check_replies",
    "Polls Gmail for replies to sent outreach threads. Updates Supabase with reply/followup status.",
    checkRepliesInput.shape,
    async (args) => {
      const result = await checkReplies(args as z.infer<typeof checkRepliesInput>);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    }
  );

  // Tool 6: generate_followup
  server.tool(
    "generate_followup",
    "Writes a short follow-up email for restaurants that haven't replied after 21 days.",
    generateFollowupInput.shape,
    async (args) => {
      const result = await generateFollowup(args as z.infer<typeof generateFollowupInput>);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    }
  );

  // Tool 7: parse_cv
  server.tool(
    "parse_cv",
    "Parses a CV/resume text using Claude and returns structured profile data.",
    parseCvInput.shape,
    async (args) => {
      const result = await parseCv(args as z.infer<typeof parseCvInput>);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    }
  );

  return server;
}

// Stateless HTTP endpoint — new server instance per request
app.post("/mcp", async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
  });

  res.on("close", () => {
    transport.close().catch(console.error);
    server.close().catch(console.error);
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[mcp] Request handling error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "restaurant-outreach-mcp", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`[mcp] Restaurant Outreach MCP server running on port ${PORT}`);
});
