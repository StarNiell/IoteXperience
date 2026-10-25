// Generic icons for the widgets: they say what kind of control it is,
// not what it drives (a switch can drive a light, a pump, a fan...).

interface IconProps {
    color?: string;
    size?: number;
}

// Switch: the standard power symbol
export const PowerIcon: React.FC<IconProps> = ({ color = "currentColor", size = 30 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0" />
    </svg>
);

// Button: a push button seen from above
export const PushIcon: React.FC<IconProps> = ({ color = "currentColor", size = 30 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" fill={color} />
    </svg>
);

// Contact: the electrical symbol of a contact, closed (blade on both terminals) or open
export const ContactIcon: React.FC<IconProps & { closed: boolean }> = ({ closed, color = "currentColor" }) => (
    <svg width="56" height="30" viewBox="0 0 44 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round"
        role="img" aria-label={closed ? "Contact closed" : "Contact open"}>
        <circle cx="6" cy="14" r="3" />
        <circle cx="38" cy="14" r="3" />
        <path d={closed ? "M9 14h26" : "M9 14 33 4"} />
    </svg>
);
