/**
 * Vibe: Peer-to-Peer Calling & Screen Sharing with Feed Pinning
 * Aligned with Kiruu Dashboard UI design tokens.
 * Powered by WebRTC, Web Crypto (SHA-256), and Cloud Firestore Signaling.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Firebase Initialization
const firebaseConfig = {
  apiKey: "AIzaSyBPtK3e9etXMIxmbZB0sAKd4Rluf-ahB4c",
  projectId: "pangasinan-dataset"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// 2. WebRTC STUN Servers for NAT Traversal
const rtcConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ],
  iceCandidatePoolSize: 10
};

// 3. Application State
const state = {
  role: null, // "host" | "guest"
  roomId: null,
  passcode: "",
  passcodeHash: "",
  userName: "",
  peerName: "",
  localStream: null,
  remoteStream: null,
  screenStream: null,
  micEnabled: true,
  camEnabled: true,
  isScreenSharing: false,
  peerConnection: null,
  dataChannel: null,
  roomUnsubscribe: null,
  isRoomDocCreated: false,
  isRemoteDescriptionSet: false,
  localIceBuffer: [],
  remoteIceQueue: [],
  processedIceCandidates: new Set(),
  activeDrawer: null, // null | "info" | "chat"
  unreadChatCount: 0,
  callStartTime: null,
  timerInterval: null,
  audioContext: null,
  analyser: null,
  pinnedTile: null // null | "remote" | "local"
};

// 4. DOM Elements
const elements = {
  toast: document.getElementById("toast"),
  audioPrompt: document.getElementById("audio-prompt"),
  btnEnableAudio: document.getElementById("btn-enable-audio"),
  lobbyScreen: document.getElementById("lobby-screen"),
  meetingScreen: document.getElementById("meeting-screen"),
  endedScreen: document.getElementById("ended-screen"),

  // Lobby elements
  lobbyVideo: document.getElementById("lobby-preview-video"),
  lobbyAvatarFallback: document.getElementById("lobby-avatar-fallback"),
  lobbyAvatarLetter: document.getElementById("lobby-avatar-letter"),
  lobbyMicIndicator: document.getElementById("lobby-mic-indicator"),
  lobbyAudioDot: document.getElementById("lobby-audio-dot"),
  lobbyAudioText: document.getElementById("lobby-audio-text"),
  lobbyToggleMic: document.getElementById("lobby-toggle-mic"),
  lobbyToggleCam: document.getElementById("lobby-toggle-cam"),
  displayNameInput: document.getElementById("display-name-input"),
  tabBtnCreate: document.getElementById("tab-btn-create"),
  tabBtnJoin: document.getElementById("tab-btn-join"),
  panelCreate: document.getElementById("panel-create"),
  panelJoin: document.getElementById("panel-join"),
  createPasscodeInput: document.getElementById("create-passcode-input"),
  joinPasscodeInput: document.getElementById("join-passcode-input"),
  toggleCreatePasscode: document.getElementById("toggle-create-passcode"),
  toggleJoinPasscode: document.getElementById("toggle-join-passcode"),
  customRoomId: document.getElementById("custom-room-id"),
  joinRoomId: document.getElementById("join-room-id"),
  btnGenerateCode: document.getElementById("btn-generate-code"),
  btnStartMeeting: document.getElementById("btn-start-meeting"),
  btnJoinMeeting: document.getElementById("btn-join-meeting"),
  lobbyErrorNotice: document.getElementById("lobby-error-notice"),
  lobbyErrorMessage: document.getElementById("lobby-error-message"),

  // Meeting stage elements
  headerRoomCode: document.getElementById("header-room-code"),
  bottomRoomCode: document.getElementById("bottom-room-code"),
  callDurationTimer: document.getElementById("call-duration-timer"),
  connectionStatusBadge: document.getElementById("connection-status-badge"),
  pinStatusBanner: document.getElementById("pin-status-banner"),
  pinStatusText: document.getElementById("pin-status-text"),
  btnUnpinAll: document.getElementById("btn-unpin-all"),

  waitingOverlay: document.getElementById("waiting-overlay"),
  waitingCodeDisplay: document.getElementById("waiting-code-display"),
  waitingPasscodeDisplay: document.getElementById("waiting-passcode-display"),
  btnCopyWaitingInvite: document.getElementById("btn-copy-waiting-invite"),

  participantsGrid: document.getElementById("participants-grid"),

  remoteTile: document.getElementById("remote-tile"),
  remoteVideo: document.getElementById("remote-video"),
  remoteAvatarFallback: document.getElementById("remote-avatar-fallback"),
  remoteAvatarLetter: document.getElementById("remote-avatar-letter"),
  remoteNameLabel: document.getElementById("remote-name-label"),
  remoteMicStatus: document.getElementById("remote-mic-status"),
  pinRemoteBtn: document.getElementById("pin-remote-btn"),

  localTile: document.getElementById("local-tile"),
  localVideo: document.getElementById("local-video"),
  localAvatarFallback: document.getElementById("local-avatar-fallback"),
  localAvatarLetter: document.getElementById("local-avatar-letter"),
  localNameLabel: document.getElementById("local-name-label"),
  localMicStatus: document.getElementById("local-mic-status"),
  pinLocalBtn: document.getElementById("pin-local-btn"),

  // Control bar buttons
  ctrlMic: document.getElementById("ctrl-mic"),
  ctrlCam: document.getElementById("ctrl-cam"),
  ctrlScreen: document.getElementById("ctrl-screen"),
  ctrlLeave: document.getElementById("ctrl-leave"),
  ctrlInfo: document.getElementById("ctrl-info"),
  ctrlChat: document.getElementById("ctrl-chat"),
  chatUnreadBadge: document.getElementById("chat-unread-badge"),

  // Side Drawer elements
  sideDrawer: document.getElementById("side-drawer"),
  drawerTitle: document.getElementById("drawer-title"),
  btnCloseDrawer: document.getElementById("btn-close-drawer"),
  drawerPanelInfo: document.getElementById("drawer-panel-info"),
  drawerPanelChat: document.getElementById("drawer-panel-chat"),
  drawerRoomCode: document.getElementById("drawer-room-code"),
  drawerPasscodeDisplay: document.getElementById("drawer-passcode-display"),
  btnCopyDrawerLink: document.getElementById("btn-copy-drawer-link"),
  chatMessagesContainer: document.getElementById("chat-messages-container"),
  chatEmptyHint: document.getElementById("chat-empty-hint"),
  chatForm: document.getElementById("chat-form"),
  chatInputField: document.getElementById("chat-input-field"),

  // Ended screen
  endedDurationText: document.getElementById("ended-duration-text"),
  btnRejoin: document.getElementById("btn-rejoin"),
  btnReturnLobby: document.getElementById("btn-return-lobby")
};

// ============================================================
// HELPER UTILITIES
// ============================================================

/**
 * SHA-256 Passcode Hasher using Web Crypto API
 */
