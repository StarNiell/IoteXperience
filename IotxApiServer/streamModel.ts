export class StreamModel {
    id: number = 0;
    stream_id: string = "";
    stream_url: string = "";
    stream_description: string = "";
    position: number = 0;
    dashboard_stream_id: number = 0;

    constructor(obj: {
        id: number, stream_id: string; stream_url: string, stream_description: string; position: number; dashboard_stream_id: number;
    }) {
        this.id = obj.id;
        this.stream_id = obj.stream_id;
        this.stream_url = obj.stream_url;
        this.stream_description = obj.stream_description;
        this.position = obj.position;
        this.dashboard_stream_id = obj.dashboard_stream_id;
        console.info("StreamModel", this);
    }
}
