import React, { useEffect, useRef, useState } from 'react';
import { SiteVisit } from '../../types';
import { playSonarPingSound } from '../../utils/audio';

interface SonarRadarProps {
  dormantSites: SiteVisit[];
  soundEnabled: boolean;
  onSelectSite?: (site: SiteVisit) => void;
}

interface RadarBlip {
  id: string;
  domain: string;
  site?: SiteVisit;
  r: number;
  angle: number;
  pingAlpha: number;
  rippleRadius: number;
  lastPingTime: number;
  isVirtual?: boolean;
}

// Deterministic angle from domain string
function getDomainAngle(domain: string): number {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash * 31 + domain.charCodeAt(i)) & 0xffffff;
  }
  return (hash % 628) / 100; // 0 to ~6.28 (2 * PI)
}

// Map days dormant to radius inside range rings (25px to 78px)
function getDomainRadius(daysDormant: number): number {
  const clamped = Math.max(30, Math.min(daysDormant, 180));
  // 30 days -> 32px, 60 days -> 48px, 90 days -> 64px, 180 days -> 78px
  return 30 + ((clamped - 30) / 150) * 48;
}

export default function SonarRadar({
  dormantSites,
  soundEnabled,
  onSelectSite
}: SonarRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [azimuth, setAzimuth] = useState<number>(0);
  const [tickerText, setTickerText] = useState<string>(
    '[RECON] Auditing origin storage partitions via browsingData API...'
  );
  const [tickerClock, setTickerClock] = useState<string>('00:00:00');

  // Prepare blips from dormantSites or fallback virtual targets
  const blipsRef = useRef<RadarBlip[]>([]);

  useEffect(() => {
    const now = Date.now();
    if (dormantSites.length > 0) {
      blipsRef.current = dormantSites.map((site) => {
        const days = Math.round((now - site.lastVisited) / (1000 * 60 * 60 * 24));
        return {
          id: site.domain,
          domain: site.domain,
          site,
          r: getDomainRadius(days),
          angle: getDomainAngle(site.domain),
          pingAlpha: 0,
          rippleRadius: 0,
          lastPingTime: 0
        };
      });
    } else {
      // Ambient perimeter points when queue is clean
      blipsRef.current = [
        {
          id: 'sandbox-secure',
          domain: 'sandbox.local',
          r: 42,
          angle: 1.1,
          pingAlpha: 0,
          rippleRadius: 0,
          lastPingTime: 0,
          isVirtual: true
        },
        {
          id: 'allowlist-shield',
          domain: 'shield-perimeter.io',
          r: 68,
          angle: 4.3,
          pingAlpha: 0,
          rippleRadius: 0,
          lastPingTime: 0,
          isVirtual: true
        }
      ];
    }
  }, [dormantSites]);

  // Live recon ticker cycle
  useEffect(() => {
    const scripts = [
      '[RECON] Auditing origin storage partitions via browsingData API...',
      '[RADAR] 360° tactical sweep active. Scanning perimeter for dormant storage...',
      `[TARGETS] ${dormantSites.length} dormant web origins detected in perimeter sector`,
      '[SHIELD] Verified Institutional Allowlist locked: zero unauthorized purge',
      '[AUDIT] Evaluating stale indexedDB, cookies, and cache partitions...',
      '[SANDBOX] 100% on-device local execution. Zero network telemetry egress',
      '[INTEGRITY] Inactivity scheduler heartbeat: synchronized'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % scripts.length;
      setTickerText(scripts[idx]);
      const d = new Date();
      setTickerClock(d.toTimeString().split(' ')[0]);
    }, 3200);

    return () => clearInterval(interval);
  }, [dormantSites.length]);

  // Main Radar Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let sweepAngle = 0;
    let lastSoundTime = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = 82;

      // 1. Draw Subtle Background Tactical Grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.06)';
      ctx.lineWidth = 1;
      const gridSize = 24;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 2. Concentric Tactical Radar Range Rings
      const rings = [
        { r: 28, label: '30d' },
        { r: 54, label: '60d' },
        { r: 80, label: '90d+' }
      ];

      rings.forEach((ring, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = idx === rings.length - 1 ? 'rgba(6, 182, 212, 0.35)' : 'rgba(6, 182, 212, 0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Range ring label
        ctx.fillStyle = 'rgba(6, 182, 212, 0.45)';
        ctx.font = '9px monospace';
        ctx.fillText(ring.label, cx + 4, cy - ring.r + 10);
      });

      // 3. Radar Outer Compass Bezel & Heading Marks
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Heading ticks & Labels (N, E, S, W)
      const compassHeadings = [
        { label: '000°', angle: -Math.PI / 2, name: 'N' },
        { label: '090°', angle: 0, name: 'E' },
        { label: '180°', angle: Math.PI / 2, name: 'S' },
        { label: '270°', angle: Math.PI, name: 'W' }
      ];

      compassHeadings.forEach((hItem) => {
        const hx = cx + Math.cos(hItem.angle) * (maxRadius + 4);
        const hy = cy + Math.sin(hItem.angle) * (maxRadius + 4);
        const hx2 = cx + Math.cos(hItem.angle) * (maxRadius + 9);
        const hy2 = cy + Math.sin(hItem.angle) * (maxRadius + 9);

        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx2, hy2);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // 4. Center Crosshairs with central bullseye
      ctx.beginPath();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.22)';
      ctx.moveTo(cx - maxRadius - 2, cy);
      ctx.lineTo(cx + maxRadius + 2, cy);
      ctx.moveTo(cx, cy - maxRadius - 2);
      ctx.lineTo(cx, cy + maxRadius + 2);
      ctx.stroke();
      ctx.setLineDash([]); // reset dash

      // Small Center Hub
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();

      // 5. 360° Rotating Radar Sweep Cone
      sweepAngle = (sweepAngle + 0.024) % (Math.PI * 2);
      const degrees = Math.round((sweepAngle * 180) / Math.PI);
      setAzimuth(degrees);

      // Gradient Sweep Cone
      const coneLength = 0.5; // arc in radians
      const sweepGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      sweepGradient.addColorStop(0, 'rgba(6, 182, 212, 0.42)');
      sweepGradient.addColorStop(0.7, 'rgba(6, 182, 212, 0.18)');
      sweepGradient.addColorStop(1, 'rgba(6, 182, 212, 0.01)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadius, sweepAngle - coneLength, sweepAngle, false);
      ctx.closePath();
      ctx.fillStyle = sweepGradient;
      ctx.fill();

      // Sharp glowing leading edge line
      const lx = cx + Math.cos(sweepAngle) * maxRadius;
      const ly = cy + Math.sin(sweepAngle) * maxRadius;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(lx, ly);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      // 6. Draw Radar Blips (Dormant Sites)
      const nowMs = Date.now();
      blipsRef.current.forEach((blip) => {
        const bx = cx + Math.cos(blip.angle) * blip.r;
        const by = cy + Math.sin(blip.angle) * blip.r;

        // Calculate angular difference to check if sweep beam just crossed blip
        const diff = Math.abs(
          ((sweepAngle - blip.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
        );

        if (diff < 0.05 && nowMs - blip.lastPingTime > 2000) {
          blip.pingAlpha = 1.0;
          blip.rippleRadius = 1;
          blip.lastPingTime = nowMs;

          // Sound effect on detected target
          if (soundEnabled && !blip.isVirtual && nowMs - lastSoundTime > 600) {
            playSonarPingSound(1180);
            lastSoundTime = nowMs;
          }
        }

        // Draw permanent subtle blip dot
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fillStyle = blip.isVirtual ? 'rgba(6, 182, 212, 0.4)' : '#f59e0b';
        ctx.fill();

        // Draw active ping with phosphor persistence
        if (blip.pingAlpha > 0.02) {
          // Phosphor glowing dot
          ctx.beginPath();
          ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = blip.isVirtual ? '#22d3ee' : '#10b981';
          ctx.globalAlpha = blip.pingAlpha;
          ctx.shadowColor = blip.isVirtual ? '#06b6d4' : '#10b981';
          ctx.shadowBlur = 10;
          ctx.fill();

          // Expanding sonar ripple ring
          ctx.beginPath();
          ctx.arc(bx, by, blip.rippleRadius, 0, Math.PI * 2);
          ctx.strokeStyle = blip.isVirtual ? '#22d3ee' : '#34d399';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Target callout label
          ctx.font = '10px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 4;
          const displayTxt = blip.domain.length > 18 ? blip.domain.slice(0, 16) + '…' : blip.domain;
          ctx.fillText(displayTxt, bx + 8, by + 3);

          ctx.globalAlpha = 1.0;
          ctx.shadowBlur = 0;

          // Decay ping
          blip.pingAlpha -= 0.012;
          blip.rippleRadius += 0.55;
        }
      });

      // 7. Left HUD Telemetry Box (drawn directly on canvas)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.85)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('● 360° SONAR RECON', 14, 28);

      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`AZ: ${degrees.toString().padStart(3, '0')}°`, 14, 46);
      ctx.fillText('SWEEP: 3.8 RPM', 14, 62);
      ctx.fillText('RANGE: 30d-180d', 14, 78);
      ctx.fillText(`MODE: PERIMETER`, 14, 94);

      // 8. Right HUD Telemetry Box
      ctx.textAlign = 'right';
      ctx.fillStyle = dormantSites.length > 0 ? '#f59e0b' : '#10b981';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(
        dormantSites.length > 0
          ? `TARGETS: ${dormantSites.length} DETECTED`
          : 'SECTOR: SECURE',
        w - 14,
        28
      );

      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('ENCRYPT: ON-DEVICE', w - 14, 46);
      ctx.fillText('EGRESS: 0.0 KB (AIR-GAPPED)', w - 14, 62);
      ctx.fillText('DECAY ENGINE: ACTIVE', w - 14, 78);
      ctx.fillText(`CLOCK: ${tickerClock || '00:00:00'}`, w - 14, 94);
      ctx.textAlign = 'left';

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [soundEnabled, tickerClock]);

  // Handle click on canvas to trigger manual sonar ping or select site
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Check if clicked near any blip
    let clickedBlip: RadarBlip | null = null;
    blipsRef.current.forEach((blip) => {
      const bx = cx + Math.cos(blip.angle) * blip.r;
      const by = cy + Math.sin(blip.angle) * blip.r;
      const dist = Math.hypot(x - bx, y - by);
      if (dist < 18) {
        clickedBlip = blip;
      }
    });

    if (clickedBlip && (clickedBlip as RadarBlip).site && onSelectSite) {
      onSelectSite((clickedBlip as RadarBlip).site!);
    }

    // Always trigger manual sonar ping sound on click
    if (soundEnabled) {
      playSonarPingSound(1240);
    }

    // Force illuminate all blips
    blipsRef.current.forEach((b) => {
      b.pingAlpha = 1.0;
      b.rippleRadius = 1;
    });
  };

  return (
    <div className="sonar-radar-container">
      {/* Radar Canvas with Tactical Bezel */}
      <div className="radar-canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={518}
          height={180}
          className="sonar-radar-canvas"
          onClick={handleCanvasClick}
          title="Click to emit tactical sonar ping or target site"
        />
        <div className="radar-azimuth-pill">
          <span className="radar-ping-dot"></span>
          <span>AZ: {azimuth.toString().padStart(3, '0')}° // 360° TACTICAL SWEEP</span>
        </div>
      </div>

      {/* Reconnaissance Live Ticker Strip */}
      <div className="recon-ticker-strip">
        <div className="ticker-badge">LIVE RECON</div>
        <div className="ticker-content">
          <span className="ticker-text">{tickerText}</span>
          <span className="ticker-cursor">_</span>
        </div>
        <div className="ticker-time">{tickerClock}</div>
      </div>
    </div>
  );
}
