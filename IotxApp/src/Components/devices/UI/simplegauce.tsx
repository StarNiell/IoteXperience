import React, { RefObject } from 'react';

interface SimpleGaugeProps {
    percent?: number;
    color?: string;
    intervals?: number[];
    colors?: string[];
    width?: string;
}

class SimpleGauge extends React.Component<SimpleGaugeProps> {
    container: RefObject<HTMLDivElement>;
    base: RefObject<SVGCircleElement>;
    progress: RefObject<SVGCircleElement>;
    point: RefObject<SVGCircleElement>;
    text: RefObject<HTMLDivElement>;

    constructor(props: SimpleGaugeProps) {
        super(props);
        this.container = React.createRef();
        this.base = React.createRef();
        this.progress = React.createRef();
        this.point = React.createRef();
        this.text = React.createRef();
    }
    componentDidMount() {

        const percent = this.props.percent ? this.props.percent >= 0 ? this.props.percent <= 100 ? this.props.percent : 100 : 0 : 100;
        let color = this.props.color || '#5BB030';
        if (this.props.intervals && this.props.colors) {
            let startValue = 0;
            this.props.intervals.forEach((element, idx) => {
                if (percent >= startValue && percent < element) {
                    color = (this.props.colors && this.props.colors[idx]) || color;
                }
                startValue = element;
            });
        }

        let container = this.container.current;
        if (!container) return;
        const width = container.clientWidth - 20;

        let strokeWidth = width / 12;
        let height = (width / 2) + (strokeWidth / 2);
        let ratio = (width - (strokeWidth)) / 2;
        let offset = Math.PI * ratio;

        container.style.height = height + 'px';

        let bar = percent * offset / 100;
        let offsetBar = (offset * 2) - bar;

        let circle = this.base.current;
        if (circle) {
            circle.style.width = '100%';
            circle.style.height = '100%';
            circle.style.fill = 'none';
            circle.style.stroke = '#E5E5E5';
            circle.style.strokeLinecap = 'round';
            circle.setAttribute('cx', ratio.toString());
            circle.setAttribute('cy', ratio.toString());
            circle.setAttribute('r', ratio.toString());
            circle.style.strokeDashoffset = offset.toString();
            circle.style.strokeDasharray = offset.toString();
            circle.style.strokeWidth = strokeWidth.toString();
            circle.style.transform = `translate(${strokeWidth / 2}px,${strokeWidth / 2}px)`;
        }
        circle = this.progress.current;
        if (circle) {
            circle.style.width = '100%';
            circle.style.height = '100%';
            circle.style.fill = 'none';
            circle.style.stroke = '#E5E5E5';
            circle.style.strokeLinecap = 'round';
            circle.setAttribute('cx', ratio.toString());
            circle.setAttribute('cy', ratio.toString());
            circle.setAttribute('r', ratio.toString());
            circle.style.strokeDashoffset = offset.toString();
            circle.style.strokeWidth = strokeWidth.toString();
            circle.style.transform = `translate(${strokeWidth / 2}px,${strokeWidth / 2}px)`;
        }
        circle = this.point.current;
        if (circle) {
            circle.style.width = '100%';
            circle.style.height = '100%';
            circle.style.fill = 'none';
            circle.style.stroke = '#E5E5E5';
            circle.style.strokeLinecap = 'round';
            circle.setAttribute('cx', ratio.toString());
            circle.setAttribute('cy', ratio.toString());
            circle.setAttribute('r', ratio.toString());
            circle.style.strokeWidth = strokeWidth.toString();
            circle.style.transform = `translate(${strokeWidth / 2}px,${strokeWidth / 2}px)`;
        }

        let progress = this.progress.current;
        if (progress) {
            progress.style.stroke = color;
            progress.style.strokeDasharray = `${bar} ${offsetBar}`;
        }
        let point = this.point.current;
        if (point) {
            point.style.strokeDasharray = `1 ${(offset * 2) - 1}`;
            point.style.strokeDashoffset = (offset - bar).toString();
            point.style.stroke = 'black';
        }

        let text = this.text.current;
        if (text) {
            //text.style.fontSize = `${height / 3}px`;
            //text.style.fontWeight = 'bold';
            text.style.marginTop = `-${height / 2}px`;
            //text.style.color = color;
            text.style.display = 'grid';
            text.style.justifyContent = 'center';
        }

    }
    render() {
        return (
            <div className="bg-dark rounded p-1" style={{ minHeight: '196px' }} >
                <div className="container" style={{ width: '100%' }} ref={this.container}>
                    <svg className="gauge-svg">
                        <circle ref={this.base}></circle>
                        <circle ref={this.progress}></circle>
                        <circle ref={this.point}></circle>
                    </svg>
                    <h1 className="number" ref={this.text}>{this.props.percent ? this.props.percent >= 0 ? this.props.percent <= 100 ? this.props.percent : 100 : 0 : 100}°C</h1>
                </div>
            </div>
        );
    }
}

export default SimpleGauge;