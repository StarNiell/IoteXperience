import React from 'react';
import { ContactIcon } from './icons';

// Contact: any on/off input (door, motor, pump, infrared sensor...). 1 = closed.
const ContactWidget: React.FC<{ value: number }> = ({ value }) => {
    const closed = Number(value) === 1;
    return (
        <>
            <div className="iotx-card-row iotx-card-control">
                <ContactIcon closed={closed} color={closed ? "var(--iotx-ok)" : "var(--iotx-muted)"} />
                <span className="iotx-led" data-on={closed} aria-hidden="true" />
            </div>
            <span className="iotx-card-foot">Contact · {closed ? "Closed" : "Open"}</span>
        </>
    );
};

export default ContactWidget;