async function hashPasscode(passcode) {
  const clean = (passcode || "").trim();
  if (!clean) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(clean);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate readable room code
 */
function generateRoomCode() {
  const part1 = Math.floor(100 + Math.random() * 900);
  const part2 = Math.floor(100 + Math.random() * 900);
  return `vibe-${part1}-${part2}`;
}

/**
 * Show temporary toast message
 */
function showToast(message, duration = 3000) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  clearTimeout(elements.toast._timer);
  elements.toast._timer = setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, duration);
}

/**
 * Show lobby error notification
 */
function showLobbyError(message) {
  if (!message) {
    elements.lobbyErrorNotice.classList.add("hidden");
    elements.lobbyErrorMessage.textContent = "";
    return;
  }
  elements.lobbyErrorMessage.textContent = message;
  elements.lobbyErrorNotice.classList.remove("hidden");
}

/**
 * Format elapsed seconds to mm:ss
 */
function formatDuration(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

/**
 * Update UI connection status badge
 */
function setConnectionStatus(status, text) {
  elements.connectionStatusBadge.className = `network-badge ${status}`;
  elements.connectionStatusBadge.textContent = text;
}

// ============================================================
// LOCAL MEDIA STREAM INITIALIZATION
// ============================================================

async function initializeLocalMedia() {
  try {
    let stream;
    try {
      // Primary attempt: both audio and video
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
      });
    } catch (fullMediaError) {
      console.warn("Full audio+video media stream failed, falling back:", fullMediaError);
      // Fallback: try video only or audio only
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        state.camEnabled = false;
      } catch (audioOnlyError) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        state.micEnabled = false;
      }
    }

    state.localStream = stream;
    elements.lobbyVideo.srcObject = stream;
    elements.localVideo.srcObject = stream;

    // Apply initial mute and camera states
    applyAudioState(state.micEnabled);
    applyVideoState(state.camEnabled);

    initAudioVisualizer(stream);
  } catch (err) {
    console.warn("Camera or microphone permission was blocked:", err);
    showLobbyError("Camera or microphone access was blocked. Check browser permissions.");
    applyVideoState(false);
    applyAudioState(false);
  }
}

/**
 * Audio Level Analyzer for speaking ring
 */
function initAudioVisualizer(stream) {
  try {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContext();
    const source = state.audioContext.createMediaStreamSource(stream);
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 64;
    source.connect(state.analyser);

    const bufferLength = state.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      if (!state.micEnabled || !state.audioContext) {
        elements.localAvatarFallback.classList.remove("speaking");
        requestAnimationFrame(checkVolume);
        return;
      }
      state.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      if (avg > 25) {
        elements.localAvatarFallback.classList.add("speaking");
      } else {
        elements.localAvatarFallback.classList.remove("speaking");
      }
      requestAnimationFrame(checkVolume);
    };

    requestAnimationFrame(checkVolume);
  } catch (e) {
    console.debug("Audio visualizer optional feature not available:", e);
  }
}

function applyAudioState(enabled) {
  state.micEnabled = enabled;
  if (state.localStream) {
    state.localStream.getAudioTracks().forEach(t => {
      t.enabled = enabled;
    });
  }

  // Lobby toggle button styling
  updateMicButtonUI(elements.lobbyToggleMic, enabled);
  updateMicButtonUI(elements.ctrlMic, enabled);

  // Status indicators
  if (enabled) {
    elements.lobbyAudioDot.classList.remove("muted");
    elements.lobbyAudioText.textContent = "Mic ready";
    elements.localMicStatus.classList.add("hidden");
  } else {
    elements.lobbyAudioDot.classList.add("muted");
    elements.lobbyAudioText.textContent = "Mic muted";
    elements.localMicStatus.classList.remove("hidden");
  }

  // Notify peer
  sendDataMessage({ type: "peer-mic", muted: !enabled });
  updateRoomDocumentStatus({ [`${state.role}Muted`]: !enabled });
}

