import { useRef, useEffect } from 'react';

export default function Canvas({ matrix }) {
    const canvasRef = useRef(null); 
    
    const moduleSize = 10; // Pixels
    
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the QR code
        for (let row = 0; row < matrix.length; row++) {
            for (let col = 0; col < matrix.length; col++) {
                const module = matrix[row][col];
                ctx.fillStyle = module === 1 ? 'black' : 'white';

                // Draw the module
                ctx.fillRect(moduleSize * col, moduleSize * row, moduleSize, moduleSize);
            }
        }
    }, []);

    return (
        <canvas
            ref={canvasRef}
            width={matrix.length * moduleSize} 
            height={matrix.length * moduleSize}
        >
        </canvas>
    );
}