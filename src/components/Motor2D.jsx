import React from 'react';
import { Stage, Layer, Rect, Circle, Line } from 'react-konva';

export default function Motor2D({ isRunning }) {
  return (
    <Stage width={200} height={120}>
      <Layer>
        {/* Motor body */}
        <Rect x={40} y={40} width={120} height={40} fill="#f7f9fc" stroke="#718096" strokeWidth={3} cornerRadius={10} />
        {/* Shaft */}
        <Rect x={155} y={55} width={25} height={10} fill="#2d3748" />
        {/* End cap */}
        <Circle x={40} y={60} radius={20} fill="#718096" />
        {/* Wires */}
        <Line points={[160, 60, 190, 40]} stroke="#c53030" strokeWidth={4} />
        <Line points={[160, 60, 190, 80]} stroke="#38a169" strokeWidth={4} />
        {/* Optional: Animate a spinning circle if running */}
        {isRunning && (
          <Circle
            x={100}
            y={60}
            radius={10}
            fill="#4299e1"
            opacity={0.5}
            shadowBlur={10}
          />
        )}
      </Layer>
    </Stage>
  );
}