function applyVideoState(enabled) {
  state.camEnabled = enabled;
  if (state.localStream) {
    state.localStream.getVideoTracks().forEach(t => {
      t.enabled = enabled;
    });
  }

  // Button UI updates
  updateCamButtonUI(elements.lobbyToggleCam, enabled);
  updateCamButtonUI(elements.ctrlCam, enabled);

  // Video vs Avatar fallback toggles
  if (enabled) {
    elements.lobbyVideo.classList.remove("hidden");
    elements.lobbyAvatarFallback.classList.add("hidden");
    elements.localVideo.classList.remove("hidden");
    elements.localAvatarFallback.classList.add("hidden");
  } else {
    elements.lobbyVideo.classList.add("hidden");
    elements.lobbyAvatarFallback.classList.remove("hidden");
    elements.localVideo.classList.add("hidden");
    elements.localAvatarFallback.classList.remove("hidden");
  }

  // Notify peer
  sendDataMessage({ type: "peer-cam", camOff: !enabled });
  updateRoomDocumentStatus({ [`${state.role}CamOff`]: !enabled });
}

function updateMicButtonUI(buttonEl, enabled) {
  if (!buttonEl) return;
  const icon = buttonEl.querySelector(".material-symbols-outlined");
  if (enabled) {
    buttonEl.classList.remove("muted");
    buttonEl.title = "Turn off microphone";
    if (icon) icon.textContent = "mic";
  } else {
    buttonEl.classList.add("muted");
    buttonEl.title = "Turn on microphone";
    if (icon) icon.textContent = "mic_off";
  }
}

function updateCamButtonUI(buttonEl, enabled) {
  if (!buttonEl) return;
  const icon = buttonEl.querySelector(".material-symbols-outlined");
  if (enabled) {
    buttonEl.classList.remove("muted");
    buttonEl.title = "Turn off camera";
    if (icon) icon.textContent = "videocam";
  } else {
    buttonEl.classList.add("muted");
    buttonEl.title = "Turn on camera";
    if (icon) icon.textContent = "videocam_off";
  }
}

// ============================================================
// ICE QUEUE & BUFFER HANDLING (CRITICAL FIX FOR CONNECTION)
// ============================================================

async function processRemoteIceCandidate(candidateData) {
  if (!candidateData || !candidateData.candidate) return;

  const pc = state.peerConnection;
  if (!pc || !state.isRemoteDescriptionSet || !pc.remoteDescription) {
    state.remoteIceQueue.push(candidateData);
    return;
  }

  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidateData));
  } catch (err) {
    console.warn("Failed to add remote ICE candidate:", err);
  }
}

async function drainRemoteIceQueue() {
  const pc = state.peerConnection;
  if (!pc || !pc.remoteDescription) return;

  while (state.remoteIceQueue.length > 0) {
    const candidateData = state.remoteIceQueue.shift();
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidateData));
    } catch (err) {
      console.warn("Failed to drain remote ICE candidate:", err);
    }
  }
}

// ============================================================
// WEBRTC CONNECTION SETUP
// ============================================================

function createPeerConnection() {
  const pc = new RTCPeerConnection(rtcConfiguration);
  state.peerConnection = pc;

  // Initialize remote stream container
  state.remoteStream = new MediaStream();
  elements.remoteVideo.srcObject = state.remoteStream;

  // Add all local tracks (camera and microphone)
  if (state.localStream) {
    state.localStream.getTracks().forEach(track => {
      pc.addTrack(track, state.localStream);
      console.log("Added local track to peer connection:", track.kind);
    });
  }

  // Handle incoming remote tracks (camera, screen, microphone)
  pc.ontrack = event => {
    console.log("Remote track received:", event.track.kind, event.track.id);

    state.remoteStream.addTrack(event.track);

    // Reveal remote video tile & dismiss waiting screen
    elements.remoteTile.classList.remove("hidden");
    elements.waitingOverlay.classList.add("hidden");
    setConnectionStatus("connected", "Connected");

    // Play video stream
    elements.remoteVideo.play().catch(playErr => {
      console.warn("Remote video auto-play was blocked:", playErr);
      elements.audioPrompt.classList.remove("hidden");
    });
  };

  // Local ICE Candidate Generation
  pc.onicecandidate = async event => {
    if (!event.candidate) return;

    const candidatePayload = {
      candidate: event.candidate.candidate,
      sdpMid: event.candidate.sdpMid,
      sdpMLineIndex: event.candidate.sdpMLineIndex
    };

    // If Firestore document is not created yet, buffer candidate in memory
    if (!state.isRoomDocCreated) {
      state.localIceBuffer.push(candidatePayload);
      return;
    }

    // Otherwise write candidate directly to Firestore array
    const iceField = state.role === "host" ? "hostIce" : "guestIce";
    try {
      const roomRef = doc(db, "validations", `vibe_room_${state.roomId}`);
      await updateDoc(roomRef, {
        [iceField]: arrayUnion(candidatePayload)
      });
    } catch (err) {
      console.warn("Error updating ICE candidate in Firestore:", err);
    }
  };

  // Connection State Changes
  pc.onconnectionstatechange = () => {
    console.log("Peer connection state:", pc.connectionState);
    if (pc.connectionState === "connected") {
      setConnectionStatus("connected", "Connected");
      elements.waitingOverlay.classList.add("hidden");
    } else if (pc.connectionState === "connecting") {
      setConnectionStatus("connecting", "Connecting");
    } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
      setConnectionStatus("disconnected", "Disconnected");
      showToast("Peer connection lost");
    }
  };

  return pc;
}

// ============================================================
// DATA CHANNEL & MESSAGING
// ============================================================

function sendDataMessage(data) {
  if (state.dataChannel && state.dataChannel.readyState === "open") {
    try {
      state.dataChannel.send(JSON.stringify(data));
    } catch (e) {
      console.warn("DataChannel send failed:", e);
    }
  }
}

function setupDataChannelEvents(channel) {
  state.dataChannel = channel;
  channel.onopen = () => {
    console.log("DataChannel connected");
    // Send initial handshake with state
    sendDataMessage({
      type: "handshake",
      name: state.userName,
      muted: !state.micEnabled,
      camOff: !state.camEnabled,
      presenting: state.isScreenSharing
    });
  };

  channel.onmessage = event => {
    try {
      const data = JSON.parse(event.data);
      handlePeerDataMessage(data);
    } catch (err) {
      console.warn("Invalid data channel message:", err);
    }
  };
}

