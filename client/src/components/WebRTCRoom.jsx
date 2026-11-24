import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.jsx';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function WebRTCRoom({
  sessionId,
  roomName,
  displayName = 'QuickFix Student',
  peerName = 'Peer Student',
  onJoined,
  onHangup,
}) {
  const { socket, socketConnected } = useNotifications();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pendingIceRef = useRef([]);
  const onJoinedRef = useRef(onJoined);
  const onHangupRef = useRef(onHangup);

  onJoinedRef.current = onJoined;
  onHangupRef.current = onHangup;

  const [connectionState, setConnectionState] = useState('connecting'); // connecting | waiting | connected
  const [mediaError, setMediaError] = useState('');
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [activePeerName, setActivePeerName] = useState(peerName);

  const cleanupPeerConnection = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // Ignore close errors
      }
      pcRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    pendingIceRef.current = [];
    setRemoteConnected(false);
  }, []);

  const createPeerConnection = useCallback(
    (sock) => {
      cleanupPeerConnection();
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          pc.addTrack(track, localStreamRef.current);
        }
      }

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (remoteVideoRef.current && stream) {
          remoteVideoRef.current.srcObject = stream;
          setRemoteConnected(true);
          setConnectionState('connected');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && sock) {
          sock.emit('webrtc:ice-candidate', {
            sessionId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setRemoteConnected(true);
          setConnectionState('connected');
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          setRemoteConnected(false);
          setConnectionState('waiting');
        }
      };

      return pc;
    },
    [cleanupPeerConnection, sessionId]
  );

  useEffect(() => {
    if (!sessionId || !socket) return undefined;
    let active = true;

    async function setupMediaAndSignaling() {
      setMediaError('');
      setConnectionState('connecting');

      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch {
          try {
            const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!active) {
              audioOnly.getTracks().forEach((t) => t.stop());
              return;
            }
            localStreamRef.current = audioOnly;
            setVideoMuted(true);
            setMediaError('Camera unavailable; joined with microphone only.');
          } catch {
            setAudioMuted(true);
            setVideoMuted(true);
            setMediaError(
              'Camera/microphone permissions denied or unavailable. You can still watch and listen.'
            );
          }
        }
      } else {
        setMediaError('Browser media devices unavailable in this context.');
      }

      if (!active) return;
      if (onJoinedRef.current) onJoinedRef.current();

      const handleOffer = async (payload) => {
        if (!active || String(payload?.sessionId) !== String(sessionId)) return;
        if (payload?.fromName) setActivePeerName(payload.fromName);

        const pc = createPeerConnection(socket);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        for (const candidate of pendingIceRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        pendingIceRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', { sessionId, answer });
        setConnectionState('connected');
      };

      const handleAnswer = async (payload) => {
        if (!active || String(payload?.sessionId) !== String(sessionId)) return;
        if (!pcRef.current) return;
        if (payload?.fromName) setActivePeerName(payload.fromName);

        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
        for (const candidate of pendingIceRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        pendingIceRef.current = [];
        setConnectionState('connected');
      };

      const handleIceCandidate = async (payload) => {
        if (!active || String(payload?.sessionId) !== String(sessionId) || !payload?.candidate) {
          return;
        }
        if (pcRef.current && pcRef.current.remoteDescription) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
        } else {
          pendingIceRef.current.push(payload.candidate);
        }
      };

      const handlePeerJoined = (payload) => {
        if (!active || String(payload?.sessionId) !== String(sessionId)) return;
        if (payload?.fullName) setActivePeerName(payload.fullName);
      };

      const handlePeerLeft = (payload) => {
        if (!active || String(payload?.sessionId) !== String(sessionId)) return;
        cleanupPeerConnection();
        setConnectionState('waiting');
      };

      socket.on('webrtc:offer', handleOffer);
      socket.on('webrtc:answer', handleAnswer);
      socket.on('webrtc:ice-candidate', handleIceCandidate);
      socket.on('webrtc:peer-joined', handlePeerJoined);
      socket.on('webrtc:peer-left', handlePeerLeft);

      socket.emit('session:join', { sessionId }, async (ack) => {
        if (!active) return;
        if (!ack?.ok) {
          setMediaError(ack?.error || 'Unable to join signaling room.');
          return;
        }
        if (ack.peers && ack.peers.length > 0) {
          if (ack.peers[0]?.fullName) setActivePeerName(ack.peers[0].fullName);
          const pc = createPeerConnection(socket);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc:offer', { sessionId, offer });
        } else {
          setConnectionState('waiting');
        }
      });

      return () => {
        socket.off('webrtc:offer', handleOffer);
        socket.off('webrtc:answer', handleAnswer);
        socket.off('webrtc:ice-candidate', handleIceCandidate);
        socket.off('webrtc:peer-joined', handlePeerJoined);
        socket.off('webrtc:peer-left', handlePeerLeft);
      };
    }

    let detachListeners = null;
    setupMediaAndSignaling().then((cleanupFn) => {
      detachListeners = cleanupFn;
    });

    return () => {
      active = false;
      if (detachListeners) detachListeners();
      socket.emit('session:leave', { sessionId });
      cleanupPeerConnection();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
    };
  }, [sessionId, socket, socketConnected, createPeerConnection, cleanupPeerConnection]);

  const toggleAudio = () => {
    if (!localStreamRef.current) return;
    const nextMuted = !audioMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setAudioMuted(nextMuted);
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const nextMuted = !videoMuted;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setVideoMuted(nextMuted);
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current) return;
    if (screenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      const cameraTrack = localStreamRef.current?.getVideoTracks()?.[0];
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && cameraTrack) {
        await sender.replaceTrack(cameraTrack);
      }
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setScreenSharing(false);
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];
      screenStreamRef.current = displayStream;

      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
      }
      setScreenSharing(true);

      screenTrack.onended = () => {
        setScreenSharing(false);
        const cameraTrack = localStreamRef.current?.getVideoTracks()?.[0];
        if (sender && cameraTrack) {
          sender.replaceTrack(cameraTrack).catch(() => {});
        }
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      };
    } catch {
      // User cancelled screen share prompt
    }
  };

  const handleLeave = () => {
    if (socket) {
      socket.emit('session:leave', { sessionId });
    }
    cleanupPeerConnection();
    if (onHangupRef.current) onHangupRef.current();
  };

  return (
    <div className="space-y-3">
      {mediaError && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/35 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{mediaError}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-zinc-200 dark:border-[#334155] rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 min-h-[380px]">
          {/* Local Stream */}
          <div className="relative bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center min-h-[220px]">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-slate-950/75 text-white text-xs font-medium">
              {displayName} (You)
            </div>
          </div>

          {/* Remote Stream */}
          <div className="relative bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center min-h-[220px]">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${remoteConnected ? 'block' : 'hidden'}`}
            />
            {!remoteConnected && (
              <div className="text-center px-4 space-y-1.5">
                <Video className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="text-sm font-medium text-slate-200">
                  Waiting for {activePeerName} to join room
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  {roomName} · {connectionState === 'connecting' ? 'Connecting...' : 'Ready'}
                </p>
              </div>
            )}
            {remoteConnected && (
              <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-slate-950/75 text-white text-xs font-medium">
                {activePeerName}
              </div>
            )}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-white dark:bg-[#1E293B] border-t border-zinc-200 dark:border-[#334155] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-zinc-500 dark:text-[#94A3B8]">
            Direct Peer-to-Peer WebRTC · Room <span className="font-mono">{roomName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleAudio}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                audioMuted
                  ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/35'
                  : 'bg-white dark:bg-[#273449] text-zinc-700 dark:text-slate-200 border-zinc-200 dark:border-[#334155] hover:bg-zinc-50 dark:hover:bg-slate-700'
              }`}
            >
              {audioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{audioMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                videoMuted
                  ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/35'
                  : 'bg-white dark:bg-[#273449] text-zinc-700 dark:text-slate-200 border-zinc-200 dark:border-[#334155] hover:bg-zinc-50 dark:hover:bg-slate-700'
              }`}
            >
              {videoMuted ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              <span>{videoMuted ? 'Camera Off' : 'Camera On'}</span>
            </button>

            <button
              type="button"
              onClick={toggleScreenShare}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                screenSharing
                  ? 'bg-indigo-50 dark:bg-[#818CF8]/15 text-indigo-700 dark:text-[#818CF8] border-indigo-200 dark:border-[#818CF8]/35'
                  : 'bg-white dark:bg-[#273449] text-zinc-700 dark:text-slate-200 border-zinc-200 dark:border-[#334155] hover:bg-zinc-50 dark:hover:bg-slate-700'
              }`}
            >
              <MonitorUp className="w-3.5 h-3.5" />
              <span>{screenSharing ? 'Stop Share' : 'Share Screen'}</span>
            </button>

            <button
              type="button"
              onClick={handleLeave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/35 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/25 transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Leave Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
