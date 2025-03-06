import { Container, Row, Col } from 'react-bootstrap';
//import GaugeComponent from 'react-gauge-component';
import { useMqtt } from '../Components/mqtt.tsx';
import TempViewUI from '../Components/devices/UI/tempview.tsx';
import SwitchViewUI from '../Components/devices/UI/switchview.tsx';
import SimpleCanvas from '../Components/devices/UI/simplecanvas.tsx';

function Dashboard() {
  const { deviceList } = useMqtt();

  let item1 = deviceList.find(dev => dev.topic === "iotx/out/sensor-001");
  let temp: number = 0;
  if (item1) {
    temp = item1.value;
  }

  let item2 = deviceList.find(dev => dev.topic === "iotx/out/switch-001");
  let stateSwitch: number = 0
  if (item2)
    stateSwitch = item2.value;

  let item3 = deviceList.find(dev => dev.topic === "iotx/out/button-001");
  let stateButton: number = 0
  if (item3)
    stateButton = item3.value;

  return (
    <>
      <center className='p-3'><h1>Dashboard</h1></center>
      <Container className="fluid">
        <Row>
          <Col lg={3}>
            <TempViewUI caption="Temperature Test" value={temp} />
          </Col>
          <Col lg={3}>
            <SwitchViewUI caption="Switch Test" device_id="switch-001" value={stateSwitch} />
          </Col>
          <Col lg={3}>
            <SimpleCanvas temp={temp} caption={"Gauce Temp Test"} minVal={0} maxVal={50} rangeValues={[50, 30, 25, 17, 15]} rangeColors={['red', 'orange', 'green', 'orange', '#0d6efd']} />
          </Col>
          <Col lg={3}>
            <SwitchViewUI caption="Button Test" device_id="button-001" value={stateButton} />
          </Col>
        </Row>
      </Container>
    </>
  )

  /*
          <Col xs={12} lg={3} style={{backgroundColor: '#111111'}} className="rounded p-1">
            <GaugeComponent
              type="semicircle"
              arc={{
                width: 0.2,
                padding: 0.005,
                cornerRadius: 1,
                // gradient: true,
                subArcs: [
                  {
                    limit: 15,
                    color: '#EA4228',
                    showTick: true,
                    tooltip: {
                      text: 'Too low temperature!'
                    },
                    onClick: () => console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"),
                    onMouseMove: () => console.log("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"),
                    onMouseLeave: () => console.log("CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"),
                  },
                  {
                    limit: 17,
                    color: '#F5CD19',
                    showTick: true,
                    tooltip: {
                      text: 'Low temperature!'
                    }
                  },
                  {
                    limit: 28,
                    color: '#5BE12C',
                    showTick: true,
                    tooltip: {
                      text: 'OK temperature!'
                    }
                  },
                  {
                    limit: 30, color: '#F5CD19', showTick: true,
                    tooltip: {
                      text: 'High temperature!'
                    }
                  },
                  {
                    color: '#EA4228',
                    tooltip: {
                      text: 'Too high temperature!'
                    }
                  }
                ]
              }}
              pointer={{
                color: '#345243',
                length: 0.80,
                width: 15,
                // animate: true,
                // elastic: true,
                animationDelay: 200,
              }}
              labels={{
                valueLabel: { formatTextValue: value => value + 'ºC' },
                tickLabels: {
                  type: 'outer',
                  defaultTickValueConfig: { formatTextValue: value => value + 'ºC' },
                  ticks: [
                    { value: 13 },
                    { value: temp },
                    { value: 32 }
                  ],
                }
              }}
              value={temp}
              minValue={10}
              maxValue={35}
            />
          </Col>

  */
}
export default Dashboard;

