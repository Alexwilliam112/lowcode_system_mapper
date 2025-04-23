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
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
} from "d3-force";

import "@xyflow/react/dist/style.css";

const applyForceLayout = (nodes, edges) => {
  if (!nodes || !edges) {
    console.error("Nodes or edges are undefined:", { nodes, edges });
    return { nodes: [], edges: [] };
  }

  // Deep clone to avoid mutating original state
  const simNodes = nodes.map((n) => ({ ...n }));
  const simEdges = edges.map((e) => ({ ...e }));

  const simulation = forceSimulation(simNodes)
    .force("charge", forceManyBody().strength(-500))
    .force(
      "link",
      forceLink(simEdges)
        .id((d) => d.id)
        .distance(200)
    )
    .force("center", forceCenter(0, 0))
    .stop();

  // Run simulation for layout
  for (let i = 0; i < 300; i++) simulation.tick();

  const updatedNodes = simNodes.map((node) => ({
    ...node,
    position: { x: node.x || 0, y: node.y || 0 },
  }));

  return { nodes: updatedNodes, edges };
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
        type: "default", // Optional but helpful
        data: node.data || { label: node.id },
        position: { x: 0, y: 0 },
      }));

      const transformedEdges = validEdges.map((edge, index) => ({
        id: edge.id || `e-${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: true,
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = applyForceLayout(
        transformedNodes,
        transformedEdges
      );

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
