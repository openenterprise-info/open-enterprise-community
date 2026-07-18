import React, { useState, useEffect, useMemo } from "react";
import api from "../../utils/api";

const CATEGORIES = [
  { key: "Database",              label: "Databases"        },
  { key: "CRM & Sales",           label: "CRM & Sales"      },
  { key: "Email & Communication", label: "Email & Comms"    },
  { key: "Cloud Storage",         label: "Cloud Storage"    },
  { key: "Developer Tools",       label: "Developer Tools"  },
  { key: "Project Management",    label: "Project Mgmt"     },
  { key: "Marketing",             label: "Marketing"        },
  { key: "HR & Payroll",          label: "HR & Payroll"     },
  { key: "Finance & Accounting",  label: "Finance"          },
  { key: "E-commerce",            label: "E-commerce"       },
  { key: "Analytics",             label: "Analytics"        },
  { key: "Observability",         label: "Observability"    },
  { key: "AI & ML",               label: "AI & ML"          },
  { key: "Security & Identity",   label: "Security"         },
  { key: "Social Media",          label: "Social Media"     },
  { key: "Data Integration",      label: "Data Integration" },
  { key: "Survey & Feedback",     label: "Survey"           },
  { key: "E-Signature",           label: "E-Signature"      },
  { key: "Video & Webinar",       label: "Video"            },
  { key: "Scheduling",            label: "Scheduling"       },
  { key: "Customer Success",      label: "Customer Success" },
  { key: "CMS",                   label: "CMS"              },
  { key: "Search",                label: "Search"           },
  { key: "Messaging",             label: "Messaging"        },
  { key: "Healthcare",            label: "Healthcare"       },
  { key: "ERP",                   label: "ERP"              },
  { key: "IoT",                   label: "IoT"              },
  { key: "Blockchain",            label: "Blockchain"       },
  { key: "Media & DAM",           label: "Media & DAM"      },
  { key: "Low Code",              label: "Low Code"         },
  { key: "Cloud Services",        label: "Cloud Services"   },
  { key: "Collaboration",         label: "Collaboration"    },
  { key: "DevOps",                label: "DevOps"           },
  { key: "Automation",            label: "Automation"       },
  { key: "BI",                    label: "BI"               },
  { key: "Education",             label: "Education"        },
  { key: "Legal",                 label: "Legal"            },
  { key: "Real Estate",           label: "Real Estate"      },
  { key: "Operations",            label: "Operations"       },
  { key: "MCP",                   label: "MCP Servers"      },
];

function fieldPlaceholder(f) {
  if (f.type === "boolean") return false;
  if (f.type === "number")  return f.placeholder ? Number(f.placeholder) || 0 : 0;
  if (f.key === "password" || f.key === "pass" || f.key === "apiKey" || f.key === "token" || f.key === "bearerToken")
    return "YOUR_PASSWORD";
  return f.placeholder || `YOUR_${f.key.toUpperCase()}`;
}

function downloadSpec(connector) {
  const fields = connector.fields ? JSON.parse(connector.fields) : [];
  const connObj = { connection_name: `my-${connector.key}`, connection_type: connector.key };
  fields.forEach(f => { connObj[f.key] = fieldPlaceholder(f); });

  const spec = {
    llm: { provider: "openai", apiKey: "sk-YOUR_OPENAI_KEY", model: "gpt-4o" },
    connectors: [connObj],
  };

  const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${connector.key}.oe-config.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ConnectorsLibraryPage() {
  const [masters,     setMasters]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [selectedCat, setSelectedCat] = useState(null);

  useEffect(() => {
    api.get("/admin/connection-masters")
      .then(r => setMasters(r.data.masters || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return masters.filter(m => {
      const matchSearch = !q || m.label.toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q);
      const matchCat    = !selectedCat || m.category === selectedCat;
      return matchSearch && matchCat;
    });
  }, [masters, search, selectedCat]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(m => {
      const cat = m.category || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(m);
    });
    return map;
  }, [filtered]);

  const totalFiltered = filtered.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Connector Library</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {masters.length.toLocaleString()} connectors · download the spec to build your own adapter
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-semibold text-gray-600">{totalFiltered.toLocaleString()}</span> shown
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search connectors…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 placeholder-gray-300 focus:outline-none focus:border-indigo/40 focus:bg-white transition-colors"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCat(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
              !selectedCat ? "bg-indigo text-white border-indigo" : "bg-white text-gray-500 border-gray-200 hover:border-indigo hover:text-indigo"
            }`}>
            All
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat.key}
              onClick={() => setSelectedCat(selectedCat === cat.key ? null : cat.key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                selectedCat === cat.key ? "bg-indigo text-white border-indigo" : "bg-white text-gray-500 border-gray-200 hover:border-indigo hover:text-indigo"
              }`}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-indigo border-t-transparent rounded-full animate-spin" />
          </div>
        ) : totalFiltered === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-300">
            <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm font-medium">No connectors found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {CATEGORIES.map(cat => {
              const items = grouped[cat.key];
              if (!items?.length) return null;
              return (
                <div key={cat.key}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{cat.label}</h2>
                    <span className="text-xs text-gray-300 font-medium">{items.length}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {items.map(m => (
                      <ConnectorCard key={m.key} connector={m} />
                    ))}
                  </div>
                </div>
              );
            })}
            {/* Ungrouped */}
            {grouped["Other"] && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Other</h2>
                  <span className="text-xs text-gray-300 font-medium">{grouped["Other"].length}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {grouped["Other"].map(m => (
                    <ConnectorCard key={m.key} connector={m} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectorCard({ connector }) {
  const isLive = !!connector.fields;
  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-indigo/25 hover:bg-white hover:shadow-sm transition-all duration-150">
      <div className={`w-7 h-7 rounded-lg ${connector.color || "bg-gray-400"} flex items-center justify-center shrink-0`}>
        <span className="text-white text-[9px] font-bold leading-none">{connector.initial || connector.label?.slice(0, 2).toUpperCase()}</span>
      </div>
      <span className="flex-1 text-sm font-medium text-gray-700 truncate min-w-0">{connector.label}</span>
      <div className="shrink-0">
        {isLive ? (
          <button
            onClick={() => downloadSpec(connector)}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo opacity-0 group-hover:opacity-100 hover:text-indigo/70 transition-all whitespace-nowrap">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        ) : (
          <span className="text-[10px] font-semibold text-gray-300">Soon</span>
        )}
      </div>
    </div>
  );
}
