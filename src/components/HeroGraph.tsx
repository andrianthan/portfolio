import { useEffect, useRef, useState } from 'react';
import type { GraphEdge, GraphNode } from '../lib/heroGraph';
import { GRAPH_CENTER, GRAPH_VIEWBOX, controlPoint, edgeMidpoint, edgePath, lerpNodes, pullNodes } from '../lib/heroGraph';

const PULL = { radius: 70, maxShift: 12 };

// A check edge bows outwards around the tool ring.
const CHECK_BOW = 0.45;

// The label sits 13 units under its node, or 6 units above it when there is no room below.
const LABEL_OFFSET = 13;
const LABEL_ABOVE_OFFSET = 6;

const [, , VIEW_W, VIEW_H] = GRAPH_VIEWBOX.split(' ').map(Number);

/** A point on the quadratic that carries an edge, at parameter t. */
function curvePoint(
  p0: { x: number; y: number },
  c: { x: number; y: number },
  p1: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * t * u * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * t * u * c.y + t * t * p1.y,
  };
}

/** How far a point sits from the closest node centre. */
function nearestCentre(p: { x: number; y: number }, nodes: GraphNode[]): number {
  return nodes.reduce((min, n) => Math.min(min, Math.hypot(p.x - n.x, p.y - n.y)), Infinity);
}

/**
 * Where the check mark of an edge sits. The plain midpoint of a check edge can land inside a
 * node's disc, so the curve is scanned for the point that keeps the greatest distance from the
 * closest node centre. The midpoint is kept when the scan finds nothing better.
 */
export function checkMarkPoint(
  from: GraphNode,
  to: GraphNode,
  nodes: GraphNode[],
  center: { x: number; y: number } = GRAPH_CENTER,
  bow = CHECK_BOW,
): { x: number; y: number } {
  const fallback = edgeMidpoint(from, to, center, bow);
  const control = controlPoint(from, to, center, bow);
  let best = fallback;
  let bestDistance = nearestCentre(fallback, nodes);
  for (let step = 4; step <= 16; step++) {
    const t = step / 20; // 0.2 to 0.8 in steps of 0.05
    const p = curvePoint(from, control, to, t);
    const distance = nearestCentre(p, nodes);
    if (distance > bestDistance) {
      bestDistance = distance;
      best = p;
    }
  }
  return best;
}

/**
 * Where a node's label sits. The label goes under the node, but a node pushed to the bottom of
 * the box would take its label out of the box with it, so it flips above the node instead.
 */
export function labelY(node: GraphNode): number {
  const below = node.y + node.r + LABEL_OFFSET;
  return below <= VIEW_H ? below : node.y - node.r - LABEL_ABOVE_OFFSET;
}

export default function HeroGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [shown, setShown] = useState<GraphNode[]>(nodes);
  const current = useRef<GraphNode[]>(nodes);
  const target = useRef<GraphNode[]>(nodes);
  const frame = useRef<number | null>(null);
  const inView = useRef(true);
  const inside = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const toViewBox = (clientX: number, clientY: number) => {
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: ((clientX - rect.left) / rect.width) * VIEW_W,
        y: ((clientY - rect.top) / rect.height) * VIEW_H,
      };
    };

    const tick = () => {
      frame.current = null;
      current.current = lerpNodes(current.current, target.current, 0.15);
      setShown(current.current);
      const moving = current.current.some(
        (n, i) => Math.abs(n.x - target.current[i].x) > 0.05 || Math.abs(n.y - target.current[i].y) > 0.05,
      );
      if (moving && inView.current) frame.current = requestAnimationFrame(tick);
    };

    const schedule = () => {
      if (frame.current === null && inView.current) frame.current = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const p = toViewBox(event.clientX, event.clientY);
      if (!p) return;
      inside.current = true;
      target.current = pullNodes(nodes, p, PULL);
      schedule();
    };

    const onLeave = () => {
      inside.current = false;
      target.current = nodes.map((n) => ({ ...n }));
      schedule();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        inView.current = entries.some((e) => e.isIntersecting);
        if (!inView.current) {
          if (frame.current !== null) cancelAnimationFrame(frame.current);
          frame.current = null;
          target.current = nodes.map((n) => ({ ...n }));
          current.current = nodes.map((n) => ({ ...n }));
          setShown(current.current);
        } else if (inside.current) {
          schedule();
        }
      },
      { threshold: 0.01 },
    );
    observer.observe(svg);

    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerleave', onLeave);

    return () => {
      observer.disconnect();
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerleave', onLeave);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [nodes]);

  const base = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg
      ref={svgRef}
      className="hg-svg"
      viewBox={GRAPH_VIEWBOX}
      role="img"
      aria-labelledby="hg-title hg-desc"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="hg-title">Agent graph</title>
      <desc id="hg-desc">
        A deterministic agent routes a question to one of five tools, and a verifier checks every number in the answer against this site&apos;s published content.
      </desc>
      <g className="hg-edges">
        {edges.map((edge) => {
          const from = base.get(edge.from);
          const to = base.get(edge.to);
          if (!from || !to) return null;
          const bow = edge.check ? CHECK_BOW : 0;
          const d = edgePath(from, to, GRAPH_CENTER, bow);
          const mark = edge.check ? checkMarkPoint(from, to, nodes, GRAPH_CENTER, bow) : null;
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <path className="hg-edge" d={d} />
              {mark ? <text className="hg-check" x={mark.x} y={mark.y}>✓</text> : null}
            </g>
          );
        })}
      </g>
      <g className="hg-nodes">
        {shown.map((node) => (
          <a key={node.id} href={node.href} className={`hg-node hg-${node.kind}`}>
            <circle cx={node.x} cy={node.y} r={node.r} />
            <text x={node.x} y={labelY(node)}>{node.label}</text>
          </a>
        ))}
      </g>
    </svg>
  );
}
