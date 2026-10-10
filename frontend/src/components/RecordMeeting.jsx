import React, { useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'

function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'audio/webm;codecs=opus',
    'audio/webm',
  ]
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/** Records the meeting live, right in the browser: share the tab/window
 * running Zoom/Teams/Meet (with "share tab audio" checked) so we capture
 * what's being said, mixed with the organizer's own mic if they grant it,
 * then upload the resulting file for the same AI pipeline (transcript,
 * summary, tasks, sentiment) to run on. */
export default function RecordMeeting({ language, participants, onUploaded }) {
  const [phase, setPhase] = useState('idle') // idle | recording | stopped | uploading | error
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [micIncluded, setMicIncluded] = useState(false)

  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamsRef = useRef([]) // all raw MediaStreams we opened, so we can stop every track on cleanup
  const audioCtxRef = useRef(null)
  const timerRef = useRef(null)
  const blobRef = useRef(null)

  useEffect(() => () => cleanupTracks(), [])

  const cleanupTracks = () => {
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()))
    streamsRef.current = []
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const start = async () => {
    setError('')
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('This browser does not support screen/tab capture (getDisplayMedia).')
      return
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // "share tab audio" / "share system audio" captures the meeting's voices
      })
      streamsRef.current.push(displayStream)

      let micStream = null
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamsRef.current.push(micStream)
        setMicIncluded(true)
      } catch {
        // Mic permission declined or unavailable — still fine, we keep the shared tab/system audio.
        setMicIncluded(false)
      }

      const videoTrack = displayStream.getVideoTracks()[0]
      const displayAudioTrack = displayStream.getAudioTracks()[0]
      const micAudioTrack = micStream?.getAudioTracks()[0]

      let finalAudioTrack = displayAudioTrack || micAudioTrack || null

      if (displayAudioTrack && micAudioTrack) {
        // Mix both audio sources into one track via Web Audio so neither voice is lost.
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        const ctx = new AudioCtx()
        audioCtxRef.current = ctx
        const dest = ctx.createMediaStreamDestination()
        ctx.createMediaStreamSource(new MediaStream([displayAudioTrack])).connect(dest)
        ctx.createMediaStreamSource(new MediaStream([micAudioTrack])).connect(dest)
        finalAudioTrack = dest.stream.getAudioTracks()[0]
      }

      const tracks = [videoTrack, finalAudioTrack].filter(Boolean)
      const combined = new MediaStream(tracks)

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(combined, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: mimeType || 'video/webm' })
        setPhase('stopped')
      }
      recorderRef.current = recorder
      recorder.start(1000)

      // If the person clicks the browser's native "Stop sharing" control,
      // treat that the same as pressing our Stop button.
      videoTrack.addEventListener('ended', () => stop())

      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
      setPhase('recording')
    } catch (err) {
      setError(err.message?.includes('Permission') || err.name === 'NotAllowedError'
        ? 'Screen-share permission was declined — allow it to start recording.'
        : (err.message || 'Could not start recording.'))
      cleanupTracks()
    }
  }

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()))
    streamsRef.current = []
  }

  const discard = () => {
    blobRef.current = null
    chunksRef.current = []
    setPhase('idle')
    setElapsed(0)
  }

  const upload = async () => {
    if (!blobRef.current) return
    setPhase('uploading')
    setError('')
    try {
      const res = await api.uploadRecording(blobRef.current, language, participants)
      onUploaded?.(res)
      setPhase('idle')
      blobRef.current = null
      setElapsed(0)
    } catch (err) {
      setError(err.message || 'Upload failed')
      setPhase('stopped')
    }
  }

  return (
    <div className="space-y-3">
      {phase === 'idle' && (
        <button
          type="button"
          onClick={start}
          className="w-full bg-coral/10 border border-coral/30 text-coral font-medium py-3 rounded-lg text-sm hover:bg-coral/20 transition-colors flex items-center justify-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-coral" />
          Start recording this meeting
        </button>
      )}

      {phase === 'recording' && (
        <div className="bg-panelLight border border-coral/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-coral animate-pulse" />
            <div>
              <div className="text-paper text-sm font-mono">{formatElapsed(elapsed)}</div>
              <div className="text-mist text-[11px]">
                Capturing shared tab/screen audio{micIncluded ? ' + your mic' : ''}. Keep that tab shared until the meeting ends.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={stop}
            className="bg-coral text-ink font-medium px-4 py-2 rounded-lg text-sm hover:brightness-110 transition-all"
          >
            Stop
          </button>
        </div>
      )}

      {phase === 'stopped' && (
        <div className="bg-panelLight border border-signal/30 rounded-lg p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-paper text-sm">Recording captured — {formatElapsed(elapsed)}</div>
            <div className="text-mist text-[11px]">Upload it to run transcription, summary, tasks and sentiment analysis.</div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={discard} className="text-mist text-xs font-mono px-3 py-2 hover:underline">
              discard
            </button>
            <button
              type="button"
              onClick={upload}
              className="bg-signal text-ink font-medium px-4 py-2 rounded-lg text-sm hover:brightness-110 transition-all"
            >
              Upload & process
            </button>
          </div>
        </div>
      )}

      {phase === 'uploading' && (
        <div className="bg-panelLight border border-line rounded-lg p-4 text-mist text-sm font-mono">Uploading recording…</div>
      )}

      {error && <p className="text-coral text-xs font-mono">{error}</p>}
    </div>
  )
}
