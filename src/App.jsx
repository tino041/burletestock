import { useState, useRef, useEffect } from "react";

const INITIAL_INSUMOS = [
  { id: "IMA-001", descripcion: "Imán flexible 10mm", unidad: "metro", stock: 250, minimo: 50, maximo: 500, proveedor: "Magnoimport SA" },
  { id: "IMA-002", descripcion: "Imán flexible 15mm", unidad: "metro", stock: 180, minimo: 40, maximo: 400, proveedor: "Magnoimport SA" },
  { id: "IMA-003", descripcion: "Imán flexible 20mm", unidad: "metro", stock: 90, minimo: 30, maximo: 300, proveedor: "Magnoimport SA" },
  { id: "PER-001", descripcion: "Perfil PVC gris 8mm", unidad: "metro", stock: 320, minimo: 80, maximo: 600, proveedor: "PlásticosSur" },
  { id: "PER-002", descripcion: "Perfil PVC negro 10mm", unidad: "metro", stock: 210, minimo: 60, maximo: 500, proveedor: "PlásticosSur" },
  { id: "PER-003", descripcion: "Perfil PVC blanco 12mm", unidad: "metro", stock: 45, minimo: 60, maximo: 400, proveedor: "PlásticosSur" },
  { id: "COL-001", descripcion: "Cola de contacto", unidad: "litro", stock: 12, minimo: 5, maximo: 30, proveedor: "Ferretería Norte" },
  { id: "BOL-001", descripcion: "Bolsas polietileno", unidad: "paquete", stock: 15, minimo: 5, maximo: 40, proveedor: "Embolsados SRL" },
];

const INITIAL_PRODUCTOS = [
  { id: "BUR-HEL-001", descripcion: "Burlete Whirlpool WRB19 (60cm)", tipo: "Heladera", stock: 8, minimo: 3 },
  { id: "BUR-HEL-002", descripcion: "Burlete Whirlpool WRT25 (70cm)", tipo: "Heladera", stock: 2, minimo: 3 },
  { id: "BUR-HEL-003", descripcion: "Burlete Drean Golden 430", tipo: "Heladera", stock: 5, minimo: 3 },
  { id: "BUR-HEL-004", descripcion: "Burlete Drean Gold 480", tipo: "Heladera", stock: 0, minimo: 3 },
  { id: "BUR-HEL-005", descripcion: "Burlete Samsung RT46 (sup)", tipo: "Heladera", stock: 6, minimo: 2 },
  { id: "BUR-FRZ-001", descripcion: "Burlete freezer Briket F280", tipo: "Freezer", stock: 4, minimo: 2 },
  { id: "BUR-FRZ-002", descripcion: "Burlete freezer Patrick FHP130", tipo: "Freezer", stock: 1, minimo: 2 },
  { id: "BUR-CAM-001", descripcion: "Burlete cámara 100x200cm", tipo: "Cámara", stock: 3, minimo: 1 },
  { id: "BUR-CAM-002", descripcion: "Burlete cámara 80x180cm", tipo: "Cámara", stock: 2, minimo: 1 },
];

const INITIAL_MOVIMIENTOS = [
  { fecha: "10/06/2026", tipo: "Insumo", codigo: "IMA-001", descripcion: "Imán flexible 10mm", movimiento: "ENTRADA", cantidad: 100, responsable: "Valentino", obs: "Compra Magnoimport" },
  { fecha: "11/06/2026", tipo: "Insumo", codigo: "PER-001", descripcion: "Perfil PVC gris 8mm", movimiento: "SALIDA", cantidad: 20, responsable: "Valentino", obs: "Fabricación Whirlpool" },
  { fecha: "11/06/2026", tipo: "Producto", codigo: "BUR-HEL-001", descripcion: "Burlete Whirlpool WRB19", movimiento: "ENTRADA", cantidad: 4, responsable: "Valentino", obs: "Fabricación" },
  { fecha: "12/06/2026", tipo: "Producto", codigo: "BUR-HEL-002", descripcion: "Burlete Whirlpool WRT25", movimiento: "SALIDA", cantidad: 2, responsable: "Valentino", obs: "Venta cliente" },
];

function getEstadoInsumo(item) {
  if (item.stock <= item.minimo) return "reponer";
  if (item.stock >= item.maximo) return "lleno";
  return "ok";
}

