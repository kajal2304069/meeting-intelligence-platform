import React, { useEffect, useRef, useState } from 'react'

function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'audio/webm;codecs=opus',
    'audio/webm',
  ]
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Records the live meeting straight from the browser — either the shared
 * screen/tab (video call window) with its audio, or just the microphone for
 * an in-person/offline meeting — instead of requiring a pasted recording link.
 * Hands the finished blob to onFinish(blob, mimeType) for upload.
 */
export default function LiveRecorder({ onFinish, disabled }) {
  const [mode, setMode] = useState('screen') // 'screen' | 'mic'
  const [state, setState] = useState('idle') // idle | recording | stopped
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)

  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const mimeTypeRef = useRef('')

  useEffect(() => () => cleanupStream(), [])

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const start = async () => {
    setError('')
    if (!window.MediaRecorder) {
      setError('This browser does not support in-browser recording. Try Chrome or Edge, or paste a recording link instead.')
      return
    }
    try {
      const stream = mode === 'screen'
        ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        : await navigator.mediaDevices.getUserMedia({ audio: true })

      // If screen-share audio wasn't granted (common when sharing a window
      // without "share tab audio"), fall back to adding the mic so there's
      // still something to transcribe.
      if (mode === 'screen' && stream.getAudioTracks().length === 0) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
          mic.getAudioTracks().forEach((t) => stream.addTrack(t))
        } catch { /* no mic available either — proceed video-only */ }
      }

      streamRef.current = stream
      chunksRef.current = []
      const mimeType = pickMimeType()
      mimeTypeRef.current = mimeType
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'video/webm' })
        setPreviewUrl(URL.createObjectURL(blob))
        setState('stopped')
      }
      // Stop automatically if the user ends screen-share from the browser's own UI
      stream.getVideoTracks().forEach((t) => { t.onended = () => stop() })

      recorder.start(1000)
      recorderRef.current = recorder
      setElapsed(0)
      setState('recording')
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } catch (err) {
      setError(err.message || 'Could not start recording — permission may have been denied.')
    }
  }

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    cleanupStream()
  }

  const discard = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    chunksRef.current = []
    setState('idle')
    setElapsed(0)
  }

  const upload = () => {
    const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'video/webm' })
    onFinish(blob)
  }

  return (
    <div className="space-y-4">
      {state === 'idle' && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('screen')}
            className={`flex-1 text-xs font-mono py-2 rounded-lg border transition-colors ${
              mode === 'screen' ? 'bg-signal/10 border-signal/40 text-signal' : 'border-line text-mist hover:text-paper'
            }`}
          >
            Record screen/tab + audio
            <div className="font-sans text-[11px] text-mist mt-0.5 normal-case">For a Zoom/Meet/Teams window you have open</div>
          </button>
          <button
            type="button"
            onClick={() => setMode('mic')}
            className={`flex-1 text-xs font-mono py-2 rounded-lg border transition-colors ${
              mode === 'mic' ? 'bg-signal/10 border-signal/40 text-signal' : 'border-line text-mist hover:text-paper'
            }`}
          >
            Record microphone only
            <div className="font-sans text-[11px] text-mist mt-0.5 normal-case">For an in-person / offline meeting</div>
          </button>
        </div>
      )}

      {error && <p className="text-coral text-xs font-mono">{error}</p>}

      {state === 'idle' && (
        <button
          type="button"
          onClick={start}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-2 bg-coral/10 border border-coral/30 text-coral font-medium py-2.5 rounded-lg text-sm hover:bg-coral/20 transition-colors disabled:opacity-40"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-coral" />
          Start recording
        </button>
      )}

      {state === 'recording' && (
        <div className="flex items-center justify-between bg-coral/10 border border-coral/30 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-coral text-sm font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-coral animate-pulse" />
            Recording · {formatElapsed(elapsed)}
          </div>
          <button
            type="button"
            onClick={stop}
            className="bg-coral text-ink font-medium px-4 py-1.5 rounded-lg text-sm hover:brightness-110 transition-all"
          >
            Stop
          </button>
        </div>
      )}

      {state === 'stopped' && previewUrl && (
        <div className="space-y-3">
          <video src={previewUrl} controls className="w-full rounded-lg border border-line max-h-56 bg-ink" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={discard}
              className="flex-1 text-mist text-sm font-mono py-2 rounded-lg border border-line hover:text-paper transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={upload}
              className="flex-1 bg-signal text-ink font-medium py-2 rounded-lg text-sm hover:brightness-110 transition-all"
            >
              Upload &amp; process
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
