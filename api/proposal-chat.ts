import type { VercelRequest, VercelResponse } from '@vercel/node'

const SYSTEM_PROMPT = `You are a knowledgeable assistant for Rules Foundation (RF), embedded in its proposal to NextLadder Ventures at rules.foundation/proposal.

Core context:
- RF is a 501(c)(3) nonprofit. Mission: encode the world's rules into open, machine-readable format, starting with US tax-benefit policy.
- The ask: $4.38M over 3 years ($1.5M / $1.73M / $1.15M).
- Infrastructure is already built (Atlas, RAC DSL, AutoRAC). The grant funds scale via compute and senior hires, not more R&D.
- Cosilico (for-profit, same founder) is contracted to build an applied API layer on RF's encodings. Arm's-length, fully disclosed.
- Vision: like OpenStreetMap for law. Starting with US tax-benefit, expanding globally.

You have tools to search and read files from Rules Foundation and Cosilico GitHub repos. Use them to answer detailed technical questions about the codebase, encodings, architecture, or anything not covered by the core context above. The proposal content itself lives in RulesFoundation/nextladder-proposal (especially src/content/slides.ts).

Key GitHub orgs:
- RulesFoundation: atlas, rac, rac-validators, rules.foundation, nextladder-proposal, plus 37 state rules-* repos
- CosilicoAI: microplex, cosilico-microdata, policybench, archview, cosilico-claude, plus state rac-* repos

Be concise, factual, and enthusiastic but not salesy. If you don't know something, look it up with your tools or say you don't know. Respond in plain text only — no markdown formatting, no bullet points, no bold/italic, no headers. Use natural prose.`

