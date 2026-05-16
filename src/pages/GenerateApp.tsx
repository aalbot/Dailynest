import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/BackButton";
import { firebase } from "@/lib/firebase";
import "./GenerateApp.css";

const DEFAULT_PROMPT = `Create a modern Employee Attendance Management System using the selected employees and attendance nodes.

Features:
- Employee login
- Attendance check-in/check-out
- Attendance analytics dashboard
- Leave management
- Admin reports
- Mobile responsive UI
- Use dark modern UI with glassmorphism`;

const SUGGESTIONS = [
  {
    title: "Attendance Management",
    sub: "AI generates employee attendance tracking, leave reports and analytics dashboard.",
    prompt: DEFAULT_PROMPT,
  },
  {
    title: "CRM Dashboard",
    sub: "Generate customer management system with sales reports and activities.",
    prompt:
      "Create a CRM dashboard using the selected Firebase nodes with customer profiles, sales pipeline, activity timeline, and admin analytics.",
  },
  {
    title: "E-Commerce Admin",
    sub: "AI creates product, orders and delivery management platform.",
    prompt:
      "Build an e-commerce admin panel with product catalog, order management, delivery tracking, and revenue analytics using the selected nodes.",
  },
  {
    title: "Delivery Tracking",
    sub: "Build live delivery tracking and rider management application.",
    prompt:
      "Generate a delivery tracking app with live rider status, route optimization, order assignments, and customer notifications.",
  },
];

const SAMPLE_CODE = `const employees = firebase.firestore().collection('employees');

employees.get().then((snapshot) => {
  snapshot.forEach((doc) => {
    console.log(doc.data());
  });
});

const attendance = firebase.firestore()
  .collection('employees')
  .doc(employeeId)
  .collection('attendance');

function checkIn() {
  attendance.add({
    status: "present",
    checkin: new Date()
  });
}`;

