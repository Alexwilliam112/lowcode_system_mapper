"use client";

import React, { useCallback, useEffect } from "react";
import {
  Background,
  ReactFlow,
  addEdge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js"; // ✅ Use bundled version (no worker)
import "@xyflow/react/dist/style.css";

// ELK layout engine instance
const elk = new ELK();

// Layout function using ELK
const applyElkLayout = async (nodes, edges) => {
  const elkNodes = nodes.map((node) => ({
    id: node.id,
    width: 180,
    height: 60,
  }));

  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const layout = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "elk.spacing.nodeNode": "60",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    },
    children: elkNodes,
    edges: elkEdges,
  });

  const positionedNodes = nodes.map((node) => {
    const layoutNode = layout.children.find((n) => n.id === node.id);
    return {
      ...node,
      position: {
        x: layoutNode?.x || 0,
        y: layoutNode?.y || 0,
      },
      targetPosition: "top",
      sourcePosition: "bottom",
    };
  });

  return { nodes: positionedNodes, edges };
};

const Flow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchGraphData = async () => {
    try {
      const response = await fetch(
        "https://api-oos.jojonomic.com/27407/rnd/system-mapper/get-flow"
      );
      const data = await response.json();

      if (!data.nodes || !data.edges) {
        console.error("Invalid API response:", data);
        return;
      }

      const nodeIds = new Set(data.nodes.map((node) => node.id));
      const validEdges = data.edges.filter(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );

      const transformedNodes = data.nodes.map((node) => ({
        id: node.id,
        type: "default",
        data: { label: node.data?.label || node.id },
        position: { x: 0, y: 0 },
      }));

      const transformedEdges = validEdges.map((edge, index) => ({
        id: edge.id || `e-${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: true,
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } =
        await applyElkLayout(transformedNodes, transformedEdges);

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          { ...params, type: ConnectionLineType.SmoothStep, animated: true },
          eds
        )
      ),
    []
  );

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        style={{ backgroundColor: "#F7F9FB" }}
      >
        <Panel position="top-right">
          <button onClick={() => fetchGraphData()}>Reload Layout</button>
        </Panel>
        <Background />
      </ReactFlow>
    </div>
  );
};

export default function Page() {
  return <Flow />;
}
