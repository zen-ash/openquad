import type { SignalData } from '@quad/shared'
import { send } from '../net/connection'
import { audioContext, createAnalyser, playRemote, type RemoteAudio } from './audio'
import { useVoice } from './store'

type Peer = {
  pc: RTCPeerConnection
  audio: RemoteAudio | null
  // signals have to be handled one at a time, in order
  queue: Promise<void>
}

// replaced with the server's list (which has TURN in production) once it loads
let iceServers: RTCIceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }]

export const peers = new Map<string, Peer>()

let mic: MediaStream | null = null
// calls wait for this: mic permission answered + ice servers loaded
let ready: Promise<unknown> = Promise.resolve()
export let micAnalyser: AnalyserNode | null = null

export function startMic() {
  audioContext() // we're inside the join click here, so audio is allowed to start

  const ice = fetch('/ice')
    .then((res) => res.json())
    .then((servers: RTCIceServer[]) => (iceServers = servers))
    .catch(() => {}) // keep the default stun server

  if (mic) return
  if (!navigator.mediaDevices) {
    // mic needs https (or localhost). you can still listen
    useVoice.setState({ mic: 'blocked' })
    ready = ice
    return
  }

  const micAnswered = navigator.mediaDevices
    .getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    .then((stream) => {
      mic = stream
      micAnalyser = createAnalyser(stream).analyser
      useVoice.setState({ mic: 'on' })
    })
    .catch(() => {
      useVoice.setState({ mic: 'blocked' })
    })
  ready = Promise.all([micAnswered, ice])
}

export function setMuted(muted: boolean) {
  mic?.getAudioTracks().forEach((t) => (t.enabled = !muted))
  useVoice.setState({ muted })
}

function createPeer(id: string) {
  const pc = new RTCPeerConnection({ iceServers })
  // ice servers might have loaded after the peer was made, and they have to be set
  // before anything starts connecting
  const peer: Peer = {
    pc,
    audio: null,
    queue: ready.then(() => pc.setConfiguration({ iceServers })),
  }
  peers.set(id, peer)

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      send({ type: 'signal', to: id, data: { kind: 'candidate', candidate: e.candidate.toJSON() } })
    }
  }
  pc.ontrack = (e) => {
    peer.audio?.stop()
    peer.audio = playRemote(e.streams[0] ?? new MediaStream([e.track]))
  }
  pc.onconnectionstatechange = () => {
    // the next planning round will call them again if they're still close
    if (pc.connectionState === 'failed') hangUp(id)
  }
  return peer
}

function sendDescription(to: string, pc: RTCPeerConnection) {
  const { type, sdp } = pc.localDescription!
  send({ type: 'signal', to, data: { kind: 'description', description: { type, sdp } } })
}

export function call(id: string) {
  if (peers.has(id)) return
  const peer = createPeer(id)
  const { pc } = peer

  peer.queue = peer.queue
    .then(async () => {
      if (mic) mic.getAudioTracks().forEach((t) => pc.addTrack(t, mic!))
      else pc.addTransceiver('audio', { direction: 'recvonly' }) // no mic, just listen

      await pc.setLocalDescription()
      sendDescription(id, pc)
    })
    .catch((err) => console.warn('call failed', err))
}

export function handleSignal(from: string, data: SignalData) {
  if (data.kind === 'bye') {
    closePeer(from)
    return
  }

  let peer = peers.get(from)
  if (!peer) {
    // only an offer can start a new call
    if (data.kind !== 'description' || data.description.type !== 'offer') return
    peer = createPeer(from)
  }
  const { pc } = peer

  peer.queue = peer.queue
    .then(async () => {
      if (data.kind === 'candidate') {
        await pc.addIceCandidate(data.candidate as RTCIceCandidateInit)
        return
      }
      await pc.setRemoteDescription(data.description as RTCSessionDescriptionInit)
      if (data.description.type === 'offer') {
        // tracks have to be added after the offer, otherwise they don't get matched
        // up with the offer's audio line and never get sent
        if (mic) mic.getAudioTracks().forEach((t) => pc.addTrack(t, mic!))
        await pc.setLocalDescription()
        sendDescription(from, pc)
      }
    })
    .catch((err) => console.warn('voice signal failed', err))
}

export function closePeer(id: string) {
  const peer = peers.get(id)
  if (!peer) return
  peer.pc.close()
  peer.audio?.stop()
  peers.delete(id)
}

export function hangUp(id: string) {
  if (!peers.has(id)) return
  send({ type: 'signal', to: id, data: { kind: 'bye' } })
  closePeer(id)
}

export function closeAll() {
  for (const id of [...peers.keys()]) closePeer(id)
}
