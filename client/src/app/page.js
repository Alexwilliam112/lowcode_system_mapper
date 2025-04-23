"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Background,
  ReactFlow,
  addEdge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js"; // ✅ Use non-worker version
import "@xyflow/react/dist/style.css";

const elk = new ELK();

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
  const [selectedNodeId, setSelectedNodeId] = useState(null);

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
        style: {
          color: "black", // Set label color to black
          padding: "10px", // Add padding inside the node
          textAlign: "center", // Center-align the label
          overflow: "visible", // Allow text to overflow if necessary
          whiteSpace: "normal", // Allow text to wrap
          wordWrap: "break-word", // Break long words if necessary
          border: "1px solid #ccc", // Optional: Add a border for better visibility
          borderRadius: "5px", // Optional: Add rounded corners
        },
      }));
  
      const transformedEdges = validEdges.map((edge, index) => ({
        id: edge.id || `e-${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#222", strokeWidth: 1.5 }, // default style
      }));
  
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        await applyElkLayout(transformedNodes, transformedEdges);
  
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setSelectedNodeId(null); // reset selection on reload
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  // Highlight connected edges in red
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        const isConnected =
          edge.source === selectedNodeId || edge.target === selectedNodeId;
        return {
          ...edge,
          style: {
            stroke: isConnected ? "red" : "#222",
            strokeWidth: isConnected ? 2.5 : 1.5,
          },
        };
      })
    );
  }, [selectedNodeId, setEdges]);

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

  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        style={{ backgroundColor: "#F7F9FB" }}
      >
        <Panel position="top-right">
          <button onClick={fetchGraphData}>Reload Layout</button>
        </Panel>
        <Background />
      </ReactFlow>
    </div>
  );
};

export default function Page() {
  return <Flow />;
}
