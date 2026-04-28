import React, { useEffect, useRef } from 'react';

export default function ParticleSphere({ state }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const particles = [];
    // Slightly fewer, larger particles for a "simpler" and cleaner look
    const particleCount = 120; 
    const radius = 150; // Larger radius

    class Particle {
      constructor() {
        this.theta = Math.random() * Math.PI * 2;
        this.phi = Math.acos(Math.random() * 2 - 1);
        this.x = radius * Math.sin(this.phi) * Math.cos(this.theta);
        this.y = radius * Math.sin(this.phi) * Math.sin(this.theta);
        this.z = radius * Math.cos(this.phi);
      }

      update(rotationX, rotationY) {
        // Simple rotation math
        let y1 = this.y * Math.cos(rotationX) - this.z * Math.sin(rotationX);
        let z1 = this.y * Math.sin(rotationX) + this.z * Math.cos(rotationX);
        let x1 = this.x * Math.cos(rotationY) + z1 * Math.sin(rotationY);
        let z2 = -this.x * Math.sin(rotationY) + z1 * Math.cos(rotationY);

        this.x = x1;
        this.y = y1;
        this.z = z2;
      }

      draw(ctx, width, height, glowColor) {
        // Perspective calculation
        const perspective = 500 / (500 - this.z);
        const x = this.x * perspective + width / 2;
        const y = this.y * perspective + height / 2;
        
        // Slightly larger size for simplicity
        const size = Math.max(1, 2.5 * perspective);
        const alpha = Math.max(0.1, (this.z + radius) / (2 * radius));

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = glowColor.replace('1)', `${alpha})`);
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let glowColor = 'rgba(0, 242, 255, 1)';
      let speed = 0.005;

      if (state === 'LISTENING') {
        speed = 0.015;
        glowColor = 'rgba(0, 242, 255, 1)';
      } else if (state === 'PROCESSING') {
        speed = 0.03;
        glowColor = 'rgba(0, 102, 255, 1)';
      } else if (state === 'SPEAKING') {
        speed = 0.02;
        glowColor = 'rgba(0, 242, 255, 1)';
      } else {
        speed = 0.003;
        glowColor = 'rgba(255, 255, 255, 0.4)';
      }

      particles.forEach(p => {
        p.update(speed, speed);
        p.draw(ctx, canvas.width, canvas.height, glowColor);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [state]);

  return (
    <div className={`sphere-container state-${state.toLowerCase()}`}>
      <div className="sphere-base"></div>
      <canvas 
        ref={canvasRef} 
        width={500} 
        height={500} 
        className="particles"
      />
    </div>
  );
}