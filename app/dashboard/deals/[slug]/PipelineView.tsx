"use client";

import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { Deal, DealStage } from "@/lib/deals/types";
import { DEAL_STAGE_VALUES, DEAL_STAGE_LABELS, DEAL_TYPE_LABELS } from "@/lib/deals/types";

const MONO = "'Geist Mono', monospace";

const STAGE_COLORS: Record<DealStage, { bg: string; border: string; dot: string; headerBg: string }> = {
  sourcing:    { bg: "#F8FAFC", border: "#E2E8F0", dot: "#94A3B8", headerBg: "#F1F5F9" },
  dd:          { bg: "#FFF7ED", border: "#FED7AA", dot: "#F97316", headerBg: "#FFF7ED" },
  pricing:     { bg: "#EFF6FF", border: "#BFDBFE", dot: "#3B82F6", headerBg: "#EFF6FF" },
  term_sheet:  { bg: "#F5F3FF", border: "#DDD6FE", dot: "#8B5CF6", headerBg: "#F5F3FF" },
  loi:         { bg: "#FDF4FF", border: "#E9D5FF", dot: "#A855F7", headerBg: "#FDF4FF" },
  closing:     { bg: "#FFFBEB", border: "#FDE68A", dot: "#EAB308", headerBg: "#FFFBEB" },
  live:        { bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981", headerBg: "#ECFDF5" },
  closed_won:  { bg: "#F0FDF4", border: "#86EFAC", dot: "#22C55E", headerBg: "#F0FDF4" },
  closed_lost: { bg: "#FEF2F2", border: "#FECACA", dot: "#EF4444", headerBg: "#FEF2F2" },
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "";
  if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

interface Props {
  deals: Deal[];
  slug: string;
  onStageChange: (dealId: string, newStage: string) => void;
}

export default function PipelineView({ deals, slug, onStageChange }: Props) {
  const router = useRouter();
  const dealsByStage: Record<DealStage, Deal[]> = {} as Record<DealStage, Deal[]>;
  for (const stage of DEAL_STAGE_VALUES) {
    dealsByStage[stage] = [];
  }
  for (const deal of deals) {
    if (dealsByStage[deal.stage]) {
      dealsByStage[deal.stage].push(deal);
    }
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const dealId = result.draggableId;
    const newStage = result.destination.droppableId;
    const oldStage = result.source.droppableId;
    if (newStage === oldStage) return;
    onStageChange(dealId, newStage);
  }

  // Count active deals (not closed)
  const activeCount = deals.filter(d => !d.stage.startsWith("closed")).length;

  return (
    <div>
      {/* Summary bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, marginBottom: 16,
        fontSize: 12, color: "#64748B", fontFamily: MONO,
      }}>
        <span>{deals.length} deals total</span>
        <span>·</span>
        <span>{activeCount} activos</span>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{
          display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16,
          minHeight: 400,
        }}>
          {DEAL_STAGE_VALUES.map(stage => {
            const stageDeals = dealsByStage[stage];
            const colors = STAGE_COLORS[stage];
            return (
              <Droppable key={stage} droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      width: 260, minWidth: 260, flexShrink: 0,
                      background: snapshot.isDraggingOver ? "rgba(91,141,239,0.04)" : "#FAFBFC",
                      border: `1px solid ${snapshot.isDraggingOver ? "#93B4F8" : "#E2E8F0"}`,
                      borderRadius: 10,
                      display: "flex", flexDirection: "column",
                      transition: "border-color .15s, background .15s",
                    }}
                  >
                    {/* Column header */}
                    <div style={{
                      padding: "10px 12px",
                      borderBottom: `1px solid ${colors.border}`,
                      background: colors.headerBg,
                      borderRadius: "10px 10px 0 0",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: "50%",
                          background: colors.dot, flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: "#475569",
                          letterSpacing: ".04em", textTransform: "uppercase",
                        }}>{DEAL_STAGE_LABELS[stage]}</span>
                      </div>
                      {stageDeals.length > 0 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "#94A3B8",
                          fontFamily: MONO, background: "#F1F5F9",
                          padding: "2px 6px", borderRadius: 4,
                        }}>{stageDeals.length}</span>
                      )}
                    </div>

                    {/* Cards */}
                    <div style={{ padding: 8, flex: 1, minHeight: 60 }}>
                      {stageDeals.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={{
                                background: "#FFFFFF",
                                border: `1px solid ${dragSnapshot.isDragging ? "#93B4F8" : "#E8EDF5"}`,
                                borderRadius: 8, padding: "10px 12px",
                                marginBottom: 6, cursor: "grab",
                                boxShadow: dragSnapshot.isDragging
                                  ? "0 8px 24px rgba(0,0,0,0.12)"
                                  : "0 1px 2px rgba(0,0,0,0.04)",
                                transition: dragSnapshot.isDragging ? "none" : "box-shadow .15s, border-color .15s",
                                ...dragProvided.draggableProps.style,
                              }}
                            >
                              <div style={{
                                fontSize: 13, fontWeight: 600, color: "#0F172A",
                                marginBottom: 4, lineHeight: 1.3,
                              }}>{deal.name}</div>

                              {deal.client_name && (
                                <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6 }}>
                                  {deal.client_name}
                                </div>
                              )}

                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 600, fontFamily: MONO,
                                  padding: "2px 6px", borderRadius: 4,
                                  background: "#EFF6FF", color: "#1E40AF",
                                }}>{DEAL_TYPE_LABELS[deal.type] ?? deal.type}</span>

                                {deal.amount_mxn != null && (
                                  <span style={{
                                    fontSize: 10, fontWeight: 700, fontFamily: MONO,
                                    color: "#0F172A",
                                  }}>{fmtMoney(deal.amount_mxn)}</span>
                                )}
                              </div>

                              {deal.target_close_date && (
                                <div style={{
                                  marginTop: 6, fontSize: 10, color: "#94A3B8", fontFamily: MONO,
                                }}>
                                  Target: {deal.target_close_date}
                                </div>
                              )}

                              {/* Open detail link */}
                              <button
                                onMouseDown={e => e.stopPropagation()}
                                onClick={e => { e.stopPropagation(); router.push(`/dashboard/deals/${slug}/${deal.id}`); }}
                                style={{
                                  marginTop: 8, width: "100%", padding: "5px 0",
                                  background: "#F8FAFC", border: "1px solid #E8EDF5", borderRadius: 5,
                                  fontSize: 10, fontWeight: 600, color: "#64748B",
                                  cursor: "pointer", transition: "all .1s",
                                  fontFamily: "'Geist', sans-serif",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#93B4F8"; e.currentTarget.style.color = "#1B3F8A"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8EDF5"; e.currentTarget.style.color = "#64748B"; }}
                              >Abrir →</button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
