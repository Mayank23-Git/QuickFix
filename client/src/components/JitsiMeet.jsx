import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Info,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from 'lucide-react';
import { WebRTCRoom } from './WebRTCRoom.jsx';

// jitsi.riot.im & meet.element.io allow unauthenticated room creation + iframe embedding
// without meet.jit.si's "waiting for moderator" login requirement.
const JITSI_SERVERS = [
  { id: 'jitsi.riot.im', label: 'Jitsi Open (riot.im)' },
  { id: 'meet.element.io', label: 'Jitsi Mirror (element.io)' },
];

const scriptPromises = new Map();

function loadJitsiExternalApi(domain) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Browser window unavailable'));
  }

  const existingScript = document.querySelector(`script[data-jitsi-domain="${domain}"]`);
  if (window.JitsiMeetExternalAPI && existingScript) {
    return Promise.resolve(window.JitsiMeetExternalAPI);
  }
  if (scriptPromises.has(domain)) {
    return scriptPromises.get(domain);
  }

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.dataset.jitsiDomain = domain;
    script.onload = () => {
      if (window.JitsiMeetExternalAPI) {
        resolve(window.JitsiMeetExternalAPI);
      } else {
        scriptPromises.delete(domain);
        reject(new Error(`Jitsi API unavailable on ${domain}`));
      }
    };
    script.onerror = () => {
      scriptPromises.delete(domain);
      reject(new Error(`Unable to load script from ${domain}`));
    };
    document.body.appendChild(script);
  });

  scriptPromises.set(domain, promise);
  return promise;
}

