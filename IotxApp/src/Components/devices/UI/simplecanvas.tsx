import React, { RefObject } from 'react';

interface SimpleCanvasProps {
    temp: number;
    caption: string;
    minVal: number;
    maxVal: number;
    rangeValues: number[];
    rangeColors: string[];
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
        
        const minPosition: number = -2.4;
        const maxPosition: number = -0.7;
        const arcRange: number = (maxPosition - minPosition);
        const actualPosition: number = minPosition + (arcRange * this.props.temp / this.props.maxVal);

        
        let tempColor: string = "";
        let index: number = 0;
        this.props.rangeValues.forEach((value) => {
            if (this.props.temp < value)    
            {
                tempColor = this.props.rangeColors[index];
            }
            index++;
        });

        if (canvas) {
            const ctx = canvas.getContext("2d");
            const width = canvas.clientWidth / 2;
            const height = canvas.clientHeight;

            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before redrawing

                ctx.beginPath();
                ctx.strokeStyle = '#909090';
                ctx.lineCap = 'round';
                ctx.lineWidth = 20;
                ctx.arc(width, height + 60, width * 1.13, -2.4, -0.7, false); // Mouth (clockwise)
                ctx.stroke();

                ctx.beginPath();
                ctx.strokeStyle = tempColor;
                ctx.lineCap = 'round';
                ctx.lineWidth = 20;
                ctx.arc(width, height + 60, width * 1.13, -2.4, actualPosition, false); // Mouth (clockwise)
                ctx.stroke();

                ctx.fillStyle = '#FFFFFF';
                ctx.font="30px Verdana";
                let textToWrite = this.props.temp.toString() + "°C";
                let textWidth = ctx.measureText(textToWrite ).width / 2;
                ctx.fillText(textToWrite, width - textWidth, height - 30);


            }
        }
    }

    render() {
        return (
            <div className="bg-dark rounded p-1" style={{ minHeight: '165px' }} >
                <center><div style={{ minHeight: "25px" }} className="bg-lightgray rounded text-dark" >{this.props.caption}</div></center>
                <div className="device-ui" style={{ height: "132px" }}>
                    <center><canvas ref={this.canvas} /></center>
                </div>
            </div>
        );
    }
}

export default SimpleCanvas;