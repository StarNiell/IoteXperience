import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTemperatureHalf, faQuestion } from '@fortawesome/free-solid-svg-icons';
import { PowerIcon, PushIcon } from '../widgets/icons';

// Small icon of a device type, for lists
function DeviceTypeIcon({ type }: { type: string }) {
    switch (type) {
        case "switch": return <PowerIcon size={20} />;
        case "button": return <PushIcon size={20} />;
        case "contact":
            return (
                <svg width="24" height="14" viewBox="0 0 44 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                    <circle cx="6" cy="14" r="3" /><circle cx="38" cy="14" r="3" /><path d="M9 14 33 4" />
                </svg>
            );
        case "sensor": return <FontAwesomeIcon icon={faTemperatureHalf} />;
        default: return <FontAwesomeIcon icon={faQuestion} />;
    }
}

export default DeviceTypeIcon;