function handlePeerDataMessage(data) {
  switch (data.type) {
    case "handshake":
      if (data.name) {
        state.peerName = data.name;
        elements.remoteNameLabel.textContent = data.name;
        elements.remoteAvatarLetter.textContent = data.name.charAt(0).toUpperCase();
      }
      applyRemoteMicUI(data.muted);
      applyRemoteCamUI(data.camOff);
      break;

    case "chat":
      appendChatMessage(data.sender, data.text, data.timestamp, false);
      if (state.activeDrawer !== "chat") {
        state.unreadChatCount++;
        elements.chatUnreadBadge.textContent = state.unreadChatCount;
        elements.chatUnreadBadge.classList.remove("hidden");
      }
      break;

    case "peer-mic":
      applyRemoteMicUI(data.muted);
      break;

    case "peer-cam":
      applyRemoteCamUI(data.camOff);
      break;

    case "peer-screen":
      showToast(data.presenting ? `${data.ownerName || "Peer"} started screen sharing` : `${data.ownerName || "Peer"} stopped screen sharing`);
      break;
  }
}

function applyRemoteMicUI(isMuted) {
  if (isMuted) {
    elements.remoteMicStatus.classList.remove("hidden");
  } else {
    elements.remoteMicStatus.classList.add("hidden");
  }
}

function applyRemoteCamUI(isCamOff) {
  if (isCamOff) {
    elements.remoteVideo.classList.add("hidden");
    elements.remoteAvatarFallback.classList.remove("hidden");
  } else {
    elements.remoteVideo.classList.remove("hidden");
    elements.remoteAvatarFallback.classList.add("hidden");
  }
}

async function updateRoomDocumentStatus(fields) {
  if (!state.roomId) return;
  try {
    const roomRef = doc(db, "validations", `vibe_room_${state.roomId}`);
    await updateDoc(roomRef, fields);
  } catch (e) {
    console.debug("Firestore status update skipped:", e);
  }
}

// ============================================================
// MEETING CREATION (HOST FLOW)
// ============================================================

async function startMeetingAsHost() {
  const userName = (elements.displayNameInput.value || "").trim();
  const rawPasscode = (elements.createPasscodeInput.value || "").trim();
  let roomId = (elements.customRoomId.value || "").trim().toLowerCase();

  if (!userName) {
    showLobbyError("Please enter your name before starting the meeting.");
    elements.displayNameInput.focus();
    return;
  }

  if (!rawPasscode) {
    showLobbyError("Please set a room passcode. Both host and guest require this passcode to enter.");
    elements.createPasscodeInput.focus();
    return;
  }

  if (!roomId) {
    roomId = generateRoomCode();
  }

  roomId = roomId.replace(/[^a-z0-9_-]/g, "");

  showLobbyError(null);
  elements.btnStartMeeting.disabled = true;
  elements.btnStartMeeting.textContent = "Setting up meeting...";

  try {
    const hashedPasscode = await hashPasscode(rawPasscode);
    state.role = "host";
    state.roomId = roomId;
    state.passcode = rawPasscode;
    state.passcodeHash = hashedPasscode;
    state.userName = userName;
    state.isRoomDocCreated = false;
    state.isRemoteDescriptionSet = false;
    state.localIceBuffer = [];
    state.remoteIceQueue = [];

    const roomRef = doc(db, "validations", `vibe_room_${roomId}`);

    // Check if room exists
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const roomData = snap.data();
      if (roomData.passcodeHash && roomData.passcodeHash !== hashedPasscode) {
        showLobbyError("A meeting with this code already exists with a different passcode.");
        elements.btnStartMeeting.disabled = false;
        elements.btnStartMeeting.textContent = "Start Meeting";
        return;
      }
    }

    // Initialize peer connection
    const pc = createPeerConnection();

    // Host creates the DataChannel
    const channel = pc.createDataChannel("chat");
    setupDataChannelEvents(channel);

    // Create SDP Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Save initial room document including all candidates buffered so far
    await setDoc(roomRef, {
      roomId,
      passcodeHash: hashedPasscode,
      hostName: userName,
      guestName: null,
      createdAt: Date.now(),
      status: "waiting",
      offer: { sdp: offer.sdp, type: offer.type },
      answer: null,
      hostIce: state.localIceBuffer,
      guestIce: [],
      hostMuted: !state.micEnabled,
      guestMuted: false,
      hostCamOff: !state.camEnabled,
      guestCamOff: false,
      hostPresenting: false,
      guestPresenting: false,
      chatMessages: []
    });

    state.isRoomDocCreated = true;

    // Transition to meeting UI
    enterMeetingUI();

    // Listen for Guest Answer and updates via onSnapshot
    state.roomUnsubscribe = onSnapshot(roomRef, async snapshot => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();

      // Guest Answer
      if (data.answer && !state.isRemoteDescriptionSet) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          state.isRemoteDescriptionSet = true;
          console.log("Host set remote description from guest answer");
          await drainRemoteIceQueue();
        } catch (setRemoteErr) {
          console.warn("Host setRemoteDescription error:", setRemoteErr);
        }
      }

      // Guest Name
      if (data.guestName && !state.peerName) {
        state.peerName = data.guestName;
        elements.remoteNameLabel.textContent = data.guestName;
        elements.remoteAvatarLetter.textContent = data.guestName.charAt(0).toUpperCase();
      }

      // Process Guest ICE candidates
      if (Array.isArray(data.guestIce)) {
        for (const candidateData of data.guestIce) {
          const candidateKey = JSON.stringify(candidateData);
          if (!state.processedIceCandidates.has(candidateKey)) {
            state.processedIceCandidates.add(candidateKey);
            await processRemoteIceCandidate(candidateData);
          }
        }
      }

      // Sync Chat messages backup
      if (Array.isArray(data.chatMessages)) {
        syncFirestoreChat(data.chatMessages);
      }
    });
  } catch (err) {
    console.error("Failed to start meeting:", err);
    showLobbyError("Failed to start meeting: " + (err.message || "Unknown error"));
    elements.btnStartMeeting.disabled = false;
    elements.btnStartMeeting.textContent = "Start Meeting";
  }
}

