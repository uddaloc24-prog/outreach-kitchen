const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001";
const MCP_SERVER_SECRET = process.env.MCP_SERVER_SECRET || "";

interface McpResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result?: {
    content: Array<{ type: string; text: string; isError?: boolean }>;
    isError?: boolean;
  };
  error?: {
    code: number;
    message: string;
  };
}

function parseSseOrJson(text: string): unknown {
  // SSE format: lines of "event: message\ndata: {...}\n\n"
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      return JSON.parse(line.slice(6));
    }
  }
  // Plain JSON fallback
  return JSON.parse(text);
}

export async function callMcpTool<T>(
  toolName: string,
  args: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      Authorization: `Bearer ${MCP_SERVER_SECRET}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `MCP server error: ${response.status} ${response.statusText}`
    );
  }

  const text = await response.text();
  const data = parseSseOrJson(text) as McpResponse<T>;

  if (data.error) {
    throw new Error(`MCP tool error: ${data.error.message}`);
  }

  const content = data.result?.content;
  if (!content || !content[0] || content[0].type !== "text") {
    throw new Error("Invalid or empty response from MCP tool");
  }

  // MCP SDK wraps tool throws as content with isError: true
  if (data.result?.isError || content[0].isError) {
    throw new Error(content[0].text);
  }

  return JSON.parse(content[0].text) as T;
}
