import { StreamModel } from "./models/streamModel";
import StreamWidget from "../widgets/StreamWidget";

const Stream: React.FC<{ stream: StreamModel }> = ({ stream }) => (
    <StreamWidget streamId={stream.stream_id} title={stream.stream_description || stream.stream_id} />
);

export default Stream;