const TOOLS = [
  {
    name: 'search_repos',
    description: 'Search for repositories in the RulesFoundation or CosilicoAI GitHub organizations. Returns repo names, descriptions, and key stats.',
    input_schema: {
      type: 'object' as const,
      properties: {
        org: {
          type: 'string' as const,
          enum: ['RulesFoundation', 'CosilicoAI'],
          description: 'GitHub organization to search',
        },
        query: {
          type: 'string' as const,
          description: 'Optional search term to filter repos by name or description. Leave empty to list all.',
        },
      },
      required: ['org'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a specific file from a GitHub repository. Use this to look up proposal content, code, encodings, documentation, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        org: {
          type: 'string' as const,
          enum: ['RulesFoundation', 'CosilicoAI'],
        },
        repo: {
          type: 'string' as const,
          description: 'Repository name (e.g. "rac", "nextladder-proposal", "microplex")',
        },
        path: {
          type: 'string' as const,
          description: 'File path within the repo (e.g. "README.md", "src/content/slides.ts")',
        },
      },
      required: ['org', 'repo', 'path'],
    },
  },
  {
    name: 'search_code',
    description: 'Search for code across repositories in a GitHub organization. Good for finding where specific concepts, functions, or patterns are implemented.',
    input_schema: {
      type: 'object' as const,
      properties: {
        org: {
          type: 'string' as const,
          enum: ['RulesFoundation', 'CosilicoAI'],
        },
        query: {
          type: 'string' as const,
          description: 'Code search query (e.g. "AutoRAC", "quantile regression", "EITC")',
        },
      },
      required: ['org', 'query'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files and directories at a path in a GitHub repository. Use this to explore repo structure before reading specific files.',
    input_schema: {
      type: 'object' as const,
      properties: {
        org: {
          type: 'string' as const,
          enum: ['RulesFoundation', 'CosilicoAI'],
        },
        repo: {
          type: 'string' as const,
          description: 'Repository name',
        },
        path: {
          type: 'string' as const,
          description: 'Directory path (e.g. "src", "src/content"). Use empty string for repo root.',
        },
      },
      required: ['org', 'repo', 'path'],
    },
  },
]

async function ghFetch(url: string): Promise<Response> {
  const token = process.env.GITHUB_TOKEN
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'rules-foundation-chatbot',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(url, { headers })
}

async function executeTool(
  name: string,
  input: Record<string, string>
): Promise<string> {
  try {
    switch (name) {
      case 'search_repos': {
        const { org, query } = input
        const res = await ghFetch(
          `https://api.github.com/orgs/${org}/repos?per_page=100&sort=updated`
        )
        if (!res.ok) return `GitHub API error: ${res.status}`
        const repos = (await res.json()) as Array<{
          name: string
          description: string | null
          stargazers_count: number
          language: string | null
          updated_at: string
        }>
        let filtered = repos
        if (query) {
          const q = query.toLowerCase()
          filtered = repos.filter(
            (r) =>
              r.name.toLowerCase().includes(q) ||
              (r.description?.toLowerCase().includes(q) ?? false)
          )
        }
        return filtered
          .slice(0, 20)
          .map(
            (r) =>
              `${r.name}: ${r.description || '(no description)'} [${r.language || 'unknown'}, ${r.stargazers_count} stars, updated ${r.updated_at.slice(0, 10)}]`
          )
          .join('\n')
      }

      case 'read_file': {
        const { org, repo, path } = input
        const res = await ghFetch(
          `https://api.github.com/repos/${org}/${repo}/contents/${path}`
        )
        if (!res.ok) return `File not found: ${org}/${repo}/${path} (${res.status})`
        const data = (await res.json()) as { content?: string; encoding?: string; size?: number }
        if (!data.content) return `Not a file or empty: ${path}`
        const content = Buffer.from(data.content, 'base64').toString('utf-8')
        // Truncate very large files
        if (content.length > 15000) {
          return content.slice(0, 15000) + '\n\n[... truncated, file is ' + content.length + ' chars total]'
        }
        return content
      }

      case 'search_code': {
        const { org, query } = input
        const res = await ghFetch(
          `https://api.github.com/search/code?q=${encodeURIComponent(query)}+org:${org}&per_page=10`
        )
        if (!res.ok) return `GitHub search error: ${res.status}`
        const data = (await res.json()) as {
          total_count: number
          items: Array<{
            name: string
            path: string
            repository: { full_name: string }
          }>
        }
        if (data.total_count === 0) return 'No results found.'
        return `${data.total_count} results. Top matches:\n` +
          data.items
            .map((item) => `${item.repository.full_name}/${item.path}`)
            .join('\n')
      }

      case 'list_directory': {
        const { org, repo, path } = input
        const urlPath = path || ''
        const res = await ghFetch(
          `https://api.github.com/repos/${org}/${repo}/contents/${urlPath}`
        )
        if (!res.ok) return `Directory not found: ${org}/${repo}/${urlPath} (${res.status})`
        const items = (await res.json()) as Array<{
          name: string
          type: string
          size: number
        }>
        if (!Array.isArray(items)) return 'Not a directory.'
        return items
          .map((item) => `${item.type === 'dir' ? '📁' : '📄'} ${item.name}${item.type === 'file' ? ` (${item.size}b)` : ''}`)
          .join('\n')
      }

      default:
        return `Unknown tool: ${name}`
    }
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : String(err)}`
  }
}

interface Message {
  role: string
  content: string | Array<{ type: string; [key: string]: unknown }>
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const { messages } = req.body
    const allMessages: Message[] = [...messages]

    // Tool use loop — max 5 iterations to prevent runaway
    let finalText = ''
    for (let i = 0; i < 5; i++) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages: allMessages,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Anthropic API error:', response.status, errorText)
        return res.status(response.status).json({ error: errorText })
      }

      const data = (await response.json()) as {
        content: Array<{
          type: string
          text?: string
          id?: string
          name?: string
          input?: Record<string, string>
        }>
        stop_reason: string
      }

      // If Claude wants to use tools, execute them and continue the loop
      if (data.stop_reason === 'tool_use') {
        // Add Claude's response (with tool_use blocks) to messages
        allMessages.push({ role: 'assistant', content: data.content })

        // Execute each tool call and collect results
        const toolResults: Array<{
          type: 'tool_result'
          tool_use_id: string
          content: string
        }> = []

        for (const block of data.content) {
          if (block.type === 'tool_use' && block.id && block.name && block.input) {
            const result = await executeTool(block.name, block.input)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: result,
            })
          }
        }

        allMessages.push({ role: 'user', content: toolResults })
        continue
      }

      // Extract final text response
      finalText = data.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
      break
    }

    if (!finalText) {
      finalText = 'I looked into that but couldn\'t find a clear answer. Could you try rephrasing your question?'
    }

    // Return as SSE format
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')

    const event = {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: finalText },
    }
    res.write(`event: content_block_delta\ndata: ${JSON.stringify(event)}\n\n`)
    res.write(`event: message_stop\ndata: {"type":"message_stop"}\n\n`)
    res.end()
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('Chat error:', errorMsg, errorStack)
    if (!res.headersSent) {
      res.status(500).json({ error: errorMsg })
    }
  }
}
