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
