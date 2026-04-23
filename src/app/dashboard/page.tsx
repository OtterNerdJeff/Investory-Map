"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import StatsBar from "@/components/StatsBar";
import TabNav from "@/components/TabNav";
import SectionsView from "@/components/SectionsView";
import ListView from "@/components/ListView";
import FaultsView from "@/components/FaultsView";
import LoansView from "@/components/LoansView";
import { api } from "@/lib/api-client";
import type { Item } from "@/components/ItemChip";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<unknown[]>([]);
  const [sections, setSections] = useState<Record<string, string[]>>({});
  const [moveLog, setMoveLog] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("sections");
  const [activeSection, setActiveSection] = useState("");
  const [selectedItem, setSelectedItem] = useState<unknown | null>(null);
  const [modal, setModal] = useState<{ type: string; [key: string]: unknown } | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState(new Set<string>());
  const [dragItem, setDragItem] = useState<Item | null>(null);
  const [dragRoom, setDragRoom] = useState<string | null>(null);
  const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);

  // Suppress unused variable warnings for state used by future task views
  void selectedItem;
  void setSelectedItem;

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedItems, fetchedSections, fetchedLog] = await Promise.all([
          api.items.list(),
          api.sections.list(),
          api.moveLog.list(),
        ]);
        setItems(fetchedItems);
        // Sections API returns array of { id, name, rooms: [...] } — reshape to Record<name, roomNames[]>
        const sectionMap: Record<string, string[]> = {};
        if (Array.isArray(fetchedSections)) {
          (fetchedSections as Array<{ name: string; rooms?: Array<{ name: string }> }>).forEach(s => {
            sectionMap[s.name] = (s.rooms ?? []).map(r => r.name);
          });
        }
        setSections(sectionMap);
        const firstSection = Object.keys(sectionMap)[0];
        if (firstSection) setActiveSection(firstSection);
        setMoveLog(fetchedLog);
      } catch (e) {
        console.error("Failed to load data:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Item selection helpers ──────────────────────────────────────────────────
  const openItem = (item: Item) => setSelectedItem(item);

  const toggleSelectItem = (id: string, _shiftHeld: boolean) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedItems(new Set());

  // ── Drag & drop handlers ────────────────────────────────────────────────────
  const onDragItemStart = (e: React.DragEvent, item: Item) => {
    setDragItem(item);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragItemEnd = () => {
    setDragItem(null);
    setDragOverRoom(null);
  };
  const onRoomDragOver = (e: React.DragEvent, room: string) => {
    e.preventDefault();
    setDragOverRoom(room);
  };
  const onRoomDrop = (e: React.DragEvent, room: string) => {
    e.preventDefault();
    if (dragItem && (dragItem as Item).location !== room) {
      setModal({ type: "move", item: dragItem as unknown, pendingLocation: room });
    }
    setDragOverRoom(null);
    setDragItem(null);
  };
  const onRoomCardDragStart = (e: React.DragEvent, room: string) => {
    setDragRoom(room);
    e.dataTransfer.effectAllowed = "move";
  };
  const onRoomCardDrop = (e: React.DragEvent, _room: string, _section: string) => {
    e.preventDefault();
    // Room reorder is handled inside SectionsView via onDrop — sections state
    // update (reorderRooms) is a Settings-level operation; left as future task.
    setDragRoom(null);
    setDragOverRoom(null);
  };

  // Suppress helpers not yet wired to UI to avoid lint errors
  void clearSelection;

  // ── Fault update handler ────────────────────────────────────────────────────
  const onUpdateFault = async (itemId: string, faultId: string, patch: { status: string }) => {
    void itemId;
    try {
      await api.faults.update(faultId, patch);
      const fetchedItems = await api.items.list();
      setItems(fetchedItems);
    } catch (e) {
      console.error("Failed to update fault:", e);
    }
  };

  // Compute stats from items (items have status/isLoaned/warrantyEnd/faults fields)
  const typedItems = items as Array<{
    status: string;
    isLoaned: boolean;
    warrantyEnd: string | null;
    faults: Array<{ status: string }>;
  }>;

  const now = new Date();
  const stats = {
    total: typedItems.length,
    operational: typedItems.filter(i => i.status === "Operational").length,
    faulty: typedItems.filter(i => i.status === "Faulty").length,
    maintenance: typedItems.filter(i => i.status === "Under Maintenance").length,
    condemned: typedItems.filter(i => i.status === "Waiting for Condemnation").length,
    loaned: typedItems.filter(i => i.isLoaned).length,
    openFaults: typedItems.reduce((n, i) => n + (i.faults ?? []).filter(f => f.status !== "Resolved").length, 0),
    warrantyExpired: typedItems.filter(i => i.warrantyEnd && new Date(i.warrantyEnd) < now).length,
    expiringSoon: typedItems.filter(i => {
      if (!i.warrantyEnd) return false;
      const diff = (new Date(i.warrantyEnd).getTime() - now.getTime()) / 86400000;
      return diff > 0 && diff < 90;
    }).length,
  };

  const userRole = (session?.user as { role?: string })?.role ?? "USER";
  const isAdmin = userRole === "SCHOOL_ADMIN" || userRole === "SUPER_ADMIN";

  if (loading) {
    return (
      <div style={{ fontFamily: "'DM Mono','Courier New',monospace", background: "#080b12", minHeight: "100vh", color: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#4b5563", fontSize: 13 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Mono','Courier New',monospace", background: "#080b12", minHeight: "100vh", color: "#e2e8f0", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Space+Grotesk:wght@500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-track{background:#0d1117}::-webkit-scrollbar-thumb{background:#2d3148;border-radius:2px}
        .btn{background:#111827;border:1px solid #2d3748;color:#e2e8f0;padding:6px 12px;border-radius:5px;cursor:pointer;font-family:inherit;font-size:11px;transition:all .15s}
        .btn:hover{background:#1e2432;border-color:#6366f1}
        .btn-primary{background:#3730a3!important;border-color:#6366f1!important;color:#fff!important}
        .btn-primary:hover{background:#4338ca!important}
        .btn-danger{background:#7f1d1d!important;border-color:#ef4444!important;color:#fff!important}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:150;display:flex;align-items:center;justify-content:center;padding:16px}
        .modal{background:#0f1520;border:1px solid #2d3748;border-radius:12px;padding:20px;width:min(480px,100%);max-height:88vh;overflow-y:auto}
        input,select,textarea{background:#080b12;border:1px solid #2d3748;color:#e2e8f0;border-radius:5px;padding:7px 10px;font-family:inherit;font-size:12px;width:100%;outline:none;transition:border .15s}
        input:focus,select:focus,textarea:focus{border-color:#6366f1}
        select option{background:#0f1520}
        .chip{border-radius:4px;transition:all .1s;cursor:grab;user-select:none}
        .chip:hover{opacity:.85}
        .chip:active{cursor:grabbing}
        .room-card{border-radius:8px;transition:border-color .15s}
        .drop-target{box-shadow:0 0 0 2px #6366f1!important}
        .badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:500;white-space:nowrap}
        .lightbox{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:300;display:flex;align-items:center;justify-content:center;cursor:zoom-out}
        .lightbox img{max-width:90vw;max-height:90vh;border-radius:6px}
        .tab-btn{background:none;border:none;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap}
        .sec-btn{background:none;border:1px solid transparent;cursor:pointer;font-family:inherit;transition:all .15s;border-radius:5px;padding:5px 10px;font-size:11px;white-space:nowrap}
        .sec-btn.active{background:#111827;border-color:#6366f1;color:#a5b4fc}
        .sec-btn:not(.active){color:#6b7280}
        .sec-btn:not(.active):hover{color:#9ca3af;border-color:#374151}
      `}</style>

      <Header
        moveLogCount={(moveLog as unknown[]).length}
        isAdmin={isAdmin}
        onReport={() => setModal({ type: "report" })}
        onExportCSV={async () => { try { const csv = await api.items.list(); console.log("export", csv); } catch(e) { console.error(e); } }}
        onImport={() => setModal({ type: "import" })}
        onMoveLog={() => setModal({ type: "movelog" })}
        onSettings={() => setModal({ type: "settings" })}
        userName={(session?.user as { name?: string })?.name ?? ""}
      />

      <StatsBar stats={stats} onClickTotal={() => setModal({ type: "report" })} />

      <TabNav tab={tab} setTab={setTab} />

      <div style={{ flex: 1, overflow: "auto", padding: "14px 16px" }}>
        {tab === "sections" && (
          <SectionsView
            items={items as Item[]}
            sections={sections}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            onSelectItem={openItem}
            onAddItem={loc => setModal({ type: "additem", location: loc })}
            onDragItemStart={onDragItemStart}
            onDragItemEnd={onDragItemEnd}
            onRoomDragOver={onRoomDragOver}
            onRoomDrop={onRoomDrop}
            dragOverRoom={dragOverRoom}
            onRoomCardDragStart={onRoomCardDragStart}
            onRoomCardDrop={onRoomCardDrop}
            onMoveItem={item => setModal({ type: "move", item: item as unknown, pendingLocation: null })}
            dragItem={dragItem}
            dragRoom={dragRoom}
            selectedItems={selectedItems}
            onToggleSelect={toggleSelectItem}
          />
        )}
        {tab === "list" && (
          <ListView
            items={items as Item[]}
            search={search}
            setSearch={setSearch}
            filterType={filterType}
            setFilterType={setFilterType}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            onSelectItem={openItem}
          />
        )}
        {tab === "faults" && (
          <FaultsView
            items={items as Item[]}
            onSelectItem={openItem}
            onUpdateFault={onUpdateFault}
            setLightbox={setLightbox}
          />
        )}
        {tab === "loans" && (
          <LoansView
            items={items as Item[]}
            onSelectItem={openItem}
            onReturn={item => setModal({ type: "return", item: item as unknown })}
            onLoanOut={item => setModal({ type: "loanout", item: item as unknown })}
          />
        )}
      </div>

      {modal && (
        <div style={{ color: "#4b5563", fontSize: 10, position: "fixed", bottom: 8, right: 8 }}>
          modal: {modal.type}
          <button onClick={() => setModal(null)} style={{ marginLeft: 6, background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
        </div>
      )}
    </div>
  );
}