function getEstadoProducto(item) {
  if (item.stock === 0) return "sinstock";
  if (item.stock <= item.minimo) return "bajo";
  return "ok";
}

const estadoBadge = {
  ok: { label: "✅ OK", bg: "#d1fae5", color: "#065f46" },
  reponer: { label: "⚠️ Reponer", bg: "#fee2e2", color: "#991b1b" },
  lleno: { label: "📦 Lleno", bg: "#fef9c3", color: "#854d0e" },
  sinstock: { label: "❌ Sin stock", bg: "#fee2e2", color: "#991b1b" },
  bajo: { label: "⚠️ Stock bajo", bg: "#fef9c3", color: "#854d0e" },
};

const INITIAL_PEDIDOS = [
  { id: "PED-001", fecha: "12/06/2026", cliente: "Servicio Técnico Martínez", telefono: "11-4523-9900", via: "Teléfono", estado: "entregado", items: [{ productoId: "BUR-HEL-001", descripcion: "Burlete Whirlpool WRB19 (60cm)", cantidad: 2 }], obs: "" },
  { id: "PED-002", fecha: "16/06/2026", cliente: "Frigorífico El Sur", telefono: "11-3345-7711", via: "Mail", estado: "pendiente", items: [{ productoId: "BUR-CAM-001", descripcion: "Burlete cámara 100x200cm", cantidad: 1 }, { productoId: "BUR-CAM-002", descripcion: "Burlete cámara 80x180cm", cantidad: 1 }], obs: "Necesitan para el viernes" },
  { id: "PED-003", fecha: "18/06/2026", cliente: "Reparaciones López", telefono: "", via: "Teléfono", estado: "en fabricacion", items: [{ productoId: "BUR-HEL-004", descripcion: "Burlete Drean Gold 480", cantidad: 3 }], obs: "Sin stock, fabricar" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [insumos, setInsumos] = useState(INITIAL_INSUMOS);
  const [productos, setProductos] = useState(INITIAL_PRODUCTOS);
  const [movimientos, setMovimientos] = useState(INITIAL_MOVIMIENTOS);
  const [pedidos, setPedidos] = useState(INITIAL_PEDIDOS);
  const [modal, setModal] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", text: "¡Hola Valentino! Soy tu asistente de stock. Podés preguntarme cualquier cosa sobre tus insumos, burletes o qué necesitás reponer." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const alertasInsumos = insumos.filter(i => getEstadoInsumo(i) === "reponer");
  const alertasProductos = productos.filter(p => ["sinstock","bajo"].includes(getEstadoProducto(p)));
  const pedidosPendientes = pedidos.filter(p => p.estado !== "entregado");

  function entregarPedido(pedidoId) {
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;
    const hoy = new Date().toLocaleDateString("es-AR");
    pedido.items.forEach(item => {
      setProductos(prev => prev.map(p => p.id === item.productoId
        ? { ...p, stock: Math.max(0, p.stock - item.cantidad) } : p));
      setMovimientos(prev => [{ fecha: hoy, tipo: "Producto", codigo: item.productoId, descripcion: item.descripcion, movimiento: "SALIDA", cantidad: item.cantidad, responsable: "Valentino", obs: `Pedido ${pedidoId} - ${pedido.cliente}` }, ...prev]);
    });
    setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: "entregado" } : p));
  }

  function cambiarEstadoPedido(pedidoId, nuevoEstado) {
    setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado } : p));
  }

  function agregarPedido(pedido) {
    const id = `PED-${String(Date.now()).slice(-4)}`;
    setPedidos(prev => [{ ...pedido, id, fecha: new Date().toLocaleDateString("es-AR"), estado: "pendiente" }, ...prev]);
    setModal(null);
  }

  function registrarMovimiento(tipo, codigo, descripcion, movimiento, cantidad) {
    const hoy = new Date().toLocaleDateString("es-AR");
    setMovimientos(prev => [{ fecha: hoy, tipo, codigo, descripcion, movimiento, cantidad, responsable: "Valentino", obs: "" }, ...prev]);
    if (tipo === "Insumo") {
      setInsumos(prev => prev.map(i => i.id === codigo
        ? { ...i, stock: movimiento === "ENTRADA" ? i.stock + cantidad : Math.max(0, i.stock - cantidad) }
        : i));
    } else {
      setProductos(prev => prev.map(p => p.id === codigo
        ? { ...p, stock: movimiento === "ENTRADA" ? p.stock + cantidad : Math.max(0, p.stock - cantidad) }
        : p));
    }
    setModal(null);
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);

    const stockContext = `
INSUMOS ACTUALES:
${insumos.map(i => `- ${i.id} | ${i.descripcion} | Stock: ${i.stock} ${i.unidad} | Mínimo: ${i.minimo} | Estado: ${getEstadoInsumo(i)}`).join("\n")}

PRODUCTOS TERMINADOS:
${productos.map(p => `- ${p.id} | ${p.descripcion} | Stock: ${p.stock} unidades | Mínimo: ${p.minimo} | Estado: ${getEstadoProducto(p)}`).join("\n")}

ALERTAS: ${alertasInsumos.length} insumos a reponer, ${alertasProductos.length} productos con stock bajo o sin stock.
`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: `Sos un asistente de gestión de stock para una empresa argentina de burletes (sellos de goma con imán para heladeras, freezers y cámaras frigoríficas). El dueño se llama Valentino. Respondés en español rioplatense, de forma clara y concisa. Tenés acceso al stock actual en tiempo real. Ayudás a decidir qué reponer, qué fabricar, y respondés preguntas sobre el inventario.\n\nDATOS DE STOCK ACTUALES:\n${stockContext}`,
          messages: [
            ...chatMessages.filter(m => m.role !== "assistant" || chatMessages.indexOf(m) > 0).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
            { role: "user", content: userMsg }
          ]
        })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "No pude procesar la respuesta.";
      setChatMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "assistant", text: "Error de conexión. Intentá de nuevo." }]);
    }
    setChatLoading(false);
  }

  const tabs = [
    { id: "dashboard", label: "Panel", icon: "📊" },
    { id: "pedidos", label: "Pedidos", icon: "📦", badge: pedidosPendientes.length },
    { id: "insumos", label: "Insumos", icon: "🧲" },
    { id: "productos", label: "Burletes", icon: "🔧" },
    { id: "movimientos", label: "Historial", icon: "📋" },
    { id: "ia", label: "IA", icon: "🤖" },
    { id: "config", label: "Config", icon: "⚙️" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#f0f4f1", minHeight: "100vh", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a5c2e 0%, #2d8a4e 100%)", padding: "20px 24px 0", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 26 }}>🏭</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>BurleteStock</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Control de inventario · Perfiles Plásticos</div>
          </div>
          {(alertasInsumos.length + alertasProductos.length + pedidosPendientes.length) > 0 && (
            <div style={{ marginLeft: "auto", background: "#ef4444", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
              {alertasInsumos.length + alertasProductos.length + pedidosPendientes.length} alertas
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 2, marginTop: 12 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? "white" : "transparent",
              color: tab === t.id ? "#1a5c2e" : "rgba(255,255,255,0.8)",
              border: "none", borderRadius: "8px 8px 0 0", padding: "8px 12px",
              fontWeight: tab === t.id ? 700 : 400, fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4, position: "relative"
            }}>
              <span>{t.icon}</span>
              <span style={{ display: window.innerWidth < 400 ? "none" : "inline" }}>{t.label}</span>
              {t.badge > 0 && <span style={{ background: "#ef4444", color: "white", borderRadius: 10, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 16px" }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Pedidos pendientes", value: pedidosPendientes.length, color: pedidosPendientes.length > 0 ? "#3b82f6" : "#10b981", icon: "📦", action: () => setTab("pedidos") },
                { label: "Insumos a reponer", value: alertasInsumos.length, color: alertasInsumos.length > 0 ? "#ef4444" : "#10b981", icon: "⚠️" },
                { label: "Burletes con stock bajo", value: alertasProductos.length, color: alertasProductos.length > 0 ? "#f59e0b" : "#10b981", icon: "📉" },
                { label: "Modelos de burletes", value: productos.length, color: "#8b5cf6", icon: "🔧" },
              ].map((card, i) => (
                <div key={i} onClick={card.action} style={{ background: "white", borderRadius: 12, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", cursor: card.action ? "pointer" : "default" }}>
                  <div style={{ fontSize: 22 }}>{card.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: card.color, lineHeight: 1.1 }}>{card.value}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{card.label}</div>
                </div>
              ))}
            </div>

            {alertasInsumos.length > 0 && (
              <div style={{ background: "white", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 10, fontSize: 14 }}>🚨 Insumos a reponer</div>
                {alertasInsumos.map(i => (
                  <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{i.descripcion}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{i.proveedor}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 14 }}>{i.stock} {i.unidad}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>mín: {i.minimo}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {alertasProductos.length > 0 && (
              <div style={{ background: "white", borderRadius: 12, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                <div style={{ fontWeight: 700, color: "#854d0e", marginBottom: 10, fontSize: 14 }}>⚠️ Burletes con stock bajo</div>
                {alertasProductos.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.descripcion}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{p.tipo}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: p.stock === 0 ? "#ef4444" : "#f59e0b", fontWeight: 700, fontSize: 14 }}>{p.stock} uds</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>mín: {p.minimo}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {alertasInsumos.length === 0 && alertasProductos.length === 0 && (
              <div style={{ background: "#d1fae5", borderRadius: 12, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 32 }}>✅</div>
                <div style={{ fontWeight: 700, color: "#065f46", marginTop: 4 }}>Todo el stock está en orden</div>
              </div>
            )}
          </div>
        )}

        {/* PEDIDOS */}
        {tab === "pedidos" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a5c2e" }}>📦 Pedidos</div>
              <button onClick={() => setModal({ tipo: "nuevoPedido" })}
                style={{ background: "#1a5c2e", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                + Nuevo pedido
              </button>
            </div>

            {/* Filtro */}
            {["pendiente", "en fabricacion", "listo", "entregado"].map(estado => {
              const items = pedidos.filter(p => p.estado === estado);
              if (items.length === 0) return null;
              const cfg = {
                pendiente: { label: "🕐 Pendientes", border: "#3b82f6", bg: "#eff6ff" },
                "en fabricacion": { label: "🔨 En fabricación", border: "#f59e0b", bg: "#fffbeb" },
                listo: { label: "✅ Listos para entregar", border: "#10b981", bg: "#f0fdf4" },
                entregado: { label: "📬 Entregados", border: "#d1d5db", bg: "#f9fafb" },
              }[estado];
              return (
                <div key={estado} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{cfg.label}</div>
                  {items.map(pedido => (
                    <div key={pedido.id} style={{ background: "white", borderRadius: 12, padding: 14, marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${cfg.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{pedido.cliente}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>{pedido.id} · {pedido.fecha} · {pedido.via}</div>
                          {pedido.telefono && <div style={{ fontSize: 11, color: "#6b7280" }}>📞 {pedido.telefono}</div>}
                        </div>
                      </div>

                      {pedido.items.map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", background: "#f9fafb", borderRadius: 8, padding: "6px 10px", marginBottom: 4, fontSize: 13 }}>
                          <span>{item.descripcion}</span>
                          <span style={{ fontWeight: 700 }}>x{item.cantidad}</span>
                        </div>
                      ))}

                      {pedido.obs && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, fontStyle: "italic" }}>📝 {pedido.obs}</div>}

                      {estado !== "entregado" && (
                        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                          {estado === "pendiente" && (
                            <button onClick={() => cambiarEstadoPedido(pedido.id, "en fabricacion")}
                              style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#92400e", fontWeight: 600, cursor: "pointer" }}>
                              🔨 Iniciar fabricación
                            </button>
                          )}
                          {estado === "en fabricacion" && (
                            <button onClick={() => cambiarEstadoPedido(pedido.id, "listo")}
                              style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#166534", fontWeight: 600, cursor: "pointer" }}>
                              ✅ Marcar listo
                            </button>
                          )}
                          {estado === "listo" && (
                            <button onClick={() => entregarPedido(pedido.id)}
                              style={{ background: "#1a5c2e", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "white", fontWeight: 700, cursor: "pointer" }}>
                              📬 Confirmar entrega
                            </button>
                          )}
                          {estado === "pendiente" && (
                            <button onClick={() => cambiarEstadoPedido(pedido.id, "listo")}
                              style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#166534", fontWeight: 600, cursor: "pointer" }}>
                              ✅ Ya está listo
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {pedidos.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
                <div style={{ fontSize: 40 }}>📭</div>
                <div style={{ marginTop: 8 }}>No hay pedidos todavía</div>
              </div>
            )}
          </div>
        )}

        {/* INSUMOS */}
        {tab === "insumos" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a5c2e" }}>🧲 Insumos</div>
              <button onClick={() => setModal({ tipo: "movimiento", itemTipo: "Insumo" })}
                style={{ background: "#1a5c2e", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                + Registrar movimiento
              </button>
            </div>
            {insumos.map(item => {
              const estado = getEstadoInsumo(item);
              const badge = estadoBadge[estado];
              const pct = Math.min(100, (item.stock / item.maximo) * 100);
              return (
                <div key={item.id} style={{ background: "white", borderRadius: 12, padding: 14, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.descripcion}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{item.id} · {item.proveedor}</div>
                    </div>
                    <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{badge.label}</span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                      <span>Stock: <b style={{ color: "#111" }}>{item.stock} {item.unidad}</b></span>
                      <span>Máx: {item.maximo}</span>
                    </div>
                    <div style={{ background: "#f3f4f6", borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${pct}%`, background: estado === "reponer" ? "#ef4444" : estado === "lleno" ? "#f59e0b" : "#10b981", height: 6, borderRadius: 4, transition: "width 0.3s" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>Mínimo: {item.minimo} {item.unidad}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PRODUCTOS */}
        {tab === "productos" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a5c2e" }}>🔧 Burletes</div>
              <button onClick={() => setModal({ tipo: "movimiento", itemTipo: "Producto" })}
                style={{ background: "#1a5c2e", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                + Registrar movimiento
              </button>
            </div>
            {["Heladera", "Freezer", "Cámara"].map(tipo => {
              const items = productos.filter(p => p.tipo === tipo);
              return (
                <div key={tipo} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{tipo}</div>
                  {items.map(item => {
                    const estado = getEstadoProducto(item);
                    const badge = estadoBadge[estado];
                    return (
                      <div key={item.id} style={{ background: "white", borderRadius: 12, padding: 14, marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.descripcion}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>{item.id}</div>
                        </div>
                        <div style={{ textAlign: "right", minWidth: 90 }}>
                          <div style={{ fontWeight: 800, fontSize: 20, color: item.stock === 0 ? "#ef4444" : "#111" }}>{item.stock}</div>
                          <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{badge.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* MOVIMIENTOS */}
        {tab === "movimientos" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1a5c2e", marginBottom: 14 }}>📋 Historial de movimientos</div>
            {movimientos.map((m, i) => (
              <div key={i} style={{ background: "white", borderRadius: 12, padding: 14, marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${m.movimiento === "ENTRADA" ? "#10b981" : "#ef4444"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{m.descripcion}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.codigo} · {m.tipo}</div>
                    {m.obs && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{m.obs}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: m.movimiento === "ENTRADA" ? "#10b981" : "#ef4444", fontSize: 16 }}>
                      {m.movimiento === "ENTRADA" ? "+" : "-"}{m.cantidad}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{m.fecha}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ASISTENTE IA */}
        {tab === "ia" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1a5c2e", marginBottom: 14 }}>🤖 Asistente IA</div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 10 }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "85%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: m.role === "user" ? "#1a5c2e" : "white",
                    color: m.role === "user" ? "white" : "#111",
                    fontSize: 14, lineHeight: 1.5, boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", gap: 4, padding: "10px 14px", background: "white", borderRadius: "16px 16px 16px 4px", width: 60, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                  {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: "#9ca3af", animation: `bounce 1s ${j*0.2}s infinite` }} />)}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: 8, paddingTop: 10 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Preguntame sobre el stock..."
                style={{ flex: 1, border: "2px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none" }}
              />
              <button onClick={sendChat} disabled={chatLoading}
                style={{ background: "#1a5c2e", color: "white", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>
                ➤
              </button>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["¿Qué tengo que reponer?", "¿Cuántos Whirlpool me quedan?", "¿Qué fabricar esta semana?"].map(q => (
                <button key={q} onClick={() => { setChatInput(q); }}
                  style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#166534", cursor: "pointer" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CONFIGURACIÓN */}
        {tab === "config" && (
          <ConfigPanel
            insumos={insumos}
            productos={productos}
            onUpdateInsumo={(id, changes) => setInsumos(prev => prev.map(i => i.id === id ? { ...i, ...changes } : i))}
            onUpdateProducto={(id, changes) => setProductos(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))}
            onAddInsumo={item => setInsumos(prev => [...prev, item])}
            onAddProducto={item => setProductos(prev => [...prev, item])}
            onDeleteInsumo={id => setInsumos(prev => prev.filter(i => i.id !== id))}
            onDeleteProducto={id => setProductos(prev => prev.filter(p => p.id !== id))}
          />
        )}
      </div>

      {/* MODAL MOVIMIENTO */}
      {modal?.tipo === "movimiento" && (
        <MovimientoModal
          itemTipo={modal.itemTipo}
          insumos={insumos}
          productos={productos}
          onConfirm={registrarMovimiento}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.tipo === "nuevoPedido" && (
        <NuevoPedidoModal
          productos={productos}
          onConfirm={agregarPedido}
          onClose={() => setModal(null)}
        />
      )}

      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        * { box-sizing: border-box; }
        input:focus { border-color: #1a5c2e !important; }
      `}</style>
    </div>
  );
}

function ConfigPanel({ insumos, productos, onUpdateInsumo, onUpdateProducto, onAddInsumo, onAddProducto, onDeleteInsumo, onDeleteProducto }) {
  const [seccion, setSeccion] = useState("insumos");
  const [editando, setEditando] = useState(null); // { tipo, id } | { tipo, nuevo: true }
  const [form, setForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  function abrirEdicion(tipo, item) {
    setEditando({ tipo, id: item.id });
    setForm({ ...item });
  }

  function abrirNuevo(tipo) {
    const id = tipo === "insumo"
      ? `IMA-${String(Date.now()).slice(-3)}`
      : `BUR-HEL-${String(Date.now()).slice(-3)}`;
    setEditando({ tipo, nuevo: true });
    setForm(tipo === "insumo"
      ? { id, descripcion: "", unidad: "metro", stock: 0, minimo: 10, maximo: 100, proveedor: "" }
      : { id, descripcion: "", tipo: "Heladera", stock: 0, minimo: 2 });
  }

  function guardar() {
    if (!form.descripcion?.trim()) return;
    if (editando.tipo === "insumo") {
      editando.nuevo ? onAddInsumo(form) : onUpdateInsumo(form.id, form);
    } else {
      editando.nuevo ? onAddProducto(form) : onUpdateProducto(form.id, form);
    }
    setEditando(null);
  }

  const inputStyle = { width: "100%", border: "2px solid #e5e7eb", borderRadius: 8, padding: "9px 12px", fontSize: 14, marginBottom: 10, background: "white", outline: "none" };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 };

  if (editando) {
    const esInsumo = editando.tipo === "insumo";
    return (
      <div>
        <button onClick={() => setEditando(null)} style={{ background: "none", border: "none", color: "#1a5c2e", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 16, padding: 0 }}>
          ← Volver
        </button>
        <div style={{ background: "white", borderRadius: 14, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
            {editando.nuevo ? "➕ Agregar" : "✏️ Editar"} {esInsumo ? "insumo" : "burlete"}
          </div>

          <label style={labelStyle}>Código</label>
          <input style={{ ...inputStyle, background: editando.nuevo ? "white" : "#f9fafb", color: editando.nuevo ? "#111" : "#9ca3af" }}
            value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} readOnly={!editando.nuevo} />

          <label style={labelStyle}>Descripción / Nombre</label>
          <input style={inputStyle} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Burlete Whirlpool WRB19 (60cm)" />

          {esInsumo ? (
            <>
              <label style={labelStyle}>Unidad de medida</label>
              <select style={inputStyle} value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                {["metro", "litro", "kg", "unidad", "rollo", "paquete"].map(u => <option key={u}>{u}</option>)}
              </select>

              <label style={labelStyle}>Proveedor</label>
              <input style={inputStyle} value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Stock mínimo (⚠️ alerta)</label>
                  <input type="number" style={inputStyle} value={form.minimo} onChange={e => setForm(f => ({ ...f, minimo: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={labelStyle}>Stock máximo</label>
                  <input type="number" style={inputStyle} value={form.maximo} onChange={e => setForm(f => ({ ...f, maximo: Number(e.target.value) }))} />
                </div>
              </div>
            </>
          ) : (
            <>
              <label style={labelStyle}>Tipo</label>
              <select style={inputStyle} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {["Heladera", "Freezer", "Cámara"].map(t => <option key={t}>{t}</option>)}
              </select>

              <label style={labelStyle}>Stock mínimo (⚠️ alerta)</label>
              <input type="number" style={inputStyle} value={form.minimo} onChange={e => setForm(f => ({ ...f, minimo: Number(e.target.value) }))} />
            </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
            <button onClick={() => setEditando(null)}
              style={{ padding: "12px", border: "2px solid #e5e7eb", borderRadius: 10, background: "white", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
              Cancelar
            </button>
            <button onClick={guardar}
              style={{ padding: "12px", background: "#1a5c2e", color: "white", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 16, color: "#1a5c2e", marginBottom: 14 }}>⚙️ Configuración</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[["insumos", "🧲 Insumos"], ["productos", "🔧 Burletes"]].map(([id, label]) => (
          <button key={id} onClick={() => setSeccion(id)}
            style={{ padding: "10px", border: `2px solid ${seccion === id ? "#1a5c2e" : "#e5e7eb"}`,
              borderRadius: 10, background: seccion === id ? "#f0fdf4" : "white",
              color: seccion === id ? "#1a5c2e" : "#6b7280", fontWeight: seccion === id ? 700 : 400, cursor: "pointer", fontSize: 14 }}>
            {label}
          </button>
        ))}
      </div>

      <button onClick={() => abrirNuevo(seccion === "insumos" ? "insumo" : "producto")}
        style={{ width: "100%", padding: "11px", background: "#1a5c2e", color: "white", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14, marginBottom: 14 }}>
        + Agregar {seccion === "insumos" ? "insumo" : "burlete"}
      </button>

      {(seccion === "insumos" ? insumos : productos).map(item => (
        <div key={item.id} style={{ background: "white", borderRadius: 12, padding: "12px 14px", marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.descripcion}</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>{item.id}{item.proveedor ? ` · ${item.proveedor}` : ""}{item.tipo ? ` · ${item.tipo}` : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginLeft: 10 }}>
            <button onClick={() => abrirEdicion(seccion === "insumos" ? "insumo" : "producto", item)}
              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 12px", fontSize: 13, color: "#1a5c2e", fontWeight: 600, cursor: "pointer" }}>
              ✏️ Editar
            </button>
            <button onClick={() => setConfirmDelete({ tipo: seccion, id: item.id, nombre: item.descripcion })}
              style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "6px 10px", fontSize: 13, color: "#be123c", cursor: "pointer" }}>
              🗑️
            </button>
          </div>
        </div>
      ))}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, maxWidth: 340, width: "100%" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>¿Eliminar?</div>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>Se va a eliminar <b>{confirmDelete.nombre}</b>. Esta acción no se puede deshacer.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ padding: "11px", border: "2px solid #e5e7eb", borderRadius: 10, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                Cancelar
              </button>
              <button onClick={() => {
                confirmDelete.tipo === "insumos" ? onDeleteInsumo(confirmDelete.id) : onDeleteProducto(confirmDelete.id);
                setConfirmDelete(null);
              }} style={{ padding: "11px", background: "#ef4444", color: "white", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NuevoPedidoModal({ productos, onConfirm, onClose }) {
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [via, setVia] = useState("Teléfono");
  const [obs, setObs] = useState("");
  const [items, setItems] = useState([{ productoId: productos[0]?.id || "", descripcion: productos[0]?.descripcion || "", cantidad: 1 }]);

  function addItem() {
    setItems(prev => [...prev, { productoId: productos[0]?.id || "", descripcion: productos[0]?.descripcion || "", cantidad: 1 }]);
  }

  function updateItem(idx, productoId) {
    const prod = productos.find(p => p.id === productoId);
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, productoId, descripcion: prod?.descripcion || "" } : it));
  }

  function updateCantidad(idx, cantidad) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: Number(cantidad) } : it));
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function handleConfirm() {
    if (!cliente.trim() || items.length === 0) return;
    onConfirm({ cliente, telefono, via, obs, items });
  }

  const inputStyle = { width: "100%", border: "2px solid #e5e7eb", borderRadius: 8, padding: "9px 12px", fontSize: 14, marginBottom: 10, background: "white", outline: "none" };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
      <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 900, margin: "0 auto", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>📦 Nuevo pedido</div>

        <label style={labelStyle}>Cliente *</label>
        <input style={inputStyle} value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre del cliente o empresa" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input style={inputStyle} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Opcional" />
          </div>
          <div>
            <label style={labelStyle}>Vía</label>
            <select style={inputStyle} value={via} onChange={e => setVia(e.target.value)}>
              {["Teléfono", "Mail", "WhatsApp", "Presencial"].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <label style={labelStyle}>Productos pedidos *</label>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <select value={item.productoId} onChange={e => updateItem(idx, e.target.value)}
              style={{ flex: 1, border: "2px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "white" }}>
              {productos.map(p => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
            </select>
            <input type="number" min={1} value={item.cantidad} onChange={e => updateCantidad(idx, e.target.value)}
              style={{ width: 56, border: "2px solid #e5e7eb", borderRadius: 8, padding: "8px", fontSize: 14, textAlign: "center" }} />
            {items.length > 1 && (
              <button onClick={() => removeItem(idx)}
                style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "8px 10px", color: "#be123c", cursor: "pointer", fontSize: 14 }}>✕</button>
            )}
          </div>
        ))}
        <button onClick={addItem}
          style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: "#166534", cursor: "pointer", fontWeight: 600, marginBottom: 10 }}>
          + Agregar producto
        </button>

        <label style={labelStyle}>Observaciones</label>
        <input style={inputStyle} value={obs} onChange={e => setObs(e.target.value)} placeholder="Urgencia, fecha de entrega, etc." />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
          <button onClick={onClose}
            style={{ padding: "12px", border: "2px solid #e5e7eb", borderRadius: 10, background: "white", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
            Cancelar
          </button>
          <button onClick={handleConfirm}
            style={{ padding: "12px", background: "#1a5c2e", color: "white", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
            Guardar pedido
          </button>
        </div>
      </div>
    </div>
  );
}

function MovimientoModal({ itemTipo, insumos, productos, onConfirm, onClose }) {
  const items = itemTipo === "Insumo" ? insumos : productos;
  const [selectedId, setSelectedId] = useState(items[0]?.id || "");
  const [movimiento, setMovimiento] = useState("ENTRADA");
  const [cantidad, setCantidad] = useState(1);

  const selectedItem = items.find(i => i.id === selectedId);

  function handleConfirm() {
    if (!selectedItem || cantidad <= 0) return;
    onConfirm(itemTipo, selectedItem.id, selectedItem.descripcion, movimiento, Number(cantidad));
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", zIndex: 100 }}>
      <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
          {itemTipo === "Insumo" ? "🧲" : "🔧"} Registrar movimiento · {itemTipo}
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Producto</label>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          style={{ width: "100%", border: "2px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 14, marginBottom: 14, background: "white" }}>
          {items.map(i => <option key={i.id} value={i.id}>{i.descripcion} (stock actual: {i.stock})</option>)}
        </select>

        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Tipo de movimiento</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {["ENTRADA", "SALIDA"].map(m => (
            <button key={m} onClick={() => setMovimiento(m)}
              style={{ padding: "10px", border: `2px solid ${movimiento === m ? (m === "ENTRADA" ? "#10b981" : "#ef4444") : "#e5e7eb"}`,
                borderRadius: 8, background: movimiento === m ? (m === "ENTRADA" ? "#d1fae5" : "#fee2e2") : "white",
                color: movimiento === m ? (m === "ENTRADA" ? "#065f46" : "#991b1b") : "#6b7280",
                fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              {m === "ENTRADA" ? "📥 Entrada" : "📤 Salida"}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Cantidad</label>
        <input type="number" min={1} value={cantidad} onChange={e => setCantidad(e.target.value)}
          style={{ width: "100%", border: "2px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 16, marginBottom: 20 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={onClose}
            style={{ padding: "12px", border: "2px solid #e5e7eb", borderRadius: 10, background: "white", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
            Cancelar
          </button>
          <button onClick={handleConfirm}
            style={{ padding: "12px", background: "#1a5c2e", color: "white", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