interface TreeNode {
  key: string;
  path: string;
  children: TreeNode[];
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function buildTreeFromData(data: Record<string, unknown>, parentPath = ""): TreeNode[] {
  return Object.keys(data).map((key) => {
    const path = parentPath ? `${parentPath}/${key}` : key;
    const value = data[key];
    const children = isObjectRecord(value) ? buildTreeFromData(value, path) : [];
    return { key, path, children };
  });
}

function nodeMatchesSearch(node: TreeNode, term: string): boolean {
  if (!term) return true;
  const lower = term.toLowerCase();
  if (node.key.toLowerCase().includes(lower) || node.path.toLowerCase().includes(lower)) {
    return true;
  }
  return node.children.some((child) => nodeMatchesSearch(child, term));
}

interface FirebaseNodeItemProps {
  node: TreeNode;
  level: number;
  selectedNodes: Set<string>;
  expandedPaths: Set<string>;
  searchTerm: string;
  onToggleSelect: (path: string) => void;
  onToggleExpand: (path: string) => void;
}

const FirebaseNodeItem: React.FC<FirebaseNodeItemProps> = ({
  node,
  level,
  selectedNodes,
  expandedPaths,
  searchTerm,
  onToggleSelect,
  onToggleExpand,
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedNodes.has(node.path);
  const visibleChildren = searchTerm
    ? node.children.filter((child) => nodeMatchesSearch(child, searchTerm))
    : node.children;

  if (searchTerm && !nodeMatchesSearch(node, searchTerm)) {
    return null;
  }

  return (
    <>
      <div
        className={`generate-app-node ${isSelected ? "active" : ""}`}
        style={{ marginLeft: level * 20 }}
      >
        <div
          role="checkbox"
          aria-checked={isSelected}
          className={`generate-app-checkbox ${isSelected ? "" : "unchecked"}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(node.path);
          }}
        />
        <div className="generate-app-folder">📁</div>
        <span>{node.key}</span>
        {hasChildren ? (
          <div
            className="generate-app-arrow"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.path);
            }}
          >
            {isExpanded ? "⌄" : "›"}
          </div>
        ) : (
          <div className="generate-app-arrow" style={{ visibility: "hidden" }}>
            ›
          </div>
        )}
      </div>
      {hasChildren &&
        isExpanded &&
        visibleChildren.map((child) => (
          <FirebaseNodeItem
            key={child.path}
            node={child}
            level={level + 1}
            selectedNodes={selectedNodes}
            expandedPaths={expandedPaths}
            searchTerm={searchTerm}
            onToggleSelect={onToggleSelect}
            onToggleExpand={onToggleExpand}
          />
        ))}
    </>
  );
};

const GenerateApp: React.FC = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);

  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [showPreview, setShowPreview] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2>(1);

  useEffect(() => {
    const role = sessionStorage.getItem("user_role");
    if (role !== "superadmin") {
      toast.error("Unauthorized Access: Superadmin clearance required.");
      navigate("/apps");
    }
  }, [navigate]);

  useEffect(() => {
    const rootRef = firebase.database().ref();
    const onValue = (snapshot: firebase.database.DataSnapshot) => {
      const val = snapshot.val();
      if (val && isObjectRecord(val)) {
        setTreeNodes(buildTreeFromData(val));
      } else {
        setTreeNodes([]);
      }
    };
    rootRef.on("value", onValue);
    return () => rootRef.off("value", onValue);
  }, []);

  const toggleSelection = useCallback((path: string) => {
    setSelectedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const selectedList = useMemo(() => Array.from(selectedNodes), [selectedNodes]);

  const handleShowPreview = () => {
    setShowPreview(true);
    setActiveStep(2);
    requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const generatedCode = useMemo(() => {
    if (selectedList.length === 0) return SAMPLE_CODE;
    const refs = selectedList
      .map((path) => `const ${path.replace(/\//g, "_")}Ref = firebase.database().ref('${path}');`)
      .join("\n");
    return `${refs}\n\n${SAMPLE_CODE}`;
  }, [selectedList]);

  return (
    <div className="min-h-screen bg-[#060816]">
      <Navbar />
      <div className="flex items-center px-4 pt-2">
        <BackButton />
        <h1 className="text-lg font-semibold text-white">Generate App</h1>
      </div>

      <div className="generate-app-page">
        <div className="generate-app-container">
          <div className="generate-app-main-card">
            <div className="generate-app-steps">
              <div className={`generate-app-step ${activeStep === 1 ? "active" : ""}`}>
                <div className="generate-app-step-number">1</div>
                <div>
                  <div style={{ fontWeight: 600 }}>Select Nodes & Prompt</div>
                  <div style={{ fontSize: 14, color: "#aeb3c9" }}>
                    Choose Firebase data & describe app
                  </div>
                </div>
              </div>
              <div className={`generate-app-step ${activeStep === 2 ? "active" : ""}`}>
                <div className="generate-app-step-number">2</div>
                <div>
                  <div style={{ fontWeight: 600 }}>Preview & Generate</div>
                  <div style={{ fontSize: 14, color: "#aeb3c9" }}>
                    See live preview & source code
                  </div>
                </div>
              </div>
            </div>

            <div className="generate-app-layout">
              <div className="generate-app-panel">
                <div className="generate-app-panel-title">Firebase Nodes</div>
                <div className="generate-app-panel-sub">
                  Select the Firebase collections/nodes you want AI to use while generating your app.
                </div>
                <input
                  className="generate-app-search-box"
                  placeholder="Search Firebase nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="generate-app-nodes">
                  {treeNodes.map((node) => (
                    <FirebaseNodeItem
                      key={node.path}
                      node={node}
                      level={0}
                      selectedNodes={selectedNodes}
                      expandedPaths={expandedPaths}
                      searchTerm={searchTerm}
                      onToggleSelect={toggleSelection}
                      onToggleExpand={toggleExpand}
                    />
                  ))}
                </div>
                <div className="generate-app-selected">
                  {selectedList.length === 0 ? (
                    <span style={{ color: "#6b7280", fontSize: 14 }}>No nodes selected</span>
                  ) : (
                    selectedList.map((path) => (
                      <div key={path} className="generate-app-tag">
                        {path}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="generate-app-panel generate-app-prompt-area">
                <div className="generate-app-panel-title">Describe Your App</div>
                <div className="generate-app-panel-sub">
                  Tell AI what type of app you want to generate using the selected Firebase nodes.
                </div>
                <textarea
                  className="generate-app-textarea"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <div className="generate-app-ai-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      className="generate-app-suggestion"
                      onClick={() => setPrompt(s.prompt)}
                    >
                      <div className="generate-app-suggestion-title">{s.title}</div>
                      <div className="generate-app-suggestion-sub">{s.sub}</div>
                    </button>
                  ))}
                </div>
                <div className="generate-app-action-bar">
                  <button type="button" className="generate-app-secondary-btn">
                    Generate Prompt
                  </button>
                  <button type="button" className="generate-app-primary-btn" onClick={handleShowPreview}>
                    Generate App Preview
                  </button>
                </div>
              </div>
            </div>

            {showPreview && (
              <div className="generate-app-preview-section" ref={previewRef}>
                <div className="generate-app-preview-header">
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>Generated App Preview</div>
                    <div style={{ color: "#aeb3c9", marginTop: 8 }}>
                      AI generated app UI + Firebase integration code preview
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 15 }}>
                    <button type="button" className="generate-app-glass-btn">
                      Add To App Grid
                    </button>
                    <button type="button" className="generate-app-primary-btn">
                      Deploy App
                    </button>
                  </div>
                </div>

                <div className="generate-app-preview-card">
                  <div className="generate-app-preview-panels">
                    <div className="generate-app-device-panel desktop">
                      <div className="generate-app-device-header">
                        <div>
                          <div className="generate-app-frame-title">Desktop Preview</div>
                          <div className="generate-app-frame-status">Dashboard Overview</div>
                        </div>
                        <div className="generate-app-device-chip">Desktop</div>
                      </div>
                      <div className="generate-app-device-frame">
                        <div className="generate-app-frame-header">
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>
                            Attendance Analytics
                          </div>
                          <div style={{ color: "#475569", fontSize: 12 }}>Live data sync</div>
                        </div>
                        <div className="generate-app-frame-content">
                          <div className="generate-app-metric-row">
                            <div className="generate-app-metric-card">
                              <span className="generate-app-metric-label">Today&apos;s Present</span>
                              <span>96</span>
                            </div>
                            <div className="generate-app-metric-card">
                              <span className="generate-app-metric-label">Today&apos;s Absent</span>
                              <span>14</span>
                            </div>
                            <div className="generate-app-metric-card">
                              <span className="generate-app-metric-label">Pending Leaves</span>
                              <span>8</span>
                            </div>
                          </div>
                          <div className="generate-app-summary-list">
                            <div className="generate-app-summary-item">
                              <strong>Sales Team</strong>
                              <span>87% on time</span>
                            </div>
                            <div className="generate-app-summary-item">
                              <strong>Support Team</strong>
                              <span>92% on time</span>
                            </div>
                            <div className="generate-app-summary-item">
                              <strong>Product Team</strong>
                              <span>75% on time</span>
                            </div>
                          </div>
                        </div>
                        <div className="generate-app-device-bottom">
                          Modern attendance insights and employee status summary with a clean desktop layout.
                        </div>
                      </div>
                    </div>

                    <div className="generate-app-device-panel">
                      <div className="generate-app-device-header">
                        <div>
                          <div className="generate-app-frame-title">Tablet Preview</div>
                          <div className="generate-app-frame-status">Manager View</div>
                        </div>
                        <div className="generate-app-device-chip">Tablet</div>
                      </div>
                      <div className="generate-app-device-frame">
                        <div className="generate-app-frame-header">
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Team Summary</div>
                          <div style={{ color: "#475569", fontSize: 12 }}>Quick actions</div>
                        </div>
                        <div className="generate-app-frame-content">
                          <div className="generate-app-metric-row">
                            <div className="generate-app-metric-card">
                              <span className="generate-app-metric-label">Check-ins</span>
                              <span>264</span>
                            </div>
                            <div className="generate-app-metric-card">
                              <span className="generate-app-metric-label">Late arrivals</span>
                              <span>12</span>
                            </div>
                          </div>
                          <div className="generate-app-summary-list">
                            <div className="generate-app-summary-item">
                              <strong>Approve Leaves</strong>
                              <span>4 pending</span>
                            </div>
                            <div className="generate-app-summary-item">
                              <strong>Daily Report</strong>
                              <span>Ready</span>
                            </div>
                          </div>
                        </div>
                        <div className="generate-app-device-bottom">
                          Designed for tablet workflows with actionable badges and clean navigation.
                        </div>
                      </div>
                    </div>

                    <div className="generate-app-device-panel">
                      <div className="generate-app-device-header">
                        <div>
                          <div className="generate-app-frame-title">Mobile Preview</div>
                          <div className="generate-app-frame-status">On-the-go</div>
                        </div>
                        <div className="generate-app-device-chip">Mobile</div>
                      </div>
                      <div className="generate-app-device-frame">
                        <div className="generate-app-frame-header">
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Today</div>
                          <div style={{ color: "#475569", fontSize: 12 }}>Swipe to check</div>
                        </div>
                        <div className="generate-app-frame-content">
                          <div className="generate-app-metric-row">
                            <div className="generate-app-metric-card">
                              <span className="generate-app-metric-label">In</span>
                              <span>96</span>
                            </div>
                            <div className="generate-app-metric-card">
                              <span className="generate-app-metric-label">Out</span>
                              <span>72</span>
                            </div>
                          </div>
                          <div className="generate-app-summary-list">
                            <div className="generate-app-summary-item">
                              <strong>John Doe</strong>
                              <span>Present</span>
                            </div>
                            <div className="generate-app-summary-item">
                              <strong>Michael</strong>
                              <span>Absent</span>
                            </div>
                          </div>
                        </div>
                        <div className="generate-app-device-bottom">
                          Compact mobile view for quick attendance snapshots on the go.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="generate-app-code-preview">
                    <pre>{generatedCode}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateApp;
