'use client';

import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import type { PersonSummary, Relationship } from '@rootlink/shared';
import { getDisplayName } from '@rootlink/shared';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PedigreeTreeHandle {
  zoomIn:  () => void;
  zoomOut: () => void;
  fitView: () => void;
}

export type TreeViewMode = 'pedigree' | 'fan' | 'descendants';

interface TreeProps {
  persons:           PersonSummary[];
  relationships:     Relationship[];
  rootPersonId:      string;
  selectedPersonId?: string;
  onSelectPerson:    (personId: string) => void;
  onAddParent?:      (personId: string) => void;
  /**
   * pedigree    — root's ANCESTORS, fanning upward (parents/grandparents/...).
   *               This is the traditional "who came before this person" view.
   * descendants — root's DESCENDANTS, fanning downward (children/grandchildren/...).
   *               The traditional "who came from this person" view.
   * fan         — root's ancestors laid out as a radial fan/sunburst, the
   *               classic genealogy "fan chart" — same ancestor data as
   *               pedigree, different (radial) geometry.
   */
  viewMode?:         TreeViewMode;
  className?:        string;
}

type TreeNodeData = PersonSummary & { _children?: TreeNodeData[] };

// ── Layout Constants ─────────────────────────────────────────────────────────

const NODE_W   = 160;
const NODE_H   = 70;
const SIB_GAP  = 20;
const GEN_GAP  = 100;

const FAN_RING_DEPTH = 90;   // px per generation ring, outward from center
const FAN_NODE_R     = 34;   // node "radius" used for label sizing at the fan's outer rings
const FAN_MAX_GEN    = 5;    // generations shown before the fan would get unreadably thin

// ── Shared helpers ───────────────────────────────────────────────────────────

function sexColor(sex: PersonSummary['sex']): string {
  return sex === 'male' ? 'var(--sex-male)' : sex === 'female' ? 'var(--sex-female)' : 'var(--border-strong)';
}

function qualityColor(score: number): string {
  return score >= 70 ? '#4a7c59' : score >= 40 ? '#c79a4a' : 'var(--border-strong)';
}

function shortName(d: PersonSummary, maxLen = 20): string {
  const name = d.isLiving
    ? 'Living'
    : getDisplayName({
        firstName: null,
        middleName: null,
        lastName: d.displayName.split(' ').pop() ?? null,
        preferredName: d.displayName,
      });
  return name.length > maxLen ? `${name.slice(0, maxLen - 2)}…` : name;
}

function dateLabel(d: PersonSummary): string {
  if (d.isLiving) return 'Living';
  const birth = d.birthYear ?? '?';
  const death = d.deathYear ?? '';
  return death ? `${birth} – ${death}` : `b. ${birth}`;
}

/** Builds personId -> [parentIds] from biological/adoptive parent relationships. */
function buildParentsMap(relationships: Relationship[]): Map<string, string[]> {
  const parentsMap = new Map<string, string[]>();
  for (const rel of relationships) {
    if (rel.type === 'biological_parent' || rel.type === 'adoptive_parent') {
      // fromPersonId is the PARENT, toPersonId is the CHILD (see relationship.service.ts)
      const arr = parentsMap.get(rel.toPersonId) ?? [];
      arr.push(rel.fromPersonId);
      parentsMap.set(rel.toPersonId, arr);
    }
  }
  return parentsMap;
}

/** Builds personId -> [childIds] from biological/adoptive parent relationships. */
function buildChildrenMap(relationships: Relationship[]): Map<string, string[]> {
  const childrenMap = new Map<string, string[]>();
  for (const rel of relationships) {
    if (rel.type === 'biological_parent' || rel.type === 'adoptive_parent') {
      const arr = childrenMap.get(rel.fromPersonId) ?? [];
      arr.push(rel.toPersonId);
      childrenMap.set(rel.fromPersonId, arr);
    }
  }
  return childrenMap;
}

// ── PedigreeTree ──────────────────────────────────────────────────────────────

