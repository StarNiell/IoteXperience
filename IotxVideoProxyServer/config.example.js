// Copy this file to config.js and adapt it.
// config.js is ignored by git: camera URLs may contain credentials.
//
// fixedStreams: cameras that are not in the database (Stream List of IotxApp).
// They are always available, in addition to the streams read from IotxApiServer.
class Config {
    static fixedStreams = {
        'Camera-1': 'http://192.168.1.123/stream',
        'Camera-2': 'rtsp://user:password@192.168.1.124:554/h264_stream',
    };
}
module.exports = Config;
