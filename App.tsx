/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useRef, useState, type FC} from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Dimensions,
  Pressable,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

import {
  ScreenCapturePickerView,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals,
} from 'react-native-webrtc';

const EXTENSION: number = 212;

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const [refresh, setRefresh] = useState<number>(Math.random());

  const addedLocalTracks = useRef<boolean>(false);
  const localMediaStream = useRef<MediaStream>();
  const peerConnection = useRef<RTCPeerConnection>();
  const remoteCandidates = useRef<RTCIceCandidate[]>([]);
  const offerDescription = useRef<RTCSessionDescription>();

  const sessionTransaction = useRef<string>('');
  const sessionId = useRef<string>('');
  const pluginAttachTransaction = useRef<string>('');
  const pluginHandleId = useRef<string>('');
  const ws = useRef<WebSocket>();
  const registeredUsername = useRef<string>('');
  const keepAliveInterval = useRef<ReturnType<typeof setInterval>>();

  function addStreamTracksToPeerConnection() {
    // Add media stream track to peer connection
    if (localMediaStream.current) {
      localMediaStream.current.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, localMediaStream.current!);
      });
      addedLocalTracks.current = true;
    }
    return;
  }

  async function createOffer() {
    let sessionConstraints = {
      mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: false,
        VoiceActivityDetection: false,
      },
    };

    try {
      if (peerConnection.current) {
        const description = await peerConnection.current.createOffer(
          sessionConstraints,
        );

        await peerConnection.current.setLocalDescription(description);

        // Save offer description
        offerDescription.current = description;

        return description;
      }
    } catch (err) {
      // Handle Errors
    }
  }

  async function callStart() {
    const description = await createOffer();
    await peerConnection.current?.setLocalDescription(description);

    // Send the offerDescription to the other participant
    ws.current?.send(
      JSON.stringify({
        janus: 'message',
        session_id: sessionId.current,
        handle_id: pluginHandleId.current,
        transaction: generateTransactionId(12),
        body: {
          request: 'call',
          uri: `sip:${EXTENSION}@127.0.0.1`,
        },
        jsep: description,
      }),
    );
  }

  function processCandidates() {
    if (remoteCandidates.current && peerConnection.current) {
      if (remoteCandidates.current.length < 1) {
        return;
      }

      remoteCandidates.current.map(candidate =>
        peerConnection.current?.addIceCandidate(candidate),
      );
      remoteCandidates.current = [];
    }
  }

  function handleRemoteCandidate(iceCandidate: any) {
    try {
      if (remoteCandidates.current && peerConnection.current) {
        iceCandidate = new RTCIceCandidate(iceCandidate);

        if (peerConnection.current.remoteDescription == null) {
          return remoteCandidates.current.push(iceCandidate);
        }

        return peerConnection.current.addIceCandidate(iceCandidate);
      }
    } catch (error) {
      console.warn(error);
    }
  }

  async function createPeerConnection() {
    let peerConstraints = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    };

    let newPeerConnection = new RTCPeerConnection(peerConstraints);

    // Add listeners to the
    newPeerConnection.addEventListener('connectionstatechange', event => {});
    newPeerConnection.addEventListener('icecandidate', (event: any) => {
      if (event?.candidate) {
        handleRemoteCandidate(event.candidate);
      }
    });
    newPeerConnection.addEventListener('icecandidateerror', event => {});
    newPeerConnection.addEventListener('iceconnectionstatechange', event => {});
    newPeerConnection.addEventListener('icegatheringstatechange', event => {});
    newPeerConnection.addEventListener('negotiationneeded', event => {});
    newPeerConnection.addEventListener('signalingstatechange', event => {});
    newPeerConnection.addEventListener('track', event => {});

    return newPeerConnection;
  }

  async function getDevices() {
    try {
      const devices: any = await mediaDevices.enumerateDevices();
      let cameraCount = 0;

      devices.map((device: any) => {
        if (device.kind !== 'videoinput') {
          return;
        }

        cameraCount = cameraCount + 1;
      });
    } catch (err) {
      // Handle Error
    }
  }

  async function getUserMedia() {
    let mediaConstraints = {
      audio: true,
      video: false,
    };

    try {
      const mediaStream = await mediaDevices.getUserMedia(mediaConstraints);

      return mediaStream;
    } catch (err) {
      // Handle Error
    }
  }

  function generateTransactionId(length: number) {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }

    return result;
  }

  function register() {
    try {
      if (ws?.current && sessionId.current && pluginHandleId.current) {
        ws.current.send(
          JSON.stringify({
            janus: 'message',
            session_id: sessionId.current,
            handle_id: pluginHandleId.current,
            transaction: generateTransactionId(12),
            body: {
              request: 'register',
              username: 'sip:211@127.0.0.1',
              display_name: 'foo 1',
              secret: '0081a9189671e8c3d1ad8b025f92403da',
              proxy: 'sip:127.0.0.1:5060',
              outbound_proxy: 'sip:127.0.0.1:5060',
              sips: false,
              refresh: false,
            },
          }),
        );
      }
    } catch (error) {
      console.log(error);
    }
  }

  function attachSipPlugin() {
    if (ws.current && sessionId.current) {
      // Attach the sip plugin
      pluginAttachTransaction.current = generateTransactionId(12);

      ws.current.send(
        JSON.stringify({
          janus: 'attach',
          session_id: sessionId.current, // NEW!
          plugin: 'janus.plugin.sip',
          transaction: pluginAttachTransaction.current,
        }),
      );
    }
  }

  function startKeepAliveInterval() {
    keepAliveInterval.current = setInterval(() => {
      ws.current?.send(
        JSON.stringify({
          janus: 'keepalive',
          session_id: sessionId.current,
          transaction: generateTransactionId(12),
        }),
      );
    }, 1000 * 50);
  }

  useEffect(() => {
    // The WebRTC useEffect

    async function initWebRTC() {
      // Check the devices
      getDevices();

      // Get the user media
      localMediaStream.current = await getUserMedia();

      // Create the peer connection
      peerConnection.current = await createPeerConnection();

      // Add tracks to peer connection
      addStreamTracksToPeerConnection();
    }

    initWebRTC();
  }, []);

  const [incomingCall, setIncomingCall] = useState<boolean>(false);

  useEffect(() => {
    // Manage WebSocket
    try {
      ws.current = new WebSocket('ws://172.25.5.78:8188', 'janus-protocol');

      ws.current.onopen = () => {
        // Connection opened
        sessionTransaction.current = generateTransactionId(12);

        // Create a new session
        ws.current?.send(
          JSON.stringify({
            janus: 'create',
            transaction: sessionTransaction.current,
          }),
        );
      };

      ws.current.onmessage = e => {
        // A message was received
        const data = JSON.parse(e.data);
        const pluginData = data?.plugindata?.data?.result;
        const jsep = data?.jsep;

        // Handle messages for setup (janus sessionid and pluginHandlerId)
        if (data.janus === 'success') {
          // Handle session id message
          if (data.transaction === sessionTransaction.current) {
            // Save the session id
            sessionId.current = data.data.id;
            // Attach the janus sip plugin to the session
            attachSipPlugin();
          }
          // Handle plugin handle id message
          if (data.transaction === pluginAttachTransaction.current) {
            // Save the handle id
            pluginHandleId.current = data.data.id;
            // Register to the sip plugin using the sip extension
            register();
          }
        }

        // Handle webrtc related messages
        const event: string | null = pluginData?.event;

        if (event) {
          switch (event) {
            case 'registered':
              registeredUsername.current = pluginData.username;
              startKeepAliveInterval();

              setRefresh(Math.random());

              break;

            case 'incomingcall':
              if (jsep) {
                // Set the remote offer as the remote description
                peerConnection.current?.setRemoteDescription(jsep);

                setIncomingCall(true);
              }

              break;

            case 'accepted':
              if (jsep) {
                // Set the remote answer as the remote description
                peerConnection.current?.setRemoteDescription(jsep);

                processCandidates();
              }

              break;

            case 'hangup':
              setIncomingCall(false);

              break;

            default:
              break;
          }
        }
      };

      ws.current.onerror = e => {
        // an error occurred
        console.log(e.message);
      };

      ws.current.onclose = e => {
        // connection closed
        console.log(e.code, e.reason);
      };
    } catch (error) {
      console.warn(error);
    }

    return () => {
      clearInterval(keepAliveInterval.current);
    };
  }, []);

  async function answer() {
    if (peerConnection.current) {
      // Create the webrtc answer
      const answerDescription = await peerConnection.current.createAnswer();
      // Set the answer description as the local description
      await peerConnection.current.setLocalDescription(answerDescription);

      // Process ice candidates
      processCandidates();

      // Send the offerDescription to the other participant.
      ws.current?.send(
        JSON.stringify({
          janus: 'message',
          session_id: sessionId.current,
          handle_id: pluginHandleId.current,
          transaction: generateTransactionId(12),
          body: {
            request: 'accept',
          },
          jsep: answerDescription,
        }),
      );
    }
  }

  function hangup() {}

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <View style={styles.col}>
            {localMediaStream.current && (
              <Text>Local media stream: created</Text>
            )}
            {peerConnection.current && <Text>Peer connection: created</Text>}
            {addedLocalTracks.current && <Text>Local tracks: added</Text>}
            {offerDescription.current && <Text>Session offer: created</Text>}
            {sessionId.current && (
              <Text>Janus session ID is: {sessionId.current}</Text>
            )}
            {pluginHandleId.current && (
              <Text>Janus plugin handle ID is: {pluginHandleId.current}</Text>
            )}
            {registeredUsername.current && (
              <Text>Registered username is: {registeredUsername.current}</Text>
            )}
            <Button onPress={() => callStart()} title={`call: ${EXTENSION}`} />
          </View>
          <LearnMoreLinks />
        </View>
      </ScrollView>
      {incomingCall && (
        <MobilePhoneIsland answerCallback={answer} hangupCallback={hangup} />
      )}
    </SafeAreaView>
  );
}

const MobilePhoneIsland: FC<MobilePhoneIslandProps> = ({
  answerCallback,
  hangupCallback,
}) => {
  return (
    <View style={styles.mpi}>
      <Pressable onPress={answerCallback}>
        <Text style={styles.mpiAnswer}>Answer</Text>
      </Pressable>
      <Pressable onPress={hangupCallback}>
        <Text style={styles.mpiHangup}>Hangup</Text>
      </Pressable>
    </View>
  );
};

interface MobilePhoneIslandProps {
  answerCallback: () => void;
  hangupCallback: () => void;
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    padding: 25,
    rowGap: 15,
  },
  mpi: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 25,
    padding: 40,
    position: 'absolute',
    bottom: 0,
    width: Dimensions.get('window').width,
    backgroundColor: 'black',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  mpiAnswer: {
    color: 'white',
    backgroundColor: 'green',
    borderRadius: 99,
    padding: 20,
    fontWeight: '600',
    fontSize: 16,
  },
  mpiHangup: {
    color: 'white',
    backgroundColor: 'red',
    borderRadius: 99,
    padding: 20,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default App;
