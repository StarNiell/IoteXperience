class Config {
    static hashingSecret = 'Abx2791llein';
    static fixedStreams  = {'IotxCam-1': 'http://192.168.1.123/stream', 'Parcheggio': 'rtsp://192.168.1.106:554/h264_stream'};
}
module.exports = Config;