export function JitsiMeet({
  sessionId,
  roomName,
  displayName = 'QuickFix Student',
  email,
  peerName = 'Peer Student',
  height = 540,
  onJoined,
  onHangup,
}) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const onJoinedRef = useRef(onJoined);
  const onHangupRef = useRef(onHangup);

  onJoinedRef.current = onJoined;
  onHangupRef.current = onHangup;

  const resolvedRoomName =
    roomName || `QuickFix-Session-${String(sessionId || 'room').replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const [mode, setMode] = useState('jitsi.riot.im'); // 'jitsi.riot.im' | 'meet.element.io' | 'webrtc'
  const [embedState, setEmbedState] = useState('loading'); // loading | ready | fallback-iframe
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeDomain = mode === 'webrtc' ? 'jitsi.riot.im' : mode;
  const directRoomUrl = `https://${activeDomain}/${encodeURIComponent(
    resolvedRoomName
  )}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&userInfo.displayName=${encodeURIComponent(
    displayName
  )}`;
  const ffmucTabUrl = `https://meet.ffmuc.net/${encodeURIComponent(resolvedRoomName)}`;

  useEffect(() => {
    if (mode === 'webrtc' || (!sessionId && !roomName)) return undefined;
    let active = true;

    async function initJitsi() {
      setEmbedState('loading');
      try {
        const JitsiMeetExternalAPI = await loadJitsiExternalApi(mode);
        if (!active || !containerRef.current) return;

        containerRef.current.innerHTML = '';
        const api = new JitsiMeetExternalAPI(mode, {
          roomName: resolvedRoomName,
          parentNode: containerRef.current,
          width: '100%',
          height,
          userInfo: {
            displayName,
            ...(email ? { email } : {}),
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            enableLobbyChat: false,
            requireDisplayName: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'desktop',
              'chat',
              'raisehand',
              'tileview',
              'fullscreen',
              'hangup',
            ],
          },
        });

        apiRef.current = api;
        setEmbedState('ready');

        api.addEventListener('videoConferenceJoined', () => {
          if (onJoinedRef.current) onJoinedRef.current();
        });

        api.addEventListener('audioMuteStatusChanged', (event) => {
          if (active) setAudioMuted(Boolean(event?.muted));
        });

        api.addEventListener('videoMuteStatusChanged', (event) => {
          if (active) setVideoMuted(Boolean(event?.muted));
        });

        api.addEventListener('screenSharingStatusChanged', (event) => {
          if (active) setScreenSharing(Boolean(event?.on));
        });

        api.addEventListener('readyToClose', () => {
          if (onHangupRef.current) onHangupRef.current();
        });
      } catch {
        if (active) {
          setEmbedState('fallback-iframe');
          if (onJoinedRef.current) onJoinedRef.current();
        }
      }
    }

    initJitsi();

    return () => {
      active = false;
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch {
          // Ignore dispose errors on unmount
        }
        apiRef.current = null;
      }
    };
  }, [mode, sessionId, roomName, resolvedRoomName, displayName, email, height]);

  const runCommand = (command) => {
    if (!apiRef.current) return;
    try {
      apiRef.current.executeCommand(command);
    } catch {
      // Ignore if conference is not yet ready
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(directRoomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked by browser policy
    }
  };

  return (
    <div className="space-y-3">
      {/* Room Header & Server/Mode Switcher */}
      <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Video className="w-4 h-4 text-indigo-600 dark:text-[#818CF8] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-[#F8FAFC] truncate">
                Shared Room: <span className="font-mono text-xs text-zinc-600 dark:text-[#94A3B8]">{resolvedRoomName}</span>
              </p>
              {sessionId && (
                <p className="text-[11px] text-zinc-500 dark:text-[#94A3B8] font-mono truncate">
                  Session ID: {sessionId}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-100 dark:bg-[#111827] border border-transparent dark:border-[#334155] rounded-lg" role="group" aria-label="Video engine">
            {JITSI_SERVERS.map((server) => (
              <button
                key={server.id}
                type="button"
                onClick={() => setMode(server.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === server.id
                    ? 'bg-white dark:bg-[#273449] text-zinc-900 dark:text-[#F8FAFC] shadow-xs'
                    : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]'
                }`}
              >
                {server.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMode('webrtc')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'webrtc'
                  ? 'bg-white dark:bg-[#273449] text-indigo-700 dark:text-[#818CF8] shadow-xs'
                  : 'text-zinc-600 dark:text-[#94A3B8] hover:text-zinc-900 dark:hover:text-[#F8FAFC]'
              }`}
            >
              Direct WebRTC
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-[#334155]">
          <div className="flex flex-wrap items-center gap-2">
            {mode !== 'webrtc' && embedState === 'ready' && (
              <>
                <button
                  type="button"
                  onClick={() => runCommand('toggleAudio')}
                  aria-label={audioMuted ? 'Unmute microphone' : 'Mute microphone'}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
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
                  onClick={() => runCommand('toggleVideo')}
                  aria-label={videoMuted ? 'Turn camera on' : 'Turn camera off'}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
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
                  onClick={() => runCommand('toggleShareScreen')}
                  aria-label="Toggle screen sharing"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
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
                  onClick={() => runCommand('hangup')}
                  aria-label="Leave video call"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/35 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/25 transition-colors whitespace-nowrap"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>Leave Call</span>
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-slate-200 bg-white dark:bg-[#273449] border border-zinc-200 dark:border-[#334155] rounded-lg hover:bg-zinc-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#2DD4BF]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            <a
              href={directRoomUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-[#818CF8] bg-indigo-50 dark:bg-[#818CF8]/15 border border-indigo-200 dark:border-[#818CF8]/35 rounded-lg hover:bg-indigo-100 dark:hover:bg-[#818CF8]/25 transition-colors whitespace-nowrap"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Video Conference Surface */}
      {mode === 'webrtc' ? (
        <WebRTCRoom
          sessionId={sessionId}
          roomName={resolvedRoomName}
          displayName={displayName}
          peerName={peerName}
          onJoined={onJoined}
          onHangup={onHangup}
        />
      ) : (
        <div className="bg-white dark:bg-[#1E293B] border border-zinc-200 dark:border-[#334155] rounded-xl overflow-hidden">
          {embedState === 'loading' && (
            <div
              style={{ height }}
              className="flex flex-col items-center justify-center gap-2 text-sm text-zinc-500 dark:text-[#94A3B8] bg-zinc-50 dark:bg-[#111827]"
            >
              <p>Connecting to Jitsi Meet room on {mode}...</p>
              <p className="text-xs text-zinc-400 dark:text-[#94A3B8]/80">
                Allow camera and microphone permissions when prompted by your browser.
              </p>
            </div>
          )}

          {embedState === 'fallback-iframe' ? (
            <iframe
              title={`QuickFix Video Room ${resolvedRoomName}`}
              src={directRoomUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              style={{ height }}
              className="w-full border-0"
            />
          ) : (
            <div
              ref={containerRef}
              className={embedState === 'loading' ? 'hidden' : 'w-full'}
              style={embedState === 'loading' ? undefined : { minHeight: height }}
            />
          )}
        </div>
      )}

      <div className="flex items-start gap-2.5 bg-zinc-50 dark:bg-[#111827] border border-zinc-200 dark:border-[#334155] rounded-xl p-3.5 text-xs text-zinc-600 dark:text-[#94A3B8]">
        <Info className="w-4 h-4 text-zinc-500 dark:text-[#94A3B8] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          QuickFix uses open, moderator-free Jitsi infrastructure (default{' '}
          <span className="font-mono">jitsi.riot.im</span>, mirror{' '}
          <span className="font-mono">meet.element.io</span>) instead of{' '}
          <span className="font-mono">meet.jit.si</span> (which now blocks unauthenticated rooms with a moderator login wait). Both participants automatically share room{' '}
          <span className="font-mono">{resolvedRoomName}</span>. If your campus network restricts public Jitsi servers, switch to{' '}
          <button
            type="button"
            onClick={() => setMode('webrtc')}
            className="font-medium text-indigo-700 dark:text-[#818CF8] hover:underline"
          >
            Direct WebRTC
          </button>{' '}
          above or{' '}
          <a
            href={ffmucTabUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-700 dark:text-[#818CF8] hover:underline"
          >
            open meet.ffmuc.net in a new tab
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default JitsiMeet;