// ============================================================
// MEETING JOINING (GUEST FLOW)
// ============================================================

async function joinMeetingAsGuest() {
  const userName = (elements.displayNameInput.value || "").trim();
  const roomId = (elements.joinRoomId.value || "").trim().toLowerCase();
  const rawPasscode = (elements.joinPasscodeInput.value || "").trim();

  if (!userName) {
    showLobbyError("Please enter your name.");
    elements.displayNameInput.focus();
    return;
  }

  if (!roomId) {
    showLobbyError("Please enter a meeting code.");
    elements.joinRoomId.focus();
    return;
  }

  if (!rawPasscode) {
    showLobbyError("Please enter the room passcode provided by the host.");
    elements.joinPasscodeInput.focus();
    return;
  }

  showLobbyError(null);
  elements.btnJoinMeeting.disabled = true;
  elements.btnJoinMeeting.textContent = "Verifying room...";

  try {
    const hashedPasscode = await hashPasscode(rawPasscode);
    const roomRef = doc(db, "validations", `vibe_room_${roomId}`);
    const snap = await getDoc(roomRef);

    if (!snap.exists()) {
      showLobbyError("Meeting not found. Please verify the code and try again.");
      elements.btnJoinMeeting.disabled = false;
      elements.btnJoinMeeting.textContent = "Join Meeting";
      return;
    }

    const roomData = snap.data();

    // PASSCODE VERIFICATION (CRITICAL HARD GATE)
    if (roomData.passcodeHash !== hashedPasscode) {
      showLobbyError("Incorrect room passcode. Access denied.");
      elements.btnJoinMeeting.disabled = false;
      elements.btnJoinMeeting.textContent = "Join Meeting";
      return;
    }

    if (!roomData.offer) {
      showLobbyError("Host is not ready yet. Please try again in a few moments.");
      elements.btnJoinMeeting.disabled = false;
      elements.btnJoinMeeting.textContent = "Join Meeting";
      return;
    }

    // Set state
    state.role = "guest";
    state.roomId = roomId;
    state.passcode = rawPasscode;
    state.passcodeHash = hashedPasscode;
    state.userName = userName;
    state.peerName = roomData.hostName || "Host";
    state.isRoomDocCreated = true;
    state.isRemoteDescriptionSet = false;
    state.localIceBuffer = [];
    state.remoteIceQueue = [];

    elements.remoteNameLabel.textContent = state.peerName;
    elements.remoteAvatarLetter.textContent = state.peerName.charAt(0).toUpperCase();

    // Create RTCPeerConnection
    const pc = createPeerConnection();

    // Guest listens for incoming data channel
    pc.ondatachannel = event => {
      setupDataChannelEvents(event.channel);
    };

    // Set Host Offer as Remote Description
    await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer));
    state.isRemoteDescriptionSet = true;
    console.log("Guest set remote description from host offer");

    // Process initial Host ICE candidates
    if (Array.isArray(roomData.hostIce)) {
      for (const candidateData of roomData.hostIce) {
        const candidateKey = JSON.stringify(candidateData);
        if (!state.processedIceCandidates.has(candidateKey)) {
          state.processedIceCandidates.add(candidateKey);
          await processRemoteIceCandidate(candidateData);
        }
      }
    }

    // Create SDP Answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // Drain any remaining queued candidates
    await drainRemoteIceQueue();

    // Update Firestore with guest answer and initial candidates
    await updateDoc(roomRef, {
      answer: { sdp: answer.sdp, type: answer.type },
      guestName: userName,
      guestIce: state.localIceBuffer,
      status: "connected"
    });

    // Enter active meeting screen
    enterMeetingUI();

    // Listen for future snapshot updates
    state.roomUnsubscribe = onSnapshot(roomRef, async snapshot => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();

      // Host ICE candidates
      if (Array.isArray(data.hostIce)) {
        for (const candidateData of data.hostIce) {
          const candidateKey = JSON.stringify(candidateData);
          if (!state.processedIceCandidates.has(candidateKey)) {
            state.processedIceCandidates.add(candidateKey);
            await processRemoteIceCandidate(candidateData);
          }
        }
      }

      // Chat sync
      if (Array.isArray(data.chatMessages)) {
        syncFirestoreChat(data.chatMessages);
      }
    });
  } catch (err) {
    console.error("Failed to join meeting:", err);
    showLobbyError("Failed to join meeting: " + (err.message || "Unknown error"));
    elements.btnJoinMeeting.disabled = false;
    elements.btnJoinMeeting.textContent = "Join Meeting";
  }
}

// ============================================================
// MEETING UI WORKFLOW
// ============================================================

