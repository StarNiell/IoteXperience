import React, { RefObject } from 'react';
import { TimeUtil } from '../../../utils/timeutil.ts';

interface SimpleCanvasProps {
    value: number;
    timestamp: string;
    text: string;
    caption: string;
    minVal: number;
    maxVal: number;
    rangeValues: number[];
    rangeColors: string[];
    unit: string;
    connected: boolean;
}

class SimpleCanvas extends React.Component<SimpleCanvasProps> {
    canvas: RefObject<HTMLCanvasElement>;

    constructor(props: SimpleCanvasProps) {
        super(props);
        this.canvas = React.createRef();
    }

    componentDidMount() {
        this.drawCanvass();
    }

    componentDidUpdate() {
        this.drawCanvass();
    }

    drawCanvass() {
        const canvas = this.canvas.current;
        const startAngle: number = 215;
        const endAngle: number = 325;

        const minPosition: number = (startAngle/180 * Math.PI);
        const maxPosition: number = (endAngle/180 * Math.PI);
        const arcRange: number = (maxPosition - minPosition);

        let tempCanvas: number = this.props.value;
        const MaxValCanvas: number = this.props.maxVal - 1;

        if (this.props.value > MaxValCanvas)
        {
            tempCanvas = MaxValCanvas;
        }
        if (this.props.value < this.props.minVal)
        {
            tempCanvas = this.props.minVal;
        }   

        const unit: string = this.props.unit ?? "°F";

        const actualPosition: number = minPosition + (arcRange * (tempCanvas + 1) / this.props.maxVal);


        let tempColor: string = "";
        let index: number = 0;
        this.props.rangeValues.forEach((value) => {
            if (tempCanvas < value)    
            {
                tempColor = this.props.rangeColors[index];
            }
            index++;
        });

        const sensorValue: number = this.props.value;
        const text: string = this.props.text?.toString() || "";

        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight - 25;
            }
            const width = canvas.clientWidth / 2;
            const height = canvas.clientHeight;

            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before redrawing

                ctx.beginPath();
                ctx.strokeStyle = '#909090';
                ctx.lineCap = 'round';
                ctx.lineWidth = 20;
                ctx.arc(width, height + 30, height, minPosition, maxPosition, false); // Mouth (clockwise)
                ctx.stroke();

                ctx.beginPath();
                ctx.strokeStyle = tempColor;
                ctx.lineCap = 'round';
                ctx.lineWidth = 20;
                ctx.arc(width, height + 30, height, minPosition, actualPosition, false); // Mouth (clockwise)
                ctx.stroke();

                ctx.fillStyle = '#FFFFFF';
                ctx.font="30px 'BR Cobane'";
                const textToWrite = Number(sensorValue).toFixed(1) + unit;
                const textWidth = ctx.measureText(textToWrite).width / 2;
                ctx.fillText(textToWrite, width - textWidth, height - 24);

                ctx.fillStyle = '#FFFFFF';
                ctx.font="18px 'BR Cobane'";
                const text2ToWrite = text;
                const text2Width = ctx.measureText(text2ToWrite).width / 2;
                ctx.fillText(text2ToWrite, width - text2Width, height - 2);


            }
        }

    }


    render() {
        // Red header when MQTT is disconnected or the value is older than 5 minutes
        // (computed here, not in drawCanvass: that runs after the render)
        const bgClassName = TimeUtil.deviceHeaderClass(this.props.timestamp, 5 * 60 * 1000, this.props.connected);
        return (
            <div className="bg-dark rounded p-1" style={{ minHeight: '205px' }} >
                <center><div style={{ minHeight: "25px" }} className={`${bgClassName} rounded m-1 text-dark`} >{this.props.caption}</div></center>
                <div className="device-ui" style={{ height: "147px" }}>
                    <canvas ref={this.canvas}  />
                </div>
            </div>
        );
    }
}

export default SimpleCanvas;
