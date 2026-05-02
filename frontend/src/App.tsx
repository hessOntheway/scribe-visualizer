import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'
import Collapsible from './components/Collapsible'

type ParsedTurn = {
  step: number
  timestampMs: number | null
  model: string
  requestMessageCount: number
  rolesHistogram: Record<string, number>
  latestUserMessage: string
  triggerSource: string
  triggerMessageRole: string
  triggerMessage: string
  assistantMessageRole: string
  responseText: string
  responseRaw: string
  responseToolCalls: Array<{
    id: string
    name: string
    arguments: string
  }>
  finishReason: string
  toolCalls: string[]
  availableTools: string[]
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  }
}

type ParseResult = {
  summary: {
    turns: number
    totalTokens: number
    models: string[]
    toolCalls: number
    sourceFile?: string
  }
  turns: ParsedTurn[]
  rawContent?: string
}

function App() {
  const [result, setResult] = useState<ParseResult | null>(null)
  const [selectedStep, setSelectedStep] = useState<number>(1)
  const [rawJson, setRawJson] = useState('')
  const [filePath, setFilePath] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('No file selected')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const selectedTurn = useMemo(() => {
    if (!result) return null
    return result.turns.find((turn) => turn.step === selectedStep) ?? result.turns[0] ?? null
  }, [result, selectedStep])

  async function parseContent(content: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = (await res.json()) as ParseResult & { error?: string; detail?: string }
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Parsing failed')
      }
      setResult(data)
      setSelectedStep(1)
      setRawJson(content)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function parseByFilePath() {
    if (!filePath.trim()) {
      setError('Please enter a file path')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/load-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: filePath.trim() }),
      })
      const data = (await res.json()) as ParseResult & { error?: string; detail?: string }
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to load file')
      }
      setResult(data)
      setSelectedStep(1)
      setRawJson(data.rawContent ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFileName(file.name)
    const content = await file.text()
    setRawJson(content)
    await parseContent(content)
  }

  function openFileDialog() {
    fileInputRef.current?.click()
  }

  function onParseTextarea() {
    if (!rawJson.trim()) {
      setError('Please paste or upload JSON content')
      return
    }
    parseContent(rawJson)
  }

  function formatTime(ms: number | null): string {
    if (!ms) return '-'
    return new Date(ms).toLocaleString()
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>LLM Loop Visualizer</h1>
        <p>Visualize each model call in a loop: inputs, outputs, tool calls, and token usage.</p>
      </header>

      <section className="ingest">
        <div className="panel">
          <h2>Method 1: Upload a JSON File</h2>
          <div className="row">
            <button type="button" onClick={openFileDialog}>
              Choose File
            </button>
            <span className="muted">{selectedFileName}</span>
          </div>
          <input
            ref={fileInputRef}
            className="file-input-hidden"
            type="file"
            accept=".json,application/json"
            onChange={onFileChange}
          />
        </div>

        <div className="panel">
          <h2>Method 2: Read from Local File Path</h2>
          <div className="row">
            <input
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="Enter an absolute path to a JSON file"
            />
            <button onClick={parseByFilePath} disabled={loading}>
              Load and Parse
            </button>
          </div>
        </div>

        <div className="panel full">
          <h2>Method 3: Paste JSON Directly</h2>
          <textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            placeholder="Paste audit JSON array..."
          />
          <div className="row">
            <button onClick={onParseTextarea} disabled={loading}>
              Parse JSON
            </button>
            {loading && <span className="muted">Parsing...</span>}
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      </section>

      {result && (
        <>
          <section className="summary">
            <div className="metric">
              <span>Turns</span>
              <strong>{result.summary.turns}</strong>
            </div>
            <div className="metric">
              <span>Total Tokens</span>
              <strong>{result.summary.totalTokens}</strong>
            </div>
            <div className="metric">
              <span>Model</span>
              <strong>{result.summary.models.join(', ')}</strong>
            </div>
            <div className="metric">
              <span>Tool Calls</span>
              <strong>{result.summary.toolCalls}</strong>
            </div>
          </section>

          <section className="visualizer">
            <aside className="timeline">
              {result.turns.map((turn) => (
                <button
                  key={turn.step}
                  className={`turn ${selectedTurn?.step === turn.step ? 'active' : ''}`}
                  onClick={() => setSelectedStep(turn.step)}
                >
                  <div className="turn-head">
                    <span>Step {turn.step}</span>
                    <small>{turn.finishReason}</small>
                  </div>
                  <p>{turn.responseText.slice(0, 90) || '(empty)'}</p>
                  <small>{formatTime(turn.timestampMs)}</small>
                </button>
              ))}
            </aside>

            <article className="detail">
              {selectedTurn && (
                <>
                  <h2>Step {selectedTurn.step} Details</h2>
                  <div className="grid">
                    <div>
                      <Collapsible title="Trigger Source" defaultOpen={true}>
                        <p className="badge">{selectedTurn.triggerSource}</p>
                        <p className="muted">role: {selectedTurn.triggerMessageRole}</p>
                        <pre>{selectedTurn.triggerMessage || '(empty)'}</pre>
                      </Collapsible>
                    </div>
                    <div>
                      <Collapsible title="Latest User Prompt" defaultOpen={true}>
                        <pre>{selectedTurn.latestUserMessage || '(none)'}</pre>
                      </Collapsible>
                    </div>
                    <div>
                      <Collapsible title="Model Response" defaultOpen={true}>
                        <p className="muted">role: {selectedTurn.assistantMessageRole}</p>
                        <pre>{selectedTurn.responseText || '(empty)'}</pre>
                      </Collapsible>

                      <Collapsible title="Raw Response Object" defaultOpen={true}>
                        <pre>{selectedTurn.responseRaw || '(empty)'}</pre>
                      </Collapsible>
                    </div>
                    <div>
                      <Collapsible title="Tool Calls" defaultOpen={true}>
                        <p>{selectedTurn.toolCalls.join(', ') || '(none)'}</p>
                        {selectedTurn.responseToolCalls.length > 0 && (
                          <div className="tool-call-list">
                            {selectedTurn.responseToolCalls.map((toolCall) => (
                              <div key={toolCall.id} className="tool-call-card">
                                <p className="badge">{toolCall.name}</p>
                                <p className="muted">id: {toolCall.id}</p>
                                <pre>{toolCall.arguments || '(no arguments)'}</pre>
                              </div>
                            ))}
                          </div>
                        )}

                        <h3>Available Tools</h3>
                        <p>{selectedTurn.availableTools.join(', ') || '(none)'}</p>
                      </Collapsible>
                    </div>
                    <div>
                      <Collapsible title="Token Usage" defaultOpen={true}>
                        <p>prompt: {selectedTurn.tokenUsage.prompt}</p>
                        <p>completion: {selectedTurn.tokenUsage.completion}</p>
                        <p>total: {selectedTurn.tokenUsage.total}</p>
                      </Collapsible>
                    </div>
                    <div>
                      <Collapsible title="Request Structure" defaultOpen={true}>
                        <p>messages: {selectedTurn.requestMessageCount}</p>
                        <p>
                          roles: {Object.entries(selectedTurn.rolesHistogram).map(([k, v]) => `${k}:${v}`).join(', ')}
                        </p>
                        <p>model: {selectedTurn.model}</p>
                      </Collapsible>
                    </div>
                  </div>
                </>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  )
}

export default App
