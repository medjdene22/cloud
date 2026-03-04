"use client";

import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { CloudNode, type CloudNodeData } from "./cloud-node";
import { GroupNode, type GroupNodeData } from "./group-node";
import { ComponentPalette } from "./component-palette";
import { Toolbar } from "./toolbar";
import { NodeInspector } from "./node-inspector";
import type { CloudComponent } from "@/lib/cloud-components";
import { validateConnection } from "@/lib/connection-rules";

const nodeTypes = {
  cloudNode: CloudNode,
  groupNode: GroupNode,
};

const defaultEdgeOptions = {
  type: "smoothstep",
  animated: true,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: "#6b6b7b",
  },
  style: {
    strokeWidth: 2,
    stroke: "#6b6b7b",
  },
};

let nodeIdCounter = 0;
const getNodeId = () => `node_${++nodeIdCounter}`;

export function ArchitectureCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success";
  } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedNode = nodes.find((n) => n.selected);

  const showToast = useCallback(
    (message: string, type: "error" | "success") => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      setToast({ message, type });
      toastTimeout.current = setTimeout(() => setToast(null), 3000);
    },
    []
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;
      const result = validateConnection(sourceNode, targetNode, edges);
      return result.isValid;
    },
    [nodes, edges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (!sourceNode || !targetNode) return;

      const validation = validateConnection(sourceNode, targetNode, edges);

      if (!validation.isValid) {
        showToast(validation.reason, "error");
        return;
      }

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color: "#6b6b7b",
            },
            style: {
              strokeWidth: 2,
              stroke: "#6b6b7b",
            },
          },
          eds
        )
      );

      showToast(
        `Connected ${(sourceNode.data as CloudNodeData).label} to ${(targetNode.data as CloudNodeData).label}`,
        "success"
      );
    },
    [setEdges, nodes, edges, showToast]
  );

  const addComponentToCanvas = useCallback(
    (component: CloudComponent, position: { x: number; y: number }) => {
      if (component.isGroup) {
        // Group node (VPC / Subnet)
        const dimensions =
          component.groupType === "vpc"
            ? { width: 600, height: 400 }
            : { width: 320, height: 240 };

        const newNode: Node = {
          id: getNodeId(),
          type: "groupNode",
          position,
          style: {
            width: dimensions.width,
            height: dimensions.height,
          },
          data: {
            label: component.label,
            description: component.description,
            color: component.color,
            icon: component.icon,
            provider: component.provider,
            category: component.category,
            groupType: component.groupType,
          } as GroupNodeData,
        };

        setNodes((nds) => [...nds, newNode]);
      } else {
        // Regular node -- check if dropped inside a group
        const newNodeId = getNodeId();

        setNodes((nds) => {
          // Find group nodes that contain this position
          const parentGroup = [...nds]
            .filter((n) => n.type === "groupNode")
            .reverse() // prefer smaller (inner) groups first
            .find((group) => {
              const gw = (group.style?.width as number) || 600;
              const gh = (group.style?.height as number) || 400;
              return (
                position.x > group.position.x &&
                position.x < group.position.x + gw &&
                position.y > group.position.y &&
                position.y < group.position.y + gh
              );
            });

          const newNode: Node = {
            id: newNodeId,
            type: "cloudNode",
            position: parentGroup
              ? {
                  x: position.x - parentGroup.position.x,
                  y: position.y - parentGroup.position.y,
                }
              : position,
            data: {
              label: component.label,
              description: component.description,
              color: component.color,
              icon: component.icon,
              provider: component.provider,
              category: component.category,
            } as CloudNodeData,
            ...(parentGroup ? { parentId: parentGroup.id, extent: "parent" as const } : {}),
          };

          return [...nds, newNode];
        });
      }
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const data = event.dataTransfer.getData("application/cloud-component");
      if (!data) return;

      const component: CloudComponent = JSON.parse(data);

      if (!reactFlowInstance.current) return;

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addComponentToCanvas(component, position);
    },
    [addComponentToCanvas]
  );

  const onClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    nodeIdCounter = 0;
  }, [setNodes, setEdges]);

  const onDeleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) =>
      eds.filter((e) => {
        const sourceSelected = nodes.find(
          (n) => n.id === e.source && n.selected
        );
        const targetSelected = nodes.find(
          (n) => n.id === e.target && n.selected
        );
        return !sourceSelected && !targetSelected && !e.selected;
      })
    );
  }, [setNodes, setEdges, nodes]);

  const onUpdateNodeLabel = useCallback(
    (nodeId: string, label: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
        )
      );
    },
    [setNodes]
  );

  return (
    <div className="flex h-screen w-full bg-background">
      <ComponentPalette onAddNode={addComponentToCanvas} />

      <div className="flex-1 flex flex-col">
        <Toolbar
          nodeCount={nodes.length}
          edgeCount={edges.length}
          nodes={nodes}
          edges={edges}
          onClearCanvas={onClearCanvas}
          onDeleteSelected={onDeleteSelected}
          hasSelection={nodes.some((n) => n.selected) || edges.some((e) => e.selected)}
          canvasRef={reactFlowWrapper}
        />

        <div
          className="flex-1 relative"
          ref={reactFlowWrapper}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onInit={(instance) => {
              reactFlowInstance.current = instance;
            }}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode={["Backspace", "Delete"]}
            className="bg-canvas"
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--canvas-dots)"
            />
            <Controls
              position="bottom-right"
              showInteractive={false}
            />
            <MiniMap
              position="bottom-left"
              nodeColor={(n) => {
                const data = n.data as CloudNodeData | GroupNodeData;
                return data?.color || "#6b7280";
              }}
              maskColor="rgba(10, 10, 15, 0.7)"
              style={{
                width: 160,
                height: 100,
              }}
            />

            {/* Empty state */}
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="flex flex-col items-center justify-center mt-48 text-muted-foreground select-none">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Start building your architecture
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm leading-relaxed">
                    Drag cloud components from the sidebar onto the canvas, then connect them to design your system.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[10px] font-mono">
                        Drag
                      </kbd>
                      Add components
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[10px] font-mono">
                        Click + Drag
                      </kbd>
                      Connect nodes
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[10px] font-mono">
                        Del
                      </kbd>
                      Remove
                    </span>
                  </div>
                </div>
              </Panel>
            )}
          </ReactFlow>

          {/* Connection validation toast */}
          {toast && (
            <div
              className={`
                absolute bottom-6 left-1/2 -translate-x-1/2 z-50
                flex items-center gap-2 px-4 py-2.5 rounded-lg
                text-sm font-medium shadow-lg border
                animate-in fade-in slide-in-from-bottom-2 duration-200
                ${
                  toast.type === "error"
                    ? "bg-destructive/10 border-destructive/30 text-destructive-foreground"
                    : "bg-primary/10 border-primary/30 text-primary"
                }
              `}
            >
              {toast.type === "error" ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              {toast.message}
            </div>
          )}
        </div>
      </div>

      {/* Inspector Panel */}
      {selectedNode && (
        <NodeInspector
          node={selectedNode}
          onUpdateLabel={onUpdateNodeLabel}
          onClose={() =>
            setNodes((nds) =>
              nds.map((n) => ({ ...n, selected: false }))
            )
          }
        />
      )}
    </div>
  );
}
