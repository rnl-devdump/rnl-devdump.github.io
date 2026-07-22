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
  constructor(onRemoteStream, onRoomStateUpdate, onLog) {
    this.onLog = onLog || (() => {});
    this.log('Creating RTCPeerConnection...');
    this.peerConnection = new RTCPeerConnection(configuration);
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.role = null;
    this.onRemoteStream = onRemoteStream;
    this.onRoomStateUpdate = onRoomStateUpdate;
    this.unsubscribes = [];

    this.peerConnection.addEventListener('connectionstatechange', () => {
      this.log(`Connection state: ${this.peerConnection.connectionState}`);
    });

    this.peerConnection.addEventListener('iceconnectionstatechange', () => {
      this.log(`ICE connection: ${this.peerConnection.iceConnectionState}`);
    });

    this.peerConnection.addEventListener('icegatheringstatechange', () => {
      this.log(`ICE gathering: ${this.peerConnection.iceGatheringState}`);
    });

    this.peerConnection.addEventListener('signalingstatechange', () => {
      this.log(`Signaling: ${this.peerConnection.signalingState}`);
    });

    this.peerConnection.addEventListener('track', event => {
      this.log(`Got remote track: ${event.track.kind}`);
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream.addTrack(track);
      });
      if (this.onRemoteStream) this.onRemoteStream(this.remoteStream);
    });
  }

  log(msg) {
    const ts = new Date().toLocaleTimeString();
    const entry = `[${ts}] ${msg}`;
    console.log('[WebRTC]', entry);
    this.onLog(entry);
  }

  async init(localStream) {
    this.localStream = localStream;
    this.log(`Adding ${localStream.getTracks().length} local track(s)`);
    localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, localStream);
    });

    const roomRef = doc(db, 'rooms', ROOM_ID);
    this.log('Checking Firestore room...');
    
    try {
      const roomSnap = await getDoc(roomRef);
      this.log(`Room exists: ${roomSnap.exists()}, has offer: ${roomSnap.exists() && !!roomSnap.data()?.offer}, has answer: ${roomSnap.exists() && !!roomSnap.data()?.answer}`);

      if (roomSnap.exists() && roomSnap.data().offer && !roomSnap.data().answer) {
        this.log('Joining as callee...');
        await this.joinRoom(roomRef, roomSnap.data().offer);
      } else {
        this.log('Creating room as caller...');
        await this.createRoom(roomRef);
      }
    } catch (err) {
      this.log(`Firestore error during init: ${err.message}`);
      return;
    }

    // Listen for room state updates
    const unsub = onSnapshot(roomRef, snapshot => {
      const data = snapshot.data();
      if (data && this.onRoomStateUpdate) {
        this.onRoomStateUpdate(data);
      }
    });
    this.unsubscribes.push(unsub);
  }

  async createRoom(roomRef) {
    this.role = 'caller';
    
    const callerCandidates = collection(roomRef, 'callerCandidates');
    const calleeCandidates = collection(roomRef, 'calleeCandidates');
    
    // Clear ALL old data
    try {
      const ccSnap = await getDocs(callerCandidates);
      this.log(`Clearing ${ccSnap.size} old caller candidates`);
      await Promise.all(ccSnap.docs.map(d => deleteDoc(d.ref)));
      const ceSnap = await getDocs(calleeCandidates);
      this.log(`Clearing ${ceSnap.size} old callee candidates`);
      await Promise.all(ceSnap.docs.map(d => deleteDoc(d.ref)));
    } catch(e) {
      this.log(`Warning clearing candidates: ${e.message}`);
    }

    // Create offer FIRST
    this.log('Creating offer...');
    const offer = await this.peerConnection.createOffer();

    // Write room to Firestore BEFORE setting local description
    // This way the room is visible to the callee before ICE starts
    const roomData = {
      offer: { type: offer.type, sdp: offer.sdp },
      answer: null,
      callerReady: false,
      calleeReady: false,
      photosCount: 4,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    try {
      await setDoc(roomRef, roomData);
      this.log('Room doc written to Firestore');
    } catch (err) {
      this.log(`FAILED to write room: ${err.message}`);
      return;
    }

    // Now register ICE listener and set local description to start gathering
    let candidateCount = 0;
    this.peerConnection.addEventListener('icecandidate', async (event) => {
      if (event.candidate) {
        candidateCount++;
        try {
          await addDoc(callerCandidates, event.candidate.toJSON());
          this.log(`Wrote caller ICE #${candidateCount}`);
        } catch (err) {
          this.log(`FAILED to write caller ICE #${candidateCount}: ${err.message}`);
        }
      } else {
        this.log(`Caller ICE gathering done (${candidateCount} total)`);
      }
    });

    this.log('Setting local description (offer)...');
    await this.peerConnection.setLocalDescription(offer);

    // Listen for answer
    const unsubRoom = onSnapshot(roomRef, async snapshot => {
      const data = snapshot.data();
      if (!this.peerConnection.currentRemoteDescription && data?.answer) {
        this.log('Received answer from callee!');
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          this.log('Remote description set successfully');
        } catch (err) {
          this.log(`FAILED to set remote description: ${err.message}`);
          return;
        }

        // NOW listen for callee's ICE candidates
        const unsubCallee = onSnapshot(calleeCandidates, snapshot2 => {
          snapshot2.docChanges().forEach(async change => {
            if (change.type === 'added') {
              try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                this.log('Added callee ICE candidate');
              } catch (err) {
                this.log(`Error adding callee candidate: ${err.message}`);
              }
            }
          });
        });
        this.unsubscribes.push(unsubCallee);
      }
    });
    this.unsubscribes.push(unsubRoom);
  }

  async joinRoom(roomRef, offer) {
    this.role = 'callee';

    const callerCandidates = collection(roomRef, 'callerCandidates');
    const calleeCandidates = collection(roomRef, 'calleeCandidates');

    // Register ICE listener BEFORE setting descriptions
    let candidateCount = 0;
    this.peerConnection.addEventListener('icecandidate', async (event) => {
      if (event.candidate) {
        candidateCount++;
        try {
          await addDoc(calleeCandidates, event.candidate.toJSON());
          this.log(`Wrote callee ICE #${candidateCount}`);
        } catch (err) {
          this.log(`FAILED to write callee ICE #${candidateCount}: ${err.message}`);
        }
      } else {
        this.log(`Callee ICE gathering done (${candidateCount} total)`);
      }
    });

    // Set remote description (the offer)
    this.log('Setting remote description (offer)...');
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      this.log('Remote description set');
    } catch (err) {
      this.log(`FAILED to set remote description: ${err.message}`);
      return;
    }
    
    // Create and set answer
    this.log('Creating answer...');
    const answer = await this.peerConnection.createAnswer();
    this.log('Setting local description (answer)...');
    await this.peerConnection.setLocalDescription(answer);

    // Write answer to Firestore
    try {
      await updateDoc(roomRef, {
        answer: { type: answer.type, sdp: answer.sdp },
        updatedAt: serverTimestamp()
      });
      this.log('Answer written to Firestore');
    } catch (err) {
      this.log(`FAILED to write answer: ${err.message}`);
      return;
    }

    // Listen for caller's ICE candidates (remote desc already set, safe to add)
    const unsubCaller = onSnapshot(callerCandidates, snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            this.log('Added caller ICE candidate');
          } catch (err) {
            this.log(`Error adding caller candidate: ${err.message}`);
          }
        }
      });
    });
    this.unsubscribes.push(unsubCaller);
    this.log('Listening for caller ICE candidates...');
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
    const roomRef = doc(db, 'rooms', ROOM_ID);
    await updateDoc(roomRef, { photosCount: count });
  }

  async updateCapturedPhotos(photos) {
    const roomRef = doc(db, 'rooms', ROOM_ID);
    if (this.role === 'caller') {
      await updateDoc(roomRef, { callerPhotos: photos });
    } else {
      await updateDoc(roomRef, { calleePhotos: photos });
    }
  }

  async leaveRoom() {
    this.log('Leaving room...');
    this.peerConnection.close();
    this.unsubscribes.forEach(fn => fn());
    this.unsubscribes = [];
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
  }
}