export const PedigreeTree = forwardRef<PedigreeTreeHandle, TreeProps>(
  function PedigreeTree(
    {
      persons,
      relationships,
      rootPersonId,
      selectedPersonId,
      onSelectPerson,
      onAddParent,
      viewMode = 'pedigree',
      className,
    },
    ref,
  ) {
    const svgRef       = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const zoomRef       = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

    // ── Expose imperative API ─────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        if (!svgRef.current || !zoomRef.current) return;
        d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.4);
      },
      zoomOut: () => {
        if (!svgRef.current || !zoomRef.current) return;
        d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1 / 1.4);
      },
      fitView: () => {
        if (!svgRef.current || !zoomRef.current) return;
        const { width, height } = dimensions;
        const ty = viewMode === 'fan' ? height / 2 : height / 3;
        d3.select(svgRef.current).transition().duration(400)
          .call(zoomRef.current.transform, d3.zoomIdentity.translate(width / 2, ty));
      },
    }));

    // ── Hierarchy builders ────────────────────────────────────────────────────
    //
    // `pedigree` and `fan` both walk ANCESTORS (parents map) — they show the
    // same underlying data, just laid out differently (tree vs. radial).
    // `descendants` walks CHILDREN (children map) downward from the root.

    const buildAncestorHierarchy = useCallback((): d3.HierarchyNode<TreeNodeData> | null => {
      const personMap  = new Map(persons.map((p) => [p.id, p]));
      const parentsMap = buildParentsMap(relationships);

      const root = personMap.get(rootPersonId);
      if (!root) return null;

      const visited = new Set<string>();

      const buildNode = (personId: string, depth: number): TreeNodeData | null => {
        if (visited.has(personId)) return null; // guards against cycles
        if (depth > FAN_MAX_GEN) return null;     // bound fan/pedigree depth for readability
        visited.add(personId);
        const person = personMap.get(personId);
        if (!person) return null;
        const parentIds = parentsMap.get(personId) ?? [];
        const parents   = parentIds
          .map((id) => buildNode(id, depth + 1))
          .filter((c): c is TreeNodeData => c !== null);
        return { ...person, _children: parents.length > 0 ? parents : undefined };
      };

      const rootData = buildNode(rootPersonId, 0);
      if (!rootData) return null;
      return d3.hierarchy(rootData, (d) => d._children);
    }, [persons, relationships, rootPersonId]);

    const buildDescendantHierarchy = useCallback((): d3.HierarchyNode<TreeNodeData> | null => {
      const personMap   = new Map(persons.map((p) => [p.id, p]));
      const childrenMap = buildChildrenMap(relationships);

      const root = personMap.get(rootPersonId);
      if (!root) return null;

      const visited = new Set<string>();

      const buildNode = (personId: string): TreeNodeData | null => {
        if (visited.has(personId)) return null;
        visited.add(personId);
        const person = personMap.get(personId);
        if (!person) return null;
        const childIds = childrenMap.get(personId) ?? [];
        const children  = childIds
          .map((id) => buildNode(id))
          .filter((c): c is TreeNodeData => c !== null);
        return { ...person, _children: children.length > 0 ? children : undefined };
      };

      const rootData = buildNode(rootPersonId);
      if (!rootData) return null;
      return d3.hierarchy(rootData, (d) => d._children);
    }, [persons, relationships, rootPersonId]);

    // ── Card renderer (shared by pedigree + descendants — both use the
    //    rectangular d3.tree() layout, just walking different edges) ─────────

    const renderCardLayout = useCallback(
      (
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        hierarchy: d3.HierarchyNode<TreeNodeData>,
        direction: 'up' | 'down',
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
      ) => {
        const { width, height } = dimensions;

        const treeLayout = d3
          .tree<TreeNodeData>()
          .nodeSize([NODE_W + SIB_GAP, NODE_H + GEN_GAP])
          .separation((a, b) => (a.parent === b.parent ? 1 : 1.4));

        const treeData = treeLayout(hierarchy);
        const nodes     = treeData.descendants();
        const links     = treeData.links();

        // For descendants, flip Y so generations grow downward visually in the
        // same direction a viewer expects ("root at top, children below");
        // d3.tree() naturally grows the hierarchy away from the root in +y,
        // which already matches "down" — for "up" (ancestors) we negate y so
        // the root sits at the bottom and ancestors fan upward above it.
        const ySign = direction === 'up' ? -1 : 1;

        const rootNode = nodes[0];
        if (rootNode) {
          const initial = d3.zoomIdentity.translate(
            width / 2 - (rootNode.x ?? 0),
            (direction === 'up' ? (height * 2) / 3 : height / 3) - (rootNode.y ?? 0) * ySign,
          );
          svg.call(zoom.transform, initial);
        }

        const linkGen = d3
          .linkVertical<d3.HierarchyLink<TreeNodeData>, { x: number; y: number }>()
          .x((d) => d.x)
          .y((d) => d.y);

        g.selectAll('.link')
          .data(links)
          .join('path')
          .attr('class', 'link')
          .attr('fill', 'none')
          .attr('stroke', 'var(--border-strong)')
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.6)
          .attr('d', (d) =>
            linkGen({
              source: { x: d.source.x ?? 0, y: ((d.source.y ?? 0) + (NODE_H / 2) * ySign) * ySign },
              target: { x: d.target.x ?? 0, y: ((d.target.y ?? 0) - (NODE_H / 2) * ySign) * ySign },
            }),
          );

        const node = g
          .selectAll<SVGGElement, d3.HierarchyPointNode<TreeNodeData>>('.node')
          .data(nodes as d3.HierarchyPointNode<TreeNodeData>[])
          .join('g')
          .attr('class', (d) => `node tree-node${d.data.id === selectedPersonId ? ' selected' : ''}`)
          .attr('transform', (d) => `translate(${d.x ?? 0},${(d.y ?? 0) * ySign})`)
          .style('cursor', 'pointer')
          .attr('tabindex', 0)
          .attr('role', 'button')
          .attr('aria-label', (d) => `${shortName(d.data)}, ${dateLabel(d.data)}${d.data.id === selectedPersonId ? ' (selected)' : ''}`)
          .on('click', (_event, d) => onSelectPerson(d.data.id))
          .on('keydown', (event: KeyboardEvent, d) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelectPerson(d.data.id);
            }
          })
          .on('focus', function () {
            d3.select(this).style('outline', '2px solid var(--accent-ember)').style('outline-offset', '2px');
          })
          .on('blur', function () {
            d3.select(this).style('outline', 'none');
          });

        node
          .append('rect')
          .attr('x', -NODE_W / 2)
          .attr('y', -NODE_H / 2)
          .attr('width', NODE_W)
          .attr('height', NODE_H)
          .attr('rx', 8)
          .attr('ry', 8)
          .attr('fill', (d) => (d.data.id === selectedPersonId ? 'var(--accent-ember-soft)' : 'var(--bg-surface)'))
          .attr('stroke', (d) => (d.data.id === selectedPersonId ? 'var(--accent-ember)' : 'var(--border-default)'))
          .attr('stroke-width', (d) => (d.data.id === selectedPersonId ? 2 : 1))
          .style('filter', 'drop-shadow(0 2px 6px rgba(0,0,0,0.08))');

        node
          .append('rect')
          .attr('x', -NODE_W / 2)
          .attr('y', -NODE_H / 2)
          .attr('width', 4)
          .attr('height', NODE_H)
          .attr('rx', 8)
          .attr('fill', (d) => sexColor(d.data.sex));

        node
          .append('text')
          .attr('y', -8)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'var(--font-body)')
          .attr('font-size', '12px')
          .attr('font-weight', '500')
          .attr('fill', 'var(--text-primary)')
          .text((d) => shortName(d.data));

        node
          .append('text')
          .attr('y', 10)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'var(--font-mono)')
          .attr('font-size', '10px')
          .attr('fill', 'var(--text-muted)')
          .text((d) => dateLabel(d.data));

        node
          .append('circle')
          .attr('cx', NODE_W / 2 - 10)
          .attr('cy', -NODE_H / 2 + 10)
          .attr('r', 4)
          .attr('fill', (d) => qualityColor(d.data.dataQualityScore))
          .append('title')
          .text((d) => `Data quality: ${d.data.dataQualityScore}%`);

        // "Add parent" affordance only makes sense on the ancestor (pedigree)
        // view, on leaf nodes that have no recorded parents yet.
        if (onAddParent && direction === 'up') {
          const leaves = node.filter((d) => !d.children);

          leaves
            .append('g')
            .attr('class', 'add-btn')
            .attr('transform', `translate(0, ${(NODE_H / 2 + 26) * ySign})`)
            // Always at least partially visible rather than purely
            // hover-gated (audit finding U2): touch devices have no hover
            // event, so a button that only reveals itself on mouseenter is
            // not just hard to tap, it's never shown at all on mobile.
            .style('opacity', 0.55)
            .style('cursor', 'pointer')
            .call((btn) => {
              btn.append('circle')
                // r=22 gives a 44px-diameter hit area, the commonly cited
                // minimum comfortable touch target (was r=10 / 20px).
                .attr('r', 22)
                .attr('fill', 'var(--accent-ember)')
                .attr('stroke', 'var(--bg-surface)')
                .attr('stroke-width', 2);
              btn.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .attr('font-size', '20px')
                .attr('fill', 'white')
                .attr('style', 'pointer-events: none')
                .text('+');
              btn.on('click', (event: MouseEvent, d) => {
                event.stopPropagation();
                onAddParent(d.data.id);
              });
            });

          leaves
            .on('mouseenter', function () {
              d3.select(this).select('.add-btn').style('opacity', 1);
            })
            .on('mouseleave', function () {
              d3.select(this).select('.add-btn').style('opacity', 0.55);
            });
        }
      },
      [dimensions, selectedPersonId, onSelectPerson, onAddParent],
    );

    // ── Fan chart renderer (radial — classic genealogy sunburst) ─────────────
    //
    // The root sits at the center; each generation of ancestors occupies a
    // wider ring outward. Each person's angular slice is split evenly between
    // their own parents, so the chart self-balances regardless of how many
    // ancestors are known at each generation.

    const renderFanLayout = useCallback(
      (
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        hierarchy: d3.HierarchyNode<TreeNodeData>,
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
      ) => {
        const { width, height } = dimensions;
        const maxDepth = hierarchy.height || 1;
        const outerRadius = Math.min((maxDepth + 1) * FAN_RING_DEPTH, Math.min(width, height) * 0.8);

        // Center the fan in the viewport (not translated to a "root node"
        // position the way the card layouts are, since the root here is a
        // single point, not a box at a tree-layout coordinate).
        const initial = d3.zoomIdentity.translate(width / 2, height / 2);
        svg.call(zoom.transform, initial);

        // Each node gets an angular span: root = full circle (we render it as
        // a half-circle fan, the conventional orientation — ancestors fan
        // upward in a 180° arc above the root), split evenly among children
        // (i.e. among that person's own parents) at the next ring out.
        const partition = d3
          .partition<TreeNodeData>()
          .size([Math.PI, outerRadius]) // angle: 0..PI (half circle), radius: 0..outerRadius
          .padding(0);

        // d3.partition expects a hierarchy with `value`s summed bottom-up for
        // proportional sizing; for a fan chart we want EQUAL angular width
        // per sibling at each ring, not value-weighted, so give every node
        // value=1 and let partition's default behavior (sum of leaf counts)
        // produce equal splits naturally for a binary parent tree.
        const sized = hierarchy.sum(() => 1);
        const root  = partition(sized);

        const arcGen = d3
          .arc<d3.HierarchyRectangularNode<TreeNodeData>>()
          .startAngle((d) => d.x0 - Math.PI / 2)
          .endAngle((d) => d.x1 - Math.PI / 2)
          .innerRadius((d) => d.y0)
          .outerRadius((d) => d.y1 - 2)
          .padAngle(0.004)
          .padRadius(outerRadius / (maxDepth + 1));

        const allNodes = root.descendants() as d3.HierarchyRectangularNode<TreeNodeData>[];

        const arcs = g
          .selectAll('.fan-arc')
          .data(allNodes)
          .join('path')
          .attr('class', (d) => `fan-arc tree-node${d.data.id === selectedPersonId ? ' selected' : ''}`)
          .attr('d', arcGen)
          .attr('fill', (d) => (d.data.id === selectedPersonId ? 'var(--accent-ember-soft)' : 'var(--bg-surface)'))
          .attr('stroke', (d) => (d.data.id === selectedPersonId ? 'var(--accent-ember)' : 'var(--border-default)'))
          .attr('stroke-width', (d) => (d.data.id === selectedPersonId ? 2 : 1))
          .style('cursor', 'pointer')
          .style('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.06))')
          .attr('tabindex', 0)
          .attr('role', 'button')
          .attr('aria-label', (d) => `${shortName(d.data)}, ${dateLabel(d.data)}${d.data.id === selectedPersonId ? ' (selected)' : ''}`)
          .on('click', (_event, d) => onSelectPerson(d.data.id))
          .on('keydown', (event: KeyboardEvent, d) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelectPerson(d.data.id);
            }
          })
          .on('focus', function () {
            d3.select(this).style('outline', '2px solid var(--accent-ember)').style('outline-offset', '1px');
          })
          .on('blur', function () {
            d3.select(this).style('outline', 'none');
          });

        arcs.append('title').text((d) => `${shortName(d.data)} — ${dateLabel(d.data)}`);

        // Sex-coded thin arc at the outer edge of each wedge.
        const sexArcGen = d3
          .arc<d3.HierarchyRectangularNode<TreeNodeData>>()
          .startAngle((d) => d.x0 - Math.PI / 2)
          .endAngle((d) => d.x1 - Math.PI / 2)
          .innerRadius((d) => d.y1 - 6)
          .outerRadius((d) => d.y1 - 2);

        g.selectAll('.fan-sex-arc')
          .data(allNodes)
          .join('path')
          .attr('class', 'fan-sex-arc')
          .attr('d', sexArcGen)
          .attr('fill', (d) => sexColor(d.data.sex))
          .style('pointer-events', 'none');

        // Labels: rotate text to follow the arc's mid-angle so names read
        // outward from the center, the standard fan-chart convention. Skip
        // labels on wedges too thin to hold readable text.
        g.selectAll('.fan-label')
          .data(allNodes.filter((d) => d.y1 - d.y0 > 18 && d.x1 - d.x0 > 0.04))
          .join('text')
          .attr('class', 'fan-label')
          .attr('transform', (d) => {
            const midAngle = (d.x0 + d.x1) / 2 - Math.PI / 2;
            const midRadius = (d.y0 + d.y1) / 2;
            const deg = (midAngle * 180) / Math.PI;
            // Flip text on the left half so it isn't upside-down.
            const flip = deg > 90 || deg < -90;
            return `rotate(${deg + (flip ? 180 : 0)}) translate(${midRadius * (flip ? -1 : 1)},0)`;
          })
          .attr('text-anchor', 'middle')
          .attr('dy', '-2')
          .attr('font-family', 'var(--font-body)')
          .attr('font-size', (d) => (d.depth === 0 ? '13px' : '10px'))
          .attr('font-weight', (d) => (d.depth === 0 ? '600' : '500'))
          .attr('fill', 'var(--text-primary)')
          .style('pointer-events', 'none')
          .text((d) => shortName(d.data, d.depth === 0 ? 24 : 14));

        // Generation ring guides (subtle) for visual orientation.
        for (let gen = 1; gen <= maxDepth; gen++) {
          g.append('circle')
            .attr('class', 'fan-ring-guide')
            .attr('r', gen * FAN_RING_DEPTH)
            .attr('fill', 'none')
            .attr('stroke', 'var(--border-subtle)')
            .attr('stroke-width', 0.5)
            .attr('stroke-dasharray', '2,3')
            .style('pointer-events', 'none');
        }
      },
      [dimensions, selectedPersonId, onSelectPerson],
    );

    // ── Main render effect ────────────────────────────────────────────────────

    useEffect(() => {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      if (!svgRef.current) return;

      const { width, height } = dimensions;

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 4])
        .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
          g.attr('transform', event.transform.toString());
        });

      zoomRef.current = zoom;

      svg.attr('width', width).attr('height', height).call(zoom).on('dblclick.zoom', null);

      const g = svg.append('g');

      if (viewMode === 'descendants') {
        const hierarchy = buildDescendantHierarchy();
        if (hierarchy) renderCardLayout(g, hierarchy, 'down', svg, zoom);
      } else if (viewMode === 'fan') {
        const hierarchy = buildAncestorHierarchy();
        if (hierarchy) renderFanLayout(g, hierarchy, svg, zoom);
      } else {
        const hierarchy = buildAncestorHierarchy();
        if (hierarchy) renderCardLayout(g, hierarchy, 'up', svg, zoom);
      }
    }, [
      viewMode,
      dimensions,
      buildAncestorHierarchy,
      buildDescendantHierarchy,
      renderCardLayout,
      renderFanLayout,
    ]);

    // ── Resize observer ───────────────────────────────────────────────────────

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
        }
      });
      observer.observe(container);
      return () => observer.disconnect();
    }, []);

    return (
      <div ref={containerRef} className={`relative overflow-hidden ${className ?? ''}`}>
        <svg
          ref={svgRef}
          className="tree-canvas"
          style={{ width: '100%', height: '100%' }}
          aria-label={`Family tree, ${viewMode} view. ${persons.length} people. Press Tab to move between people, Enter to select.`}
          role="application"
        />

        {/* Screen-reader fallback list (audit finding U1): the SVG nodes
            above are individually focusable with role="button" and proper
            labels, but that support varies across browser/assistive-tech
            combinations for deeply nested SVG content. This is the same
            native <button> list pattern used everywhere else on the web,
            so it works identically regardless of how well a given screen
            reader handles the chart itself. Visually hidden, not removed
            from the accessibility tree. */}
        <ul className="sr-only">
          {persons.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onSelectPerson(p.id)}>
                {shortName(p)}, {dateLabel(p)}
              </button>
            </li>
          ))}
        </ul>

        {/* Legend */}
        <div
          className="absolute bottom-4 left-4 flex items-center gap-4 rounded-lg px-3 py-2 text-xs"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-1 rounded-full bg-blue-400" />
            <span style={{ color: 'var(--text-muted)' }}>Male</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-1 rounded-full bg-purple-400" />
            <span style={{ color: 'var(--text-muted)' }}>Female</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-600" />
            <span style={{ color: 'var(--text-muted)' }}>Good data</span>
          </div>
        </div>
      </div>
    );
  },
);