function enterMeetingUI() {
  elements.lobbyScreen.classList.add("hidden");
  elements.endedScreen.classList.add("hidden");
  elements.meetingScreen.classList.remove("hidden");

  // Update room code labels
  elements.headerRoomCode.textContent = state.roomId;
  elements.bottomRoomCode.textContent = state.roomId;
  elements.waitingCodeDisplay.textContent = state.roomId;
  elements.waitingPasscodeDisplay.textContent = state.passcode;
  elements.drawerRoomCode.textContent = state.roomId;
  elements.drawerPasscodeDisplay.textContent = state.passcode;

  // Local user tile name
  elements.localNameLabel.textContent = `${state.userName} (You)`;
  elements.localAvatarLetter.textContent = state.userName.charAt(0).toUpperCase();

  // Show/Hide waiting card based on role
  if (state.role === "host") {
    elements.waitingOverlay.classList.remove("hidden");
    elements.remoteTile.classList.add("hidden");
  } else {
    elements.waitingOverlay.classList.add("hidden");
    elements.remoteTile.classList.remove("hidden");
  }

  // Start duration timer
  state.callStartTime = Date.now();
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.callStartTime) / 1000);
    elements.callDurationTimer.textContent = formatDuration(elapsed);
  }, 1000);
}

// ============================================================
// FEED PINNING FEATURE (NEW)
// ============================================================

function setPinnedTile(target) {
  // If clicking on already pinned tile, toggle off to equal view
  if (state.pinnedTile === target) {
    state.pinnedTile = null;
  } else {
    state.pinnedTile = target;
  }

  applyPinLayout();
}

function applyPinLayout() {
  const { pinnedTile } = state;
  const grid = elements.participantsGrid;
  const remote = elements.remoteTile;
  const local = elements.localTile;

  if (!pinnedTile) {
    grid.classList.remove("has-pinned");
    remote.classList.remove("is-pinned", "is-thumbnail");
    local.classList.remove("is-pinned", "is-thumbnail");

    elements.pinRemoteBtn.classList.remove("active");
    elements.pinRemoteBtn.title = "Pin peer feed to main screen";
    elements.pinLocalBtn.classList.remove("active");
    elements.pinLocalBtn.title = "Pin your own feed to main screen";

    elements.pinStatusBanner.classList.add("hidden");
    return;
  }

  grid.classList.add("has-pinned");
  elements.pinStatusBanner.classList.remove("hidden");

  if (pinnedTile === "remote") {
    remote.classList.add("is-pinned");
    remote.classList.remove("is-thumbnail");
    local.classList.add("is-thumbnail");
    local.classList.remove("is-pinned");

    elements.pinRemoteBtn.classList.add("active");
    elements.pinRemoteBtn.title = "Unpin peer feed";
    elements.pinLocalBtn.classList.remove("active");
    elements.pinLocalBtn.title = "Pin your own feed";

    elements.pinStatusText.textContent = `${state.peerName || "Peer"} Pinned`;
  } else if (pinnedTile === "local") {
    local.classList.add("is-pinned");
    local.classList.remove("is-thumbnail");
    remote.classList.add("is-thumbnail");
    remote.classList.remove("is-pinned");

    elements.pinLocalBtn.classList.add("active");
    elements.pinLocalBtn.title = "Unpin your feed";
    elements.pinRemoteBtn.classList.remove("active");
    elements.pinRemoteBtn.title = "Pin peer feed";

    elements.pinStatusText.textContent = "Your Feed Pinned";
  }
}

// ============================================================
// SCREEN SHARING (PRESENT NOW)
// ============================================================

async function toggleScreenShare() {
  if (state.isScreenSharing) {
    stopScreenShare();
  } else {
    await startScreenShare();
  }
}

async function startScreenShare() {
  try {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" },
      audio: false
    });

    state.screenStream = displayStream;
    const screenTrack = displayStream.getVideoTracks()[0];

    // Replace video track in WebRTC sender
    if (state.peerConnection) {
      const senders = state.peerConnection.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === "video");
      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
      }
    }

    // Local presentation preview
    elements.localVideo.srcObject = displayStream;
    elements.localTile.classList.add("screensharing");

    state.isScreenSharing = true;
    elements.ctrlScreen.classList.add("active-screen");
    elements.ctrlScreen.title = "Stop presenting screen";
    const screenIcon = elements.ctrlScreen.querySelector(".material-symbols-outlined");
    if (screenIcon) screenIcon.textContent = "cancel_presentation";

    // Revert when user clicks browser native "Stop sharing"
    screenTrack.onended = () => {
      stopScreenShare();
    };

    // Auto-pin local presentation if nothing else is pinned
    if (!state.pinnedTile) {
      setPinnedTile("local");
    }

    // Notify peer
    sendDataMessage({
      type: "peer-screen",
      presenting: true,
      ownerName: state.userName
    });
    updateRoomDocumentStatus({ [`${state.role}Presenting`]: true });
    showToast("You are presenting your screen");
  } catch (err) {
    console.warn("Screen share cancelled or failed:", err);
    showToast("Screen sharing was cancelled");
  }
}

async function stopScreenShare() {
  if (!state.isScreenSharing) return;

  if (state.screenStream) {
    state.screenStream.getTracks().forEach(t => t.stop());
    state.screenStream = null;
  }

  // Restore camera track to WebRTC sender
  if (state.peerConnection && state.localStream) {
    const cameraTrack = state.localStream.getVideoTracks()[0];
    const senders = state.peerConnection.getSenders();
    const videoSender = senders.find(s => s.track && s.track.kind === "video");
    if (videoSender && cameraTrack) {
      await videoSender.replaceTrack(cameraTrack);
    }
  }

  // Restore local video display
  elements.localVideo.srcObject = state.localStream;
  elements.localTile.classList.remove("screensharing");

  state.isScreenSharing = false;
  elements.ctrlScreen.classList.remove("active-screen");
  elements.ctrlScreen.title = "Present screen (Screenshare)";
  const screenIcon = elements.ctrlScreen.querySelector(".material-symbols-outlined");
  if (screenIcon) screenIcon.textContent = "present_to_all";

  // Unpin if local was auto-pinned
  if (state.pinnedTile === "local") {
    setPinnedTile(null);
  }

  // Notify peer
  sendDataMessage({
    type: "peer-screen",
    presenting: false,
    ownerName: state.userName
  });
  updateRoomDocumentStatus({ [`${state.role}Presenting`]: false });
  showToast("Stopped presenting");
}

