export const generatePastelGradient = () => {
    // Generate pastel colors by mixing with white
    const generatePastel = () => {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 85%)`;
    };

    const color1 = generatePastel();
    const color2 = generatePastel();
    const color3 = generatePastel();

    return `linear-gradient(135deg, ${color1}, ${color2}, ${color3})`;
};

export const pastelColors = {
    blue: '#E6F3FF',
    green: '#E7F5E9',
    purple: '#F3E6FF',
    pink: '#FFE6F3',
    yellow: '#FFF8E6',
    gray: '#F5F5F5',
}; 