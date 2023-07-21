/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useRef, useState} from 'react';
import type {PropsWithChildren} from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
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

type SectionProps = PropsWithChildren<{
  title: string;
}>;

function Section({children, title}: SectionProps): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

const EXTENSION: number = 212;

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const [localMediaStream, setLocalMediaStream] = useState<MediaStream>();
  const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream>();
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection>();
  const [peerTrackAdded, setPeerTrackAdded] = useState<boolean>(false);
  const [addedLocalTracks, setAddedLocalTracks] = useState<boolean>(false);
  const remoteCandidates = useRef<RTCIceCandidate[]>();

  const [offerDescription, setOfferDescription] =
    useState<RTCSessionDescription>();

  function addStreamTracksToPeerConnection() {
    // Add media stream track to peer connection
    if (localMediaStream) {
      localMediaStream.getTracks().forEach(track => {
        peerConnection?.addTrack(track, localMediaStream);
      });
      setAddedLocalTracks(true);
    }
    return;
  }

  useEffect(() => {
    if (localMediaStream && peerConnection) {
      addStreamTracksToPeerConnection();
    }
  }, [localMediaStream, peerConnection]);

  /**
   * Create an offer and be ready to send it
   */
  async function createOffer() {
    let sessionConstraints = {
      mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: false,
        VoiceActivityDetection: false,
      },
    };

    try {
      if (peerConnection) {
        const description = await peerConnection.createOffer(
          sessionConstraints,
        );

        await peerConnection.setLocalDescription(description);
        return description;
      }

      // Send the offerDescription to the other participant.
    } catch (err) {
      // Handle Errors
    }
  }

  async function callStart() {
    const description = await createOffer();
    await peerConnection?.setLocalDescription(description);

    console.log(description);

    // Send the offerDescription to the other participant.
    ws.current?.send(
      JSON.stringify({
        janus: 'message',
        session_id: sessionId,
        handle_id: pluginHandleId,
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
    if (remoteCandidates.current && peerConnection) {
      if (remoteCandidates.current.length < 1) {
        return;
      }

      remoteCandidates.current.map(candidate =>
        peerConnection.addIceCandidate(candidate),
      );
      remoteCandidates.current = [];
    }
  }

  function handleRemoteCandidate(iceCandidate: any) {
    try {
      if (remoteCandidates.current && peerConnection) {
        iceCandidate = new RTCIceCandidate(iceCandidate);

        if (peerConnection.remoteDescription == null) {
          return remoteCandidates.current.push(iceCandidate);
        }

        return peerConnection.addIceCandidate(iceCandidate);
      }
    } catch (error) {
      console.warn(error);
    }
  }

  useEffect(() => {
    // The WebRTC useEffect

    /**
     * Check the devices of the user
     */
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

    /**
     * Prepare the peer connection
     */
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
      newPeerConnection.addEventListener(
        'iceconnectionstatechange',
        event => {},
      );
      newPeerConnection.addEventListener(
        'icegatheringstatechange',
        event => {},
      );
      newPeerConnection.addEventListener('negotiationneeded', event => {});
      newPeerConnection.addEventListener('signalingstatechange', event => {});
      newPeerConnection.addEventListener('track', event => {
        setPeerTrackAdded(true);
      });

      return newPeerConnection;
    }

    /**
     * Get the media of the user
     */
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

    async function initWebRTC() {
      // Check the devices
      getDevices();
      // Get the user media
      const newLocalMediaStream = await getUserMedia();

      setLocalMediaStream(newLocalMediaStream);

      // Create the peer connection
      const newPeerConnection = await createPeerConnection();
      setPeerConnection(newPeerConnection);
    }

    initWebRTC();
  }, []);

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

  const sessionTransaction = useRef<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const pluginAttachTransaction = useRef<string>('');
  const [pluginHandleId, setPluginHandleId] = useState<string>('');
  const ws = useRef<WebSocket>();
  const [registeredUsername, setRegisteredUsername] = useState<string>('');

  const webrtcIncomingOfferDescription = useRef<RTCSessionDescription>();

  function register() {
    try {
      if (ws?.current && sessionId && pluginHandleId) {
        ws.current.send(
          JSON.stringify({
            janus: 'message',
            session_id: sessionId,
            handle_id: pluginHandleId,
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
    if (ws.current && sessionId) {
      // Attach the sip plugin
      pluginAttachTransaction.current = generateTransactionId(12);

      ws.current.send(
        JSON.stringify({
          janus: 'attach',
          session_id: sessionId, // NEW!
          plugin: 'janus.plugin.sip',
          transaction: pluginAttachTransaction.current,
        }),
      );
    }
  }

  useEffect(() => {
    if (sessionId) {
      // Attach the sip plugin to the janus session
      attachSipPlugin();
    }
  }, [sessionId]);

  useEffect(() => {
    if (pluginHandleId) {
      // Attach the sip plugin to the janus session
      register();
    }
  }, [pluginHandleId]);

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

        // Handle messages for setup (janus sessionid and pluginhandlerid)
        if (data.janus === 'success') {
          // Handle session id message
          if (data.transaction === sessionTransaction.current) {
            // Save the session id
            setSessionId(data.data.id);
          }
          // Handle plugin handle id message
          if (data.transaction === pluginAttachTransaction.current) {
            // Save the handle id
            setPluginHandleId(data.data.id);
          }
        }

        // Handle webrtc related messages
        const event: string | null = pluginData?.event;

        if (event) {
          switch (event) {
            case 'registered':
              setRegisteredUsername(pluginData.username);
              break;

            case 'incomingcall':
              console.log('Incoming call');

              // TODO create answer
              if (jsep) {
                webrtcIncomingOfferDescription.current = jsep;
              }

              break;

            case 'accepted':
              console.log('Incoming call');

              // TODO set remote description

              if (jsep) {
                webrtcIncomingAnswerDescription.current = jsep;
              }

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
  }, []);

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
          <Section title="Call An Extension">
            <View style={styles.col}>
              {localMediaStream && <Text>Local media stream: created</Text>}
              {peerConnection && <Text>Peer connection: created</Text>}
              {peerTrackAdded && <Text>Peer track: added</Text>}
              {addedLocalTracks && <Text>Added local tracks</Text>}
              {offerDescription && <Text>Session offer: created</Text>}
              {sessionId && <Text>Janus session ID is: {sessionId}</Text>}
              {pluginHandleId && (
                <Text>Janus plugin handle ID is: {pluginHandleId}</Text>
              )}
              {registeredUsername && (
                <Text>Registered username is: {registeredUsername}</Text>
              )}
              <Button
                onPress={() => callStart()}
                title={`call: ${EXTENSION}`}
              />
            </View>
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  },
});

export default App;