// ============================================================
// IN-CALL CHAT SYSTEM
// ============================================================

function toggleDrawer(drawerType) {
  if (state.activeDrawer === drawerType) {
    closeDrawer();
    return;
  }

  state.activeDrawer = drawerType;
  elements.sideDrawer.classList.remove("hidden");

  if (drawerType === "info") {
    elements.drawerTitle.textContent = "Meeting details";
    elements.drawerPanelInfo.classList.remove("hidden");
    elements.drawerPanelChat.classList.add("hidden");
    elements.ctrlInfo.classList.add("active-panel");
    elements.ctrlChat.classList.remove("active-panel");
  } else if (drawerType === "chat") {
    elements.drawerTitle.textContent = "In-call messages";
    elements.drawerPanelInfo.classList.add("hidden");
    elements.drawerPanelChat.classList.remove("hidden");
    elements.ctrlChat.classList.add("active-panel");
    elements.ctrlInfo.classList.remove("active-panel");

    // Clear unread badge
    state.unreadChatCount = 0;
    elements.chatUnreadBadge.classList.add("hidden");
    elements.chatInputField.focus();
  }
}

function closeDrawer() {
  state.activeDrawer = null;
  elements.sideDrawer.classList.add("hidden");
  elements.ctrlInfo.classList.remove("active-panel");
  elements.ctrlChat.classList.remove("active-panel");
}

async function handleSendMessage(e) {
  e.preventDefault();
  const text = (elements.chatInputField.value || "").trim();
  if (!text) return;

  const timestamp = Date.now();
  elements.chatInputField.value = "";

  // Append locally
  appendChatMessage(state.userName, text, timestamp, true);

  // Send via P2P DataChannel
  sendDataMessage({
    type: "chat",
    sender: state.userName,
    text,
    timestamp
  });

  // Backup to Firestore
  if (state.roomId) {
    try {
      const roomRef = doc(db, "validations", `vibe_room_${state.roomId}`);
      await updateDoc(roomRef, {
        chatMessages: arrayUnion({
          sender: state.userName,
          text,
          timestamp
        })
      });
    } catch (err) {
      console.debug("Firestore chat backup skipped:", err);
    }
  }
}

