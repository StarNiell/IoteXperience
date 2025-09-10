import { StreamModel } from "./models/streamModel";
import StreamViewUI from "./UI/streamview";

const Stream: React.FC<{ stream: StreamModel }> = ({ stream }) => {
    let content = <StreamViewUI stream_id={stream.stream_id} />;
    return (
        <>
            {content}
        </>
    );
};

export default Stream;