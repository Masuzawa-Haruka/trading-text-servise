import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const FIGMA_TOKEN = process.env.FIGMA_PERSONAL_ACCESS_TOKEN;
if (!FIGMA_TOKEN) {
  console.error("Error: FIGMA_PERSONAL_ACCESS_TOKEN is required");
  process.exit(1);
}

// MCPサーバーの初期化
const server = new Server(
  {
    name: "figma-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. 利用可能なツールの定義（AIに「何ができるか」を伝える）
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_figma_file",
        description: "指定したFigmaファイルのノード情報や設計データを取得します",
        inputSchema: {
          type: "object",
          properties: {
            fileKey: {
              type: "string",
              description: "FigmaのURLに含まれるFile Key (例: figma.com/file/【これ】/...)",
            },
          },
          required: ["fileKey"],
        },
      },
    ],
  };
});

// 2. ツールの実行ロジック（AIがツールを呼び出した時の処理）
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_figma_file") {
    const fileKey = request.params.arguments?.fileKey as string;

    try {
      const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
        headers: {
          "X-Figma-Token": FIGMA_TOKEN,
        },
      });

      // AIが理解しやすいようにテキストとして結果を返す
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data.document, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Figma APIエラー: ${error.response?.data?.err || error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error("Tool not found");
});

// 3. サーバーの起動（標準入出力を介して通信）
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Figma MCP Server running on stdio");
}

run().catch(console.error);