function appendChatMessage(sender, text, timestamp, isSelf) {
  elements.chatEmptyHint.classList.add("hidden");

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isSelf ? "self" : "peer"}`;

  const timeFormatted = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  bubble.innerHTML = `
    <div class="chat-bubble-meta">
      <strong>${isSelf ? "You" : escapeHtml(sender)}</strong>
      <span>${timeFormatted}</span>
    </div>
    <div class="chat-bubble-content">${escapeHtml(text)}</div>
  `;

  elements.chatMessagesContainer.appendChild(bubble);
  elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;
}

const renderedChatTimestamps = new Set();
function syncFirestoreChat(messagesList) {
  if (!Array.isArray(messagesList)) return;
  messagesList.forEach(msg => {
    const key = `${msg.sender}_${msg.timestamp}_${msg.text}`;
    if (!renderedChatTimestamps.has(key)) {
      renderedChatTimestamps.add(key);
      const isSelf = msg.sender === state.userName;
      if (!isSelf) {
        appendChatMessage(msg.sender, msg.text, msg.timestamp, false);
      }
    }
  });
}

function escapeHtml(string) {
  const div = document.createElement("div");
  div.textContent = string;
  return div.innerHTML;
}

// ============================================================
// MEETING SHARING & INVITE
// ============================================================

function copyJoiningDetails() {
  const currentOrigin = window.location.origin;
  const inviteUrl = `${currentOrigin}/vibe/?room=${state.roomId}`;
  const inviteText = `Join my Vibe meeting:\nLink: ${inviteUrl}\nMeeting code: ${state.roomId}\nPasscode: ${state.passcode}`;

  navigator.clipboard.writeText(inviteText).then(() => {
    showToast("Joining details copied to clipboard!");
  }).catch(() => {
    showToast("Could not copy automatically. Check permissions.");
  });
}

// ============================================================
// LEAVE CALL & CLEANUP
// ============================================================

function leaveCall() {
  clearInterval(state.timerInterval);

  if (state.screenStream) {
    state.screenStream.getTracks().forEach(t => t.stop());
    state.screenStream = null;
  }

  if (state.localStream) {
    state.localStream.getTracks().forEach(t => t.stop());
    state.localStream = null;
  }

  if (state.peerConnection) {
    state.peerConnection.close();
    state.peerConnection = null;
  }

  if (state.roomUnsubscribe) {
    state.roomUnsubscribe();
    state.roomUnsubscribe = null;
  }

  if (state.audioContext) {
    state.audioContext.close();
    state.audioContext = null;
  }

  const durationText = elements.callDurationTimer.textContent;
  elements.endedDurationText.textContent = `Call duration: ${durationText}`;

  setPinnedTile(null);

  elements.meetingScreen.classList.add("hidden");
  elements.sideDrawer.classList.add("hidden");
  elements.audioPrompt.classList.add("hidden");
  elements.endedScreen.classList.remove("hidden");
}

function returnToLobby() {
  elements.endedScreen.classList.add("hidden");
  elements.meetingScreen.classList.add("hidden");
  elements.lobbyScreen.classList.remove("hidden");

  elements.btnStartMeeting.disabled = false;
  elements.btnStartMeeting.textContent = "Start Meeting";
  elements.btnJoinMeeting.disabled = false;
  elements.btnJoinMeeting.textContent = "Join Meeting";

  initializeLocalMedia();
}

// ============================================================
// EVENT LISTENERS & SETUP
// ============================================================

function setupEventListeners() {
  // Tab Switching
  elements.tabBtnCreate.addEventListener("click", () => {
    elements.tabBtnCreate.classList.add("active");
    elements.tabBtnCreate.setAttribute("aria-selected", "true");
    elements.tabBtnJoin.classList.remove("active");
    elements.tabBtnJoin.setAttribute("aria-selected", "false");
    elements.panelCreate.classList.remove("hidden");
    elements.panelJoin.classList.add("hidden");
    showLobbyError(null);
  });

  elements.tabBtnJoin.addEventListener("click", () => {
    elements.tabBtnJoin.classList.add("active");
    elements.tabBtnJoin.setAttribute("aria-selected", "true");
    elements.tabBtnCreate.classList.remove("active");
    elements.tabBtnCreate.setAttribute("aria-selected", "false");
    elements.panelJoin.classList.remove("hidden");
    elements.panelCreate.classList.add("hidden");
    showLobbyError(null);
  });

  // Password Visibility Toggles
  elements.toggleCreatePasscode.addEventListener("click", () => {
    const isPass = elements.createPasscodeInput.type === "password";
    elements.createPasscodeInput.type = isPass ? "text" : "password";
    const icon = elements.toggleCreatePasscode.querySelector(".material-symbols-outlined");
    if (icon) icon.textContent = isPass ? "visibility_off" : "visibility";
  });

  elements.toggleJoinPasscode.addEventListener("click", () => {
    const isPass = elements.joinPasscodeInput.type === "password";
    elements.joinPasscodeInput.type = isPass ? "text" : "password";
    const icon = elements.toggleJoinPasscode.querySelector(".material-symbols-outlined");
    if (icon) icon.textContent = isPass ? "visibility_off" : "visibility";
  });

  // Generate Room Code
  elements.btnGenerateCode.addEventListener("click", () => {
    elements.customRoomId.value = generateRoomCode();
  });

  // Lobby Media Controls
  elements.lobbyToggleMic.addEventListener("click", () => {
    applyAudioState(!state.micEnabled);
  });

  elements.lobbyToggleCam.addEventListener("click", () => {
    applyVideoState(!state.camEnabled);
  });

  // Start / Join Actions
  elements.btnStartMeeting.addEventListener("click", startMeetingAsHost);
  elements.btnJoinMeeting.addEventListener("click", joinMeetingAsGuest);

  // In-Call Controls
  elements.ctrlMic.addEventListener("click", () => {
    applyAudioState(!state.micEnabled);
  });

  elements.ctrlCam.addEventListener("click", () => {
    applyVideoState(!state.camEnabled);
  });

  elements.ctrlScreen.addEventListener("click", toggleScreenShare);
  elements.ctrlLeave.addEventListener("click", leaveCall);

  // Pinning actions (Users can pin own feed or peer feed)
  elements.pinRemoteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setPinnedTile("remote");
  });

  elements.pinLocalBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setPinnedTile("local");
  });

  // Clicking thumbnail when in pinned view swaps the pin to that feed
  elements.remoteTile.addEventListener("click", () => {
    if (state.pinnedTile === "local") {
      setPinnedTile("remote");
    }
  });

  elements.localTile.addEventListener("click", () => {
    if (state.pinnedTile === "remote") {
      setPinnedTile("local");
    }
  });

  // Header unpin button
  elements.btnUnpinAll.addEventListener("click", () => {
    setPinnedTile(null);
  });

  // Enable audio prompt button
  elements.btnEnableAudio.addEventListener("click", () => {
    if (elements.remoteVideo) {
      elements.remoteVideo.play();
    }
    elements.audioPrompt.classList.add("hidden");
  });

  // Drawers
  elements.ctrlInfo.addEventListener("click", () => toggleDrawer("info"));
  elements.ctrlChat.addEventListener("click", () => toggleDrawer("chat"));
  elements.btnCloseDrawer.addEventListener("click", closeDrawer);

  // Chat Form
  elements.chatForm.addEventListener("submit", handleSendMessage);

  // Copy Invites
  elements.btnCopyWaitingInvite.addEventListener("click", copyJoiningDetails);
  elements.btnCopyDrawerLink.addEventListener("click", copyJoiningDetails);

  // Rejoin / Return
  elements.btnRejoin.addEventListener("click", () => {
    if (state.roomId) {
      elements.joinRoomId.value = state.roomId;
      elements.joinPasscodeInput.value = state.passcode;
    }
    returnToLobby();
  });

  elements.btnReturnLobby.addEventListener("click", () => {
    window.location.href = "/";
  });

  // Global Keyboard Shortcuts (Escape closes drawer or unpins)
  window.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (state.activeDrawer) {
        closeDrawer();
      } else if (state.pinnedTile) {
        setPinnedTile(null);
      }
    }
  });

  // Auto-fill from URL parameters (e.g. ?room=xyz)
  const urlParams = new URLSearchParams(window.location.search);
  const paramRoom = urlParams.get("room");
  if (paramRoom) {
    elements.joinRoomId.value = paramRoom;
    elements.tabBtnJoin.click();
    showToast(`Room code ${paramRoom} pre-filled. Enter passcode to join.`);
  } else {
    elements.customRoomId.value = generateRoomCode();
  }
}

// Initial bootstrap
window.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  initializeLocalMedia();
});
