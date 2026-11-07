import { useEffect, useRef, useState } from 'react';
import type { GraphEdge, GraphNode } from '../lib/heroGraph';
import {
  CHECK_MARK_FONT_SIZE, GRAPH_VIEWBOX, clientToViewBox, edgeShapes, labelY, lerpNodes, pullNodes,
} from '../lib/heroGraph';

const PULL = { radius: 70, maxShift: 12 };

export default function HeroGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [shown, setShown] = useState<GraphNode[]>(nodes);
  const current = useRef<GraphNode[]>(nodes);
  const target = useRef<GraphNode[]>(nodes);
  const frame = useRef<number | null>(null);
  const inView = useRef(false);
  const inside = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    // Under reduced motion the nodes never move, so no listener is attached at all.
    if (motion.matches) return;

    // The box is cached: reading it on every pointer move forces a layout flush. It is thrown
    // away whenever the layout may have moved (the pointer enters, the page resizes or scrolls).
    let rect: DOMRect | null = null;
    const invalidate = () => { rect = null; };

    const toViewBox = (clientX: number, clientY: number) => {
      if (!rect) rect = svg.getBoundingClientRect();
      return clientToViewBox({ x: clientX, y: clientY }, rect);
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

    const onEnter = () => invalidate();

    svg.addEventListener('pointerenter', onEnter);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', invalidate);
    window.addEventListener('scroll', invalidate, true);

    const stop = () => {
      observer.disconnect();
      svg.removeEventListener('pointerenter', onEnter);
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', invalidate);
      window.removeEventListener('scroll', invalidate, true);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };

    // The system preference can be turned on while the page is open, so it is watched: the
    // reaction stops and the nodes go back to the layout.
    const onMotionChange = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      stop();
      target.current = nodes.map((n) => ({ ...n }));
      current.current = nodes.map((n) => ({ ...n }));
      setShown(current.current);
    };
    motion.addEventListener('change', onMotionChange);

    return () => {
      motion.removeEventListener('change', onMotionChange);
      stop();
    };
  }, [nodes]);

  // The edges are drawn from the positions the nodes have right now, so they stretch with them.
  const shapes = edgeShapes(shown, edges);

  return (
    <svg
      ref={svgRef}
      className="hg-svg"
      viewBox={GRAPH_VIEWBOX}
      role="group"
      aria-labelledby="hg-title hg-desc"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="hg-title">Agent graph</title>
      <desc id="hg-desc">
        A deterministic agent routes a question to one of five tools, and a verifier checks every number in the answer against this site&apos;s published content.
      </desc>
      <g className="hg-edges">
        {shapes.map((shape) => (
          <g key={shape.key}>
            <path className="hg-edge" d={shape.d} />
            {shape.check ? (
              <text
                className="hg-check"
                x={shape.check.x}
                y={shape.check.y}
                textAnchor="middle"
                fontSize={CHECK_MARK_FONT_SIZE}
              >
                ✓
              </text>
            ) : null}
          </g>
        ))}
      </g>
      <g className="hg-nodes">
        {shown.map((node) => (
          <a key={node.id} href={node.href} className={`hg-node hg-${node.kind}`}>
            <circle cx={node.x} cy={node.y} r={node.r} />
            <text x={node.x} y={labelY(node)} textAnchor="middle">{node.label}</text>
          </a>
        ))}
      </g>
    </svg>
  );
}
