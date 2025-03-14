import { Container, Row, Col } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { useMqtt } from '../Components/mqtt.tsx';
import TempViewUI from '../Components/devices/UI/tempview.tsx';
import SwitchViewUI from '../Components/devices/UI/switchview.tsx';
import SimpleCanvas from '../Components/devices/UI/simplecanvas.tsx';

function Dashboard() {
  const { deviceList } = useMqtt();
  const [temp, setTemp] = useState(0);
  const [stateSwitch, setStateSwitch] = useState(0);
  const [stateButton, setStateButton] = useState(0);

  useEffect(() => {
    const item1 = deviceList.find(dev => dev.topic === "iotx/out/sensor-001");
    if (item1) {
      setTemp(item1.value);
    }

    const item2 = deviceList.find(dev => dev.topic === "iotx/out/switch-001");
    if (item2) {
      setStateSwitch(item2.value);
    }

    const item3 = deviceList.find(dev => dev.topic === "iotx/out/button-001");
    if (item3) {
      setStateButton(item3.value);
    }
  }, [deviceList]);

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
            <SimpleCanvas temp={temp} caption={"Gauge Temp Test"} minVal={0} maxVal={50} rangeValues={[50, 30, 25, 17, 15]} rangeColors={['red', 'orange', 'green', 'orange', '#0d6efd']} />
          </Col>
          <Col lg={3}>
            <SwitchViewUI caption="Button Test" device_id="button-001" value={stateButton} />
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default Dashboard;

