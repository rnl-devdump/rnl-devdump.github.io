import { db } from '../lib/firebase';
import { 
  doc, setDoc, getDoc, onSnapshot, collection, addDoc, getDocs, deleteDoc, updateDoc, serverTimestamp 
} from 'firebase/firestore';

const ROOM_ID = 'faerie-room';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

export class WebRTCManager {
  constructor(onRemoteStream, onRoomStateUpdate) {
    this.peerConnection = new RTCPeerConnection(configuration);
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.role = null; // 'caller' or 'callee'
    this.onRemoteStream = onRemoteStream;
    this.onRoomStateUpdate = onRoomStateUpdate;
    this.unsubscribeRoom = null;
    this.unsubscribeCaller = null;
    this.unsubscribeCallee = null;

    this.peerConnection.addEventListener('track', event => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream.addTrack(track);
      });
      if (this.onRemoteStream) this.onRemoteStream(this.remoteStream);
    });
  }

  async init(localStream) {
    this.localStream = localStream;
    localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, localStream);
    });

    const roomRef = doc(db, 'rooms', ROOM_ID);
    const roomSnap = await getDoc(roomRef);

    // If room exists and is waiting for answer, join it. Else create new room.
    if (roomSnap.exists() && roomSnap.data().offer && !roomSnap.data().answer) {
      await this.joinRoom(roomRef, roomSnap.data().offer);
    } else {
      await this.createRoom(roomRef);
    }

    this.listenToRoomState(roomRef);
  }

  async createRoom(roomRef) {
    this.role = 'caller';
    
    // Clear old candidates
    const callerCandidates = collection(roomRef, 'callerCandidates');
    const calleeCandidates = collection(roomRef, 'calleeCandidates');
    
    try {
      const ccSnap = await getDocs(callerCandidates);
      ccSnap.forEach(d => deleteDoc(d.ref));
      const ceSnap = await getDocs(calleeCandidates);
      ceSnap.forEach(d => deleteDoc(d.ref));
    } catch(e) {
      console.warn("Could not clear old candidates", e);
    }

    // Listen for local ICE candidates BEFORE setLocalDescription
    this.peerConnection.addEventListener('icecandidate', event => {
      if (event.candidate) {
        addDoc(callerCandidates, event.candidate.toJSON());
      }
    });
    
    // Create offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    const roomData = {
      offer: { type: offer.type, sdp: offer.sdp },
      callerReady: false,
      calleeReady: false,
      photosCount: 4,
      updatedAt: serverTimestamp()
    };
    await setDoc(roomRef, roomData);

    // Listen for remote answer
    this.unsubscribeRoom = onSnapshot(roomRef, async snapshot => {
      const data = snapshot.data();
      if (!this.peerConnection.currentRemoteDescription && data?.answer) {
        const rtcSessionDescription = new RTCSessionDescription(data.answer);
        await this.peerConnection.setRemoteDescription(rtcSessionDescription);
      }
    });

    // Listen for remote ICE candidates
    this.unsubscribeCallee = onSnapshot(calleeCandidates, snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          let data = change.doc.data();
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  }

  async joinRoom(roomRef, offer) {
    this.role = 'callee';

    const callerCandidates = collection(roomRef, 'callerCandidates');
    const calleeCandidates = collection(roomRef, 'calleeCandidates');

    // Listen for local ICE candidates BEFORE setLocalDescription
    this.peerConnection.addEventListener('icecandidate', event => {
      if (event.candidate) {
        addDoc(calleeCandidates, event.candidate.toJSON());
      }
    });

    // Set remote description
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    
    // Create answer
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // Update room with answer
    await updateDoc(roomRef, {
      answer: { type: answer.type, sdp: answer.sdp },
      updatedAt: serverTimestamp()
    });

    // Listen for remote ICE candidates
    this.unsubscribeCaller = onSnapshot(callerCandidates, snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          let data = change.doc.data();
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  }

  listenToRoomState(roomRef) {
    onSnapshot(roomRef, snapshot => {
      const data = snapshot.data();
      if (data && this.onRoomStateUpdate) {
        this.onRoomStateUpdate(data);
      }
    });
  }

  async setReadyState(isReady) {
    const roomRef = doc(db, 'rooms', ROOM_ID);
    if (this.role === 'caller') {
      await updateDoc(roomRef, { callerReady: isReady });
    } else {
      await updateDoc(roomRef, { calleeReady: isReady });
    }
  }

  async setPhotosCount(count) {
    // Only allow setting this to sync state
    const roomRef = doc(db, 'rooms', ROOM_ID);
    await updateDoc(roomRef, { photosCount: count });
  }

  async updateCapturedPhotos(photos) {
    // Optional: write captured photos to room state to sync across both clients
    const roomRef = doc(db, 'rooms', ROOM_ID);
    if (this.role === 'caller') {
      await updateDoc(roomRef, { callerPhotos: photos });
    } else {
      await updateDoc(roomRef, { calleePhotos: photos });
    }
  }

  async leaveRoom() {
    this.peerConnection.close();
    if (this.unsubscribeRoom) this.unsubscribeRoom();
    if (this.unsubscribeCaller) this.unsubscribeCaller();
    if (this.unsubscribeCallee) this.unsubscribeCallee();
    
    // If local stream exists, stop tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
  }
}
