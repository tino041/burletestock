import { useState, useRef, useEffect } from "react";

// ── SUPABASE ──────────────────────────────────────────────
const SUPABASE_URL = "https://lopijqyorwfwufmtxjjt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvcGlqcXlvcndmd3VmbXR4amp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NzI1NzcsImV4cCI6MjA5ODA0ODU3N30.zCDffkB-B14YemsMzQuzyg-Q3I69nDiNWQd4ShwRmNI";

async function sb(table, method="GET", body=null, query="") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method==="POST" ? "return=representation" : method==="PATCH"||method==="PUT" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const err = await res.text(); console.error(table, method, err); return null; }
  if (method==="DELETE") return true;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Mapeo entre formato app ↔ Supabase
function insumoToDb(i) {
  return { id:i.id, descripcion:i.descripcion, unidad:i.unidad, stock:i.stock, minimo:i.minimo, maximo:i.maximo, proveedor:i.proveedor, es_iman:!!i.esIman, es_perfil:!!i.esPerfil, es_manguera:!!i.esManguera, precio_por_metro:i.precioPorMetro||0, precio_dolar_por_metro:i.precioDolarPorMetro||0 };
}
function insumoFromDb(r) {
  return { id:r.id, descripcion:r.descripcion, unidad:r.unidad, stock:Number(r.stock), minimo:Number(r.minimo), maximo:Number(r.maximo), proveedor:r.proveedor, esIman:r.es_iman, esPerfil:r.es_perfil, esManguera:r.es_manguera, precioPorMetro:Number(r.precio_por_metro), precioDolarPorMetro:Number(r.precio_dolar_por_metro) };
}
function clienteToDb(c) {
  return { id:c.id, nombre:c.nombre, telefono:c.telefono||"", direccion:c.direccion||"", transporte:c.transporte||"", descuento:c.descuento||0 };
}
function clienteFromDb(r) { return { id:r.id, nombre:r.nombre, telefono:r.telefono, direccion:r.direccion, transporte:r.transporte, descuento:Number(r.descuento) }; }
function pedidoToDb(p) {
  return { id:p.id, fecha:p.fecha, fecha_entrega:p.fechaEntrega||null, cliente_id:p.clienteId||null, cliente:p.cliente, telefono:p.telefono||"", transporte:p.transporte||"", descuento:p.descuento||0, via:p.via||"", estado:p.estado, obs:p.obs||"", items:p.items };
}
function pedidoFromDb(r) {
  return { id:r.id, fecha:r.fecha, fechaEntrega:r.fecha_entrega, clienteId:r.cliente_id, cliente:r.cliente, telefono:r.telefono, transporte:r.transporte, descuento:Number(r.descuento), via:r.via, estado:r.estado, obs:r.obs, items:r.items||[] };
}
function movToDb(m) { return { fecha:m.fecha, codigo:m.codigo, descripcion:m.descripcion, movimiento:m.movimiento, cantidad:m.cantidad, obs:m.obs||"" }; }
function movFromDb(r) { return { fecha:r.fecha, codigo:r.codigo, descripcion:r.descripcion, movimiento:r.movimiento, cantidad:Number(r.cantidad), obs:r.obs }; }

// ── HELPERS ───────────────────────────────────────────────
function calcularMateriales(item) {
  const tipo = item.tipoProducto;
  if (!tipo) return null;
  if (tipo === "Marco" || tipo === "Burlete") {
    const a = Number(item.ancho||0), b = Number(item.alto||0);
    if (!a||!b) return null;
    return { perfilMm: 2*(a+b), imanMm: 2*(a+b) };
  }
  if (tipo === "Angulo") {
    const a = Number(item.ancho||0), b = Number(item.alto||0);
    if (!a||!b) return null;
    return { perfilMm: a+b, imanMm: a+b };
  }
  if (tipo === "Tira") {
    const l = Number(item.largo||0);
    if (!l) return null;
    return { perfilMm: l, imanMm: l };
  }
  if (tipo === "Manguera") {
    const l = Number(item.largo||0);
    if (!l) return null;
    return { perfilMm: l, imanMm: 0 };
  }
  return null;
}

function calcularPrecioItem(item, insumos, precios) {
  const mat = calcularMateriales(item);
  if (!mat) return null;
  const qty = Number(item.cantidad||1);
  const insPerfil = insumos.find(i=>i.id===item.perfilId);
  const insIman   = insumos.find(i=>i.id===item.imanId);

  // Precio perfil en pesos por metro
  const precioPerfil = insPerfil?.precioPorMetro || 0;
  // Precio imán en dólares por metro → convertir a pesos
  const precioIman   = (insIman?.precioDolarPorMetro || 0) * precios.dolar;

  const costoUnitario = (mat.perfilMm/1000)*precioPerfil + (mat.imanMm/1000)*precioIman;

  // Para ángulos en caja/bolsa: precio por unidad × cantidad de unidades en el envase
  let unidades = qty;
  if (item.tipoProducto === "Angulo" && item.presentacion === "caja") unidades = qty * 20;
  if (item.tipoProducto === "Angulo" && item.presentacion === "bolsa") unidades = qty * 20;

  const costoTotal = costoUnitario * unidades;
  const precioVenta = costoTotal * (1 + precios.ganancia/100);
  return { costoUnitario, costoTotal, precioVenta, unidades };
}

function formatPesos(n) { return `$${Number(n||0).toLocaleString("es-AR",{minimumFractionDigits:0,maximumFractionDigits:0})}`; }
function mmToM(mm) { return (mm/1000).toFixed(3); }
function today() { return new Date().toLocaleDateString("es-AR"); }

// ── DATOS INICIALES ───────────────────────────────────────
const INITIAL_PRECIOS = {
  dolar: 1200,        // cotización dólar (pesos)
  ganancia: 40,       // % ganancia
  ultimaActualizacion: today(),
};

const INITIAL_INSUMOS = [
  { id:"IMA-001", descripcion:"Imán flexible 10mm", unidad:"metro", stock:250, minimo:50, maximo:500, proveedor:"Magnoimport SA", esIman:true,   precioDolarPorMetro:0.8  },
  { id:"IMA-002", descripcion:"Imán flexible 15mm", unidad:"metro", stock:180, minimo:40, maximo:400, proveedor:"Magnoimport SA", esIman:true,   precioDolarPorMetro:1.0  },
  { id:"IMA-003", descripcion:"Imán flexible 20mm", unidad:"metro", stock:90,  minimo:30, maximo:300, proveedor:"Magnoimport SA", esIman:true,   precioDolarPorMetro:1.2  },
  { id:"PER-001", descripcion:"Perfil PVC gris 8mm",    unidad:"metro", stock:320, minimo:80, maximo:600, proveedor:"PlásticosSur", esPerfil:true,  precioPorMetro:800  },
  { id:"PER-002", descripcion:"Perfil PVC negro 10mm",  unidad:"metro", stock:210, minimo:60, maximo:500, proveedor:"PlásticosSur", esPerfil:true,  precioPorMetro:950  },
  { id:"PER-003", descripcion:"Perfil PVC blanco 12mm", unidad:"metro", stock:45,  minimo:60, maximo:400, proveedor:"PlásticosSur", esPerfil:true,  precioPorMetro:1100 },
  { id:"MAN-001", descripcion:"Manguera PVC 8mm",  unidad:"metro", stock:80, minimo:20, maximo:200, proveedor:"PlásticosSur", esManguera:true, precioPorMetro:600  },
  { id:"MAN-002", descripcion:"Manguera PVC 10mm", unidad:"metro", stock:60, minimo:15, maximo:150, proveedor:"PlásticosSur", esManguera:true, precioPorMetro:750  },
  { id:"COL-001", descripcion:"Cola de contacto",    unidad:"litro",   stock:12, minimo:5, maximo:30,  proveedor:"Ferretería Norte", precioPorMetro:0 },
  { id:"BOL-001", descripcion:"Bolsas polietileno",  unidad:"paquete", stock:15, minimo:5, maximo:40,  proveedor:"Embolsados SRL",   precioPorMetro:0 },
];

const INITIAL_CLIENTES = [
  { id:"CLI-001", nombre:"Servicio Técnico Martínez", telefono:"11-4523-9900", direccion:"Av. Corrientes 1234, CABA", transporte:"Andreani", descuento:0  },
  { id:"CLI-002", nombre:"Frigorífico El Sur",         telefono:"11-3345-7711", direccion:"Ruta 3 km 42, Lomas de Zamora", transporte:"OCA", descuento:10 },
  { id:"CLI-003", nombre:"Reparaciones López",         telefono:"11-6677-2200", direccion:"Mitre 550, Quilmes", transporte:"Retira en local", descuento:5  },
];

const INITIAL_PEDIDOS = [
  { id:"PED-001", fecha:"12/06/2026", clienteId:"CLI-001", cliente:"Servicio Técnico Martínez", telefono:"11-4523-9900", transporte:"Andreani", descuento:0, via:"Teléfono", estado:"entregado", obs:"",
    items:[{ id:1, tipoProducto:"Marco", aplicacion:"Heladera", perfilId:"PER-001", imanId:"IMA-001", ancho:600, alto:800, largo:null, cantidad:2, presentacion:null, descripcion:"Marco Heladera 600×800mm" }] },
  { id:"PED-002", fecha:"16/06/2026", clienteId:"CLI-002", cliente:"Frigorífico El Sur", telefono:"11-3345-7711", transporte:"OCA", descuento:10, via:"Mail", estado:"pendiente", obs:"Para el viernes",
    items:[
      { id:1, tipoProducto:"Marco", aplicacion:"Cámara frigorífica", perfilId:"PER-002", imanId:"IMA-002", ancho:1000, alto:2000, largo:null, cantidad:1, presentacion:null, descripcion:"Marco Cámara 1000×2000mm" },
      { id:2, tipoProducto:"Manguera", aplicacion:null, perfilId:"MAN-001", imanId:null, ancho:null, alto:null, largo:3000, cantidad:2, presentacion:null, descripcion:"Manguera PVC 8mm - 3000mm" },
    ]},
  { id:"PED-003", fecha:"18/06/2026", clienteId:"CLI-003", cliente:"Reparaciones López", telefono:"11-6677-2200", transporte:"Retira en local", descuento:5, via:"Teléfono", estado:"en fabricacion", obs:"Urgente",
    items:[{ id:1, tipoProducto:"Angulo", aplicacion:"Freezer", perfilId:"PER-001", imanId:"IMA-001", ancho:400, alto:600, largo:null, cantidad:2, presentacion:"caja", descripcion:"Ángulo Freezer 400×600mm (caja x20)" }] },
];

const INITIAL_MOVIMIENTOS = [
  { fecha:"10/06/2026", codigo:"IMA-001", descripcion:"Imán flexible 10mm", movimiento:"ENTRADA", cantidad:100, obs:"Compra Magnoimport" },
  { fecha:"11/06/2026", codigo:"PER-001", descripcion:"Perfil PVC gris 8mm", movimiento:"SALIDA",  cantidad:20,  obs:"Fabricación marcos" },
];

function getEstadoInsumo(i) {
  if (i.stock <= i.minimo) return "reponer";
  if (i.stock >= i.maximo) return "lleno";
  return "ok";
}
const estadoBadge = {
  ok:      { label:"✅ OK",       bg:"#d1fae5", color:"#065f46" },
  reponer: { label:"⚠️ Reponer",  bg:"#fee2e2", color:"#991b1b" },
  lleno:   { label:"📦 Lleno",   bg:"#fef9c3", color:"#854d0e" },
};
const TIPOS       = ["Marco","Burlete","Angulo","Tira","Manguera"];
const APLICACIONES= ["Heladera","Freezer","Exhibidora","Cámara frigorífica"];
const TRANSPORTES = ["Andreani","OCA","Correo Argentino","Retira en local","Otro"];

const G = {
  card:     { background:"white", borderRadius:12, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,0.08)", marginBottom:10 },
  inp:      { width:"100%", border:"2px solid #e5e7eb", borderRadius:8, padding:"9px 12px", fontSize:14, marginBottom:10, background:"white", outline:"none", fontFamily:"sans-serif" },
  lbl:      { fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:3 },
  btn:      (bg="#1a5c2e",color="white") => ({ background:bg, color, border:"none", borderRadius:10, padding:"11px 16px", fontWeight:700, cursor:"pointer", fontSize:14, width:"100%" }),
  secTitle: { fontWeight:700, fontSize:16, color:"#1a5c2e", marginBottom:14 },
  tag:      (bg,color) => ({ background:bg, color, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }),
};

// ── APP ───────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState("dashboard");
  const [insumos, setInsumos]   = useState(INITIAL_INSUMOS);
  const [clientes, setClientes] = useState(INITIAL_CLIENTES);
  const [pedidos, setPedidos]   = useState(INITIAL_PEDIDOS);
  const [movimientos, setMovimientos] = useState(INITIAL_MOVIMIENTOS);
  const [precios, setPrecios]   = useState(INITIAL_PRECIOS);
  const [modal, setModal]       = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [chat, setChat]         = useState([{ role:"assistant", text:"¡Hola Valentino! Soy tu asistente. Preguntame sobre stock, pedidos, precios o insumos." }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[chat]);

  // ── Cargar datos de Supabase al iniciar
  useEffect(()=>{
    async function cargarDatos() {
      setCargando(true);
      try {
        const [ins, cli, ped, mov, pre] = await Promise.all([
          sb("insumos","GET",null,"?order=id"),
          sb("clientes","GET",null,"?order=nombre"),
          sb("pedidos","GET",null,"?order=created_at.desc"),
          sb("movimientos","GET",null,"?order=created_at.desc&limit=200"),
          sb("precios","GET",null,"?id=eq.1"),
        ]);
        if (ins?.length)  setInsumos(ins.map(insumoFromDb));
        if (cli?.length)  setClientes(cli.map(clienteFromDb));
        if (ped?.length)  setPedidos(ped.map(pedidoFromDb));
        if (mov?.length)  setMovimientos(mov.map(movFromDb));
        if (pre?.length)  setPrecios({ dolar:Number(pre[0].dolar), ganancia:Number(pre[0].ganancia), ultimaActualizacion:pre[0].ultima_actualizacion });

        // Si no hay datos en Supabase, cargar los iniciales
        if (!ins?.length) {
          await Promise.all(INITIAL_INSUMOS.map(i=>sb("insumos","POST",insumoToDb(i))));
        }
        if (!cli?.length) {
          await Promise.all(INITIAL_CLIENTES.map(c=>sb("clientes","POST",clienteToDb(c))));
        }
      } catch(e) { console.error("Error cargando datos:",e); }
      setCargando(false);
    }
    cargarDatos();
  },[]);



  const alertasInsumos    = insumos.filter(i=>getEstadoInsumo(i)==="reponer");
  const pedidosPendientes = pedidos.filter(p=>p.estado!=="entregado");

  // Valor total del stock de insumos
  const valorStock = insumos.reduce((acc,ins)=>{
    if (ins.esIman)   return acc + ins.stock*(ins.precioDolarPorMetro||0)*precios.dolar;
    if (ins.esPerfil||ins.esManguera) return acc + ins.stock*(ins.precioPorMetro||0);
    return acc;
  }, 0);

  async function actualizarInsumoDb(id, changes) {
    const ins = insumos.find(i=>i.id===id);
    if (!ins) return;
    const updated = {...ins,...changes};
    setInsumos(prev=>prev.map(i=>i.id===id?updated:i));
    await sb("insumos","PATCH",insumoToDb(updated),`?id=eq.${id}`);
  }

  async function agregarMovimientoDb(mov) {
    setMovimientos(prev=>[mov,...prev]);
    await sb("movimientos","POST",movToDb(mov));
  }

  function descontarInsumos(items) {
    items.forEach(item=>{
      const mat = calcularMateriales(item);
      if (!mat) return;
      let qty = Number(item.cantidad||1);
      if (item.tipoProducto==="Angulo" && (item.presentacion==="caja"||item.presentacion==="bolsa")) qty *= 20;
      if (mat.perfilMm>0&&item.perfilId) {
        const metros=(mat.perfilMm*qty)/1000;
        const ins=insumos.find(i=>i.id===item.perfilId);
        const nuevoStock=Math.max(0,(ins?.stock||0)-metros);
        actualizarInsumoDb(item.perfilId,{stock:nuevoStock});
        agregarMovimientoDb({fecha:today(),codigo:item.perfilId,descripcion:ins?.descripcion||item.perfilId,movimiento:"SALIDA",cantidad:metros.toFixed(3),obs:`Fabricación: ${item.descripcion}`});
      }
      if (mat.imanMm>0&&item.imanId) {
        const metros=(mat.imanMm*qty)/1000;
        const ins=insumos.find(i=>i.id===item.imanId);
        const nuevoStock=Math.max(0,(ins?.stock||0)-metros);
        actualizarInsumoDb(item.imanId,{stock:nuevoStock});
        agregarMovimientoDb({fecha:today(),codigo:item.imanId,descripcion:ins?.descripcion||item.imanId,movimiento:"SALIDA",cantidad:metros.toFixed(3),obs:`Fabricación: ${item.descripcion}`});
      }
    });
  }

  async function cambiarEstado(pedidoId, nuevoEstado) {
    const p=pedidos.find(p=>p.id===pedidoId);
    if (nuevoEstado==="en fabricacion"&&p) descontarInsumos(p.items);
    setPedidos(prev=>prev.map(p=>p.id===pedidoId?{...p,estado:nuevoEstado}:p));
    await sb("pedidos","PATCH",{estado:nuevoEstado},`?id=eq.${pedidoId}`);
  }
  async function entregarPedido(pedidoId) {
    const fechaEntrega=today();
    setPedidos(prev=>prev.map(p=>p.id===pedidoId?{...p,estado:"entregado",fechaEntrega}:p));
    await sb("pedidos","PATCH",{estado:"entregado",fecha_entrega:fechaEntrega},`?id=eq.${pedidoId}`);
  }
  async function agregarPedido(pedido) {
    const id=`PED-${String(Date.now()).slice(-4)}`;
    const nuevo={...pedido,id,fecha:today(),estado:"pendiente"};
    setPedidos(prev=>[nuevo,...prev]);
    await sb("pedidos","POST",pedidoToDb(nuevo));
    setModal(null);
  }

  function calcTotalPedido(pedido) {
    const subtotal = pedido.items.reduce((acc,item)=>{
      const p = calcularPrecioItem(item,insumos,precios);
      return acc + (p?.precioVenta||0);
    },0);
    const desc = pedido.descuento||0;
    return { subtotal, descuentoMonto: subtotal*desc/100, total: subtotal*(1-desc/100) };
  }

  function imprimirPedido(pedido) {
    const totales = calcTotalPedido(pedido);
    const win=window.open("","_blank");
    win.document.write(`<html><head><title>Pedido ${pedido.id}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;max-width:700px;margin:0 auto;color:#111}
      h1{color:#1a5c2e;font-size:22px;margin-bottom:4px}
      .sub{color:#6b7280;font-size:13px;margin-bottom:24px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
      .blk{background:#f9fafb;border-radius:8px;padding:12px}
      .blk-t{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:6px}
      .blk-v{font-size:14px;font-weight:600}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{background:#1a5c2e;color:white;padding:10px 12px;text-align:left;font-size:13px}
      td{padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}
      .totales{background:#f9fafb;border-radius:8px;padding:16px;text-align:right}
      .total-final{font-size:18px;font-weight:800;color:#1a5c2e}
      .footer{margin-top:40px;border-top:1px solid #e5e7eb;padding-top:16px;font-size:12px;color:#9ca3af}
      @media print{body{padding:16px}}
    </style></head><body>
    <h1>🏭 BurleteStock — Pedido ${pedido.id}</h1>
    <div class="sub">Fecha: ${pedido.fecha} · Vía: ${pedido.via}</div>
    <div class="grid">
      <div class="blk"><div class="blk-t">Cliente</div><div class="blk-v">${pedido.cliente}</div>${pedido.telefono?`<div style="font-size:13px;color:#6b7280;margin-top:4px">📞 ${pedido.telefono}</div>`:""}</div>
      <div class="blk"><div class="blk-t">Transporte</div><div class="blk-v">${pedido.transporte||"—"}</div></div>
    </div>
    ${pedido.obs?`<div class="blk" style="margin-bottom:24px"><div class="blk-t">Observaciones</div><div class="blk-v">${pedido.obs}</div></div>`:""}
    <table>
      <tr><th>Producto</th><th>Medidas</th><th>Presentación</th><th>Cant.</th><th>Precio</th></tr>
      ${pedido.items.map(item=>{
        const medida=item.ancho?`${item.ancho}×${item.alto}mm`:item.largo?`${item.largo}mm`:"—";
        const pres=item.presentacion?item.presentacion.charAt(0).toUpperCase()+item.presentacion.slice(1):"—";
        const p=calcularPrecioItem(item,insumos,precios);
        return `<tr><td>${item.tipoProducto}${item.aplicacion?" — "+item.aplicacion:""}</td><td>${medida}</td><td>${pres}</td><td>${item.cantidad}</td><td>${p?formatPesos(p.precioVenta):"—"}</td></tr>`;
      }).join("")}
    </table>
    <div class="totales">
      <div>Subtotal: <b>${formatPesos(totales.subtotal)}</b></div>
      ${pedido.descuento?`<div>Descuento ${pedido.descuento}%: <b>-${formatPesos(totales.descuentoMonto)}</b></div>`:""}
      <div class="total-final">TOTAL: ${formatPesos(totales.total)}</div>
    </div>
    <div class="footer">Generado por BurleteStock · ${today()} · Dólar: $${precios.dolar}</div>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
    win.document.close();
  }

  async function sendChat() {
    if (!chatInput.trim()||chatLoading) return;
    const msg=chatInput.trim(); setChatInput("");
    setChat(prev=>[...prev,{role:"user",text:msg}]);
    setChatLoading(true);
    const ctx=`INSUMOS:\n${insumos.map(i=>`- ${i.descripcion}: ${typeof i.stock==="number"?i.stock.toFixed(1):i.stock}${i.unidad} (mín:${i.minimo}) [${getEstadoInsumo(i)}]`).join("\n")}\nPEDIDOS PENDIENTES: ${pedidosPendientes.length}\nDÓLAR: $${precios.dolar}\nVALOR STOCK: ${formatPesos(valorStock)}`;
    try {
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,system:`Asistente de stock para empresa argentina de burletes. Dueño: Valentino. Español rioplatense, breve.\n${ctx}`,messages:[...chat.slice(1).map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.text})),{role:"user",content:msg}]})});
      const data=await res.json();
      setChat(prev=>[...prev,{role:"assistant",text:data.content?.[0]?.text||"Error."}]);
    } catch { setChat(prev=>[...prev,{role:"assistant",text:"Error de conexión."}]); }
    setChatLoading(false);
  }

  const tabs=[
    {id:"dashboard",    label:"Panel",        icon:"📊"},
    {id:"pedidos",      label:"Pedidos",      icon:"📦", badge:pedidosPendientes.length},
    {id:"clientes",     label:"Clientes",     icon:"👥"},
    {id:"insumos",      label:"Insumos",      icon:"🧲"},
    {id:"precios",      label:"Precios",      icon:"💰"},
    {id:"estadisticas", label:"Estadísticas", icon:"📈"},
    {id:"movimientos",  label:"Historial",    icon:"📋"},
    {id:"ia",           label:"IA",           icon:"🤖"},
    {id:"config",       label:"Config",       icon:"⚙️"},
  ];
  const currentTab=tabs.find(t=>t.id===tab);

  return (
    <div style={{fontFamily:"sans-serif",background:"#f0f4f1",height:"100vh",maxWidth:1200,margin:"0 auto",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#1a5c2e 0%,#2d8a4e 100%)",padding:"12px 16px",color:"white",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,maxWidth:1200,margin:"0 auto"}}>
          <button onClick={()=>setMenuOpen(o=>!o)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,padding:"8px 11px",cursor:"pointer",color:"white",fontSize:18,lineHeight:1}}>
            {menuOpen?"✕":"☰"}
          </button>
          <span style={{fontSize:22}}>🏭</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:17}}>BurleteStock</div>
            <div style={{fontSize:11,opacity:0.75}}>{currentTab?.icon} {currentTab?.label}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,opacity:0.75}}>💵 ${precios.dolar.toLocaleString("es-AR")}</div>
            {(alertasInsumos.length+pedidosPendientes.length)>0&&<div style={{background:"#ef4444",borderRadius:20,padding:"2px 8px",fontSize:11,fontWeight:700,marginTop:2}}>{alertasInsumos.length+pedidosPendientes.length} alertas</div>}
          </div>
        </div>
      </div>

      {/* MENÚ LATERAL */}
      {menuOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:200}} onClick={()=>setMenuOpen(false)}>
          <div style={{position:"absolute",top:0,left:0,bottom:0,width:260,background:"white",boxShadow:"4px 0 24px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:"linear-gradient(135deg,#1a5c2e 0%,#2d8a4e 100%)",padding:"28px 20px 20px"}}>
              <div style={{fontSize:28}}>🏭</div>
              <div style={{fontWeight:700,fontSize:18,color:"white",marginTop:6}}>BurleteStock</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>Control de inventario</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.9)",marginTop:6,fontWeight:600}}>💰 Stock: {formatPesos(valorStock)}</div>
            </div>
            <div style={{flex:1,padding:"10px 8px",overflowY:"auto"}}>
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>{setTab(t.id);setMenuOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:"none",borderRadius:10,cursor:"pointer",marginBottom:2,textAlign:"left",background:tab===t.id?"#f0fdf4":"transparent",color:tab===t.id?"#1a5c2e":"#374151",fontWeight:tab===t.id?700:400,fontSize:15}}>
                  <span style={{fontSize:20}}>{t.icon}</span>
                  <span style={{flex:1}}>{t.label}</span>
                  {t.badge>0&&<span style={{background:"#ef4444",color:"white",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700}}>{t.badge}</span>}
                  {tab===t.id&&<span style={{color:"#1a5c2e"}}>●</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO */}
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{padding:"16px",maxWidth:800,margin:"0 auto"}}>

          {/* DASHBOARD */}
          {tab==="dashboard"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
                {[
                  {label:"Pedidos pendientes", value:pedidosPendientes.length, color:pedidosPendientes.length>0?"#3b82f6":"#10b981", icon:"📦", action:()=>setTab("pedidos")},
                  {label:"Insumos a reponer",  value:alertasInsumos.length,    color:alertasInsumos.length>0?"#ef4444":"#10b981",   icon:"⚠️", action:()=>setTab("insumos")},
                  {label:"Valor del stock",    value:formatPesos(valorStock),   color:"#8b5cf6", icon:"💰", action:()=>setTab("precios")},
                  {label:"Clientes",           value:clientes.length,           color:"#10b981", icon:"👥", action:()=>setTab("clientes")},
                ].map((c,i)=>(
                  <div key={i} onClick={c.action} style={{...G.card,cursor:c.action?"pointer":"default",marginBottom:0}}>
                    <div style={{fontSize:24}}>{c.icon}</div>
                    <div style={{fontSize:typeof c.value==="string"?18:30,fontWeight:800,color:c.color,lineHeight:1.2,marginTop:4}}>{c.value}</div>
                    <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{c.label}</div>
                  </div>
                ))}
              </div>
              {alertasInsumos.length>0&&(
                <div style={G.card}>
                  <div style={{fontWeight:700,color:"#991b1b",marginBottom:10}}>🚨 Insumos a reponer</div>
                  {alertasInsumos.map(i=>(
                    <div key={i.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
                      <div><div style={{fontWeight:600,fontSize:13}}>{i.descripcion}</div><div style={{fontSize:11,color:"#9ca3af"}}>{i.proveedor}</div></div>
                      <div style={{textAlign:"right"}}><div style={{color:"#ef4444",fontWeight:700}}>{typeof i.stock==="number"?i.stock.toFixed(1):i.stock} {i.unidad}</div><div style={{fontSize:11,color:"#9ca3af"}}>mín: {i.minimo}</div></div>
                    </div>
                  ))}
                </div>
              )}
              {alertasInsumos.length===0&&pedidosPendientes.length===0&&(
                <div style={{...G.card,textAlign:"center",background:"#d1fae5"}}>
                  <div style={{fontSize:36}}>✅</div>
                  <div style={{fontWeight:700,color:"#065f46",marginTop:6}}>Todo en orden</div>
                </div>
              )}
            </div>
          )}

          {/* PEDIDOS */}
          {tab==="pedidos"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={G.secTitle}>📦 Pedidos</div>
                <button onClick={()=>setModal({tipo:"nuevoPedido"})} style={{background:"#1a5c2e",color:"white",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",fontWeight:600}}>+ Nuevo</button>
              </div>
              {["pendiente","en fabricacion","listo","entregado"].map(estado=>{
                const items=pedidos.filter(p=>p.estado===estado);
                if (!items.length) return null;
                const cfg={
                  pendiente:       {label:"🕐 Pendientes",          border:"#3b82f6"},
                  "en fabricacion":{label:"🔨 En fabricación",      border:"#f59e0b"},
                  listo:           {label:"✅ Listos para entregar", border:"#10b981"},
                  entregado:       {label:"📬 Entregados",          border:"#d1d5db"},
                }[estado];
                return (
                  <div key={estado} style={{marginBottom:18}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>{cfg.label}</div>
                    {items.map(pedido=>{
                      const totales=calcTotalPedido(pedido);
                      return (
                        <div key={pedido.id} style={{...G.card,borderLeft:`4px solid ${cfg.border}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                            <div>
                              <div style={{fontWeight:700,fontSize:15}}>{pedido.cliente}</div>
                              <div style={{fontSize:11,color:"#9ca3af"}}>{pedido.id} · {pedido.fecha} · {pedido.via}</div>
                              {pedido.telefono&&<div style={{fontSize:11,color:"#6b7280"}}>📞 {pedido.telefono}</div>}
                              {pedido.transporte&&<div style={{fontSize:11,color:"#6b7280"}}>🚚 {pedido.transporte}</div>}
                              {pedido.descuento>0&&<div style={{fontSize:11,color:"#059669"}}>🏷️ Descuento {pedido.descuento}%</div>}
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontWeight:800,fontSize:16,color:"#1a5c2e"}}>{formatPesos(totales.total)}</div>
                              <button onClick={()=>imprimirPedido(pedido)} style={{background:"#f3f4f6",border:"none",borderRadius:8,padding:"4px 8px",cursor:"pointer",fontSize:14,marginTop:4}}>🖨️</button>
                            </div>
                          </div>
                          {pedido.items.map((item,i)=>{
                            const mat=calcularMateriales(item);
                            const p=calcularPrecioItem(item,insumos,precios);
                            return (
                              <div key={i} style={{background:"#f9fafb",borderRadius:8,padding:"8px 10px",marginBottom:4}}>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                                  <span style={{fontWeight:600}}>{item.descripcion}</span>
                                  <span style={{fontWeight:700,color:"#1a5c2e"}}>{p?formatPesos(p.precioVenta):"—"}</span>
                                </div>
                                <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>
                                  x{item.cantidad}{item.presentacion?` (${item.presentacion})`:""}{mat?` · Perfil: ${mmToM(mat.perfilMm*(item.tipoProducto==="Angulo"&&item.presentacion?item.cantidad*20:item.cantidad))}m`:""}
                                </div>
                              </div>
                            );
                          })}
                          {pedido.obs&&<div style={{fontSize:12,color:"#6b7280",marginTop:6,fontStyle:"italic"}}>📝 {pedido.obs}</div>}
                          {estado!=="entregado"&&(
                            <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                              {estado==="pendiente"&&<button onClick={()=>cambiarEstado(pedido.id,"en fabricacion")} style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#92400e",fontWeight:600,cursor:"pointer"}}>🔨 Iniciar fabricación</button>}
                              {estado==="pendiente"&&<button onClick={()=>cambiarEstado(pedido.id,"listo")} style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#166534",fontWeight:600,cursor:"pointer"}}>✅ Ya listo</button>}
                              {estado==="en fabricacion"&&<button onClick={()=>cambiarEstado(pedido.id,"listo")} style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#166534",fontWeight:600,cursor:"pointer"}}>✅ Marcar listo</button>}
                              {estado==="listo"&&<button onClick={()=>entregarPedido(pedido.id)} style={{background:"#1a5c2e",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,color:"white",fontWeight:700,cursor:"pointer"}}>📬 Confirmar entrega</button>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* CLIENTES */}
          {tab==="clientes"&&<ClientesTab clientes={clientes}
            onGuardarCliente={async(cli, esNuevo)=>{
              if (esNuevo) { setClientes(prev=>[...prev,cli]); await sb("clientes","POST",clienteToDb(cli)); }
              else { setClientes(prev=>prev.map(c=>c.id===cli.id?cli:c)); await sb("clientes","PATCH",clienteToDb(cli),`?id=eq.${cli.id}`); }
            }}
            onEliminarCliente={async id=>{ setClientes(prev=>prev.filter(c=>c.id!==id)); await sb("clientes","DELETE",null,`?id=eq.${id}`); }}
            onNuevoPedido={c=>setModal({tipo:"nuevoPedido",clientePrefill:c})}
          />}

          {/* INSUMOS */}
          {tab==="insumos"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={G.secTitle}>🧲 Insumos</div>
                <button onClick={()=>setModal({tipo:"entradaInsumo"})} style={{background:"#1a5c2e",color:"white",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",fontWeight:600}}>+ Entrada</button>
              </div>
              <div style={{...G.card,background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",marginBottom:16}}>
                <div style={{fontSize:12,color:"#166534",fontWeight:600}}>💰 Valor total del stock</div>
                <div style={{fontSize:28,fontWeight:800,color:"#1a5c2e"}}>{formatPesos(valorStock)}</div>
                <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>Dólar a ${precios.dolar.toLocaleString("es-AR")}</div>
              </div>
              {[
                {label:"Imanes",       items:insumos.filter(i=>i.esIman)},
                {label:"Perfiles PVC", items:insumos.filter(i=>i.esPerfil)},
                {label:"Mangueras",    items:insumos.filter(i=>i.esManguera)},
                {label:"Otros",        items:insumos.filter(i=>!i.esIman&&!i.esPerfil&&!i.esManguera)},
              ].filter(g=>g.items.length>0).map(grupo=>(
                <div key={grupo.label} style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>{grupo.label}</div>
                  {grupo.items.map(item=>{
                    const est=getEstadoInsumo(item);
                    const badge=estadoBadge[est];
                    const pct=Math.min(100,(item.stock/item.maximo)*100);
                    const valorItem=item.esIman
                      ? item.stock*(item.precioDolarPorMetro||0)*precios.dolar
                      : item.stock*(item.precioPorMetro||0);
                    return (
                      <div key={item.id} style={G.card}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                          <div>
                            <div style={{fontWeight:700,fontSize:13}}>{item.descripcion}</div>
                            <div style={{fontSize:11,color:"#9ca3af"}}>{item.id} · {item.proveedor}</div>
                            <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>
                              {item.esIman?`USD ${item.precioDolarPorMetro||0}/m → ${formatPesos((item.precioDolarPorMetro||0)*precios.dolar)}/m`:`${formatPesos(item.precioPorMetro||0)}/m`}
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <span style={G.tag(badge.bg,badge.color)}>{badge.label}</span>
                            <div style={{fontSize:12,fontWeight:700,color:"#8b5cf6",marginTop:4}}>{formatPesos(valorItem)}</div>
                          </div>
                        </div>
                        <div style={{marginTop:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280",marginBottom:4}}>
                            <span>Stock: <b style={{color:"#111"}}>{typeof item.stock==="number"?item.stock.toFixed(1):item.stock} {item.unidad}</b></span>
                            <span>Máx: {item.maximo}</span>
                          </div>
                          <div style={{background:"#f3f4f6",borderRadius:4,height:6}}>
                            <div style={{width:`${pct}%`,background:est==="reponer"?"#ef4444":est==="lleno"?"#f59e0b":"#10b981",height:6,borderRadius:4}}/>
                          </div>
                          <div style={{fontSize:11,color:"#9ca3af",marginTop:3}}>Mínimo: {item.minimo} {item.unidad}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* PRECIOS */}
          {tab==="precios"&&(
            <PreciosTab precios={precios}
              onGuardarPrecios={async p=>{
                setPrecios(p);
                await sb("precios","PATCH",{dolar:p.dolar,ganancia:p.ganancia,ultima_actualizacion:p.ultimaActualizacion},"?id=eq.1");
              }}
              insumos={insumos}
              onUpdatePrecioInsumo={async(id,changes)=>{
                const ins=insumos.find(i=>i.id===id);
                const updated={...ins,...changes};
                setInsumos(prev=>prev.map(i=>i.id===id?updated:i));
                await sb("insumos","PATCH",insumoToDb(updated),`?id=eq.${id}`);
              }}
            />
          )}

          {/* ESTADÍSTICAS */}
          {tab==="estadisticas"&&<EstadisticasTab pedidos={pedidos} insumos={insumos} precios={precios} clientes={clientes}/>}

          {/* HISTORIAL */}
          {tab==="movimientos"&&(
            <div>
              <div style={G.secTitle}>📋 Historial</div>
              {movimientos.map((m,i)=>(
                <div key={i} style={{...G.card,borderLeft:`4px solid ${m.movimiento==="ENTRADA"?"#10b981":"#ef4444"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <div><div style={{fontWeight:600,fontSize:13}}>{m.descripcion}</div><div style={{fontSize:11,color:"#9ca3af"}}>{m.codigo}</div>{m.obs&&<div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{m.obs}</div>}</div>
                    <div style={{textAlign:"right"}}><div style={{fontWeight:700,color:m.movimiento==="ENTRADA"?"#10b981":"#ef4444",fontSize:16}}>{m.movimiento==="ENTRADA"?"+":"-"}{m.cantidad}m</div><div style={{fontSize:11,color:"#9ca3af"}}>{m.fecha}</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* IA */}
          {tab==="ia"&&(
            <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 120px)"}}>
              <div style={G.secTitle}>🤖 Asistente IA</div>
              <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,paddingBottom:10}}>
                {chat.map((m,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                    <div style={{maxWidth:"85%",padding:"10px 14px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?"#1a5c2e":"white",color:m.role==="user"?"white":"#111",fontSize:14,lineHeight:1.5,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>{m.text}</div>
                  </div>
                ))}
                {chatLoading&&<div style={{display:"flex",gap:4,padding:"10px 14px",background:"white",borderRadius:"16px 16px 16px 4px",width:60}}>{[0,1,2].map(j=><div key={j} style={{width:6,height:6,borderRadius:"50%",background:"#9ca3af",animation:`bounce 1s ${j*0.2}s infinite`}}/>)}</div>}
                <div ref={chatEndRef}/>
              </div>
              <div style={{display:"flex",gap:8,paddingTop:10}}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Preguntame sobre el stock..." style={{flex:1,border:"2px solid #e5e7eb",borderRadius:10,padding:"10px 14px",fontSize:14,outline:"none"}}/>
                <button onClick={sendChat} disabled={chatLoading} style={{background:"#1a5c2e",color:"white",border:"none",borderRadius:10,padding:"10px 16px",cursor:"pointer",fontWeight:700,fontSize:16}}>➤</button>
              </div>
              <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                {["¿Qué reponer?","¿Cuánto vale el stock?","¿Pedidos pendientes?"].map(q=>(
                  <button key={q} onClick={()=>setChatInput(q)} style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:20,padding:"4px 10px",fontSize:11,color:"#166534",cursor:"pointer"}}>{q}</button>
                ))}
              </div>
            </div>
          )}

          {/* CONFIG */}
          {tab==="config"&&<ConfigInsumos insumos={insumos}
            onUpdateInsumo={async(id,ch)=>{
              const ins=insumos.find(i=>i.id===id);
              const updated={...ins,...ch};
              setInsumos(prev=>prev.map(i=>i.id===id?updated:i));
              await sb("insumos","PATCH",insumoToDb(updated),`?id=eq.${id}`);
            }}
            onAddInsumo={async item=>{
              setInsumos(prev=>[...prev,item]);
              await sb("insumos","POST",insumoToDb(item));
            }}
            onDeleteInsumo={async id=>{
              setInsumos(prev=>prev.filter(i=>i.id!==id));
              await sb("insumos","DELETE",null,`?id=eq.${id}`);
            }}
          />}

        </div>
      </div>

      {/* LOADING */}
      {cargando&&(
        <div style={{position:"fixed",inset:0,background:"rgba(255,255,255,0.95)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:500}}>
          <div style={{fontSize:48,marginBottom:16}}>🏭</div>
          <div style={{fontWeight:700,fontSize:18,color:"#1a5c2e",marginBottom:8}}>BurleteStock</div>
          <div style={{fontSize:14,color:"#6b7280"}}>Cargando datos...</div>
          <div style={{marginTop:20,display:"flex",gap:6}}>{[0,1,2].map(j=><div key={j} style={{width:8,height:8,borderRadius:"50%",background:"#1a5c2e",animation:`bounce 1s ${j*0.2}s infinite`}}/>)}</div>
        </div>
      )}

        </div>
      </div>

      {/* MODALES */}
      {modal?.tipo==="nuevoPedido"&&<NuevoPedidoModal insumos={insumos} clientes={clientes} clientePrefill={modal.clientePrefill} precios={precios} onConfirm={agregarPedido} onClose={()=>setModal(null)}/>}
      {modal?.tipo==="entradaInsumo"&&<EntradaInsumoModal insumos={insumos} onConfirm={async(id,cantidad)=>{
        const ins=insumos.find(i=>i.id===id);
        const nuevoStock=(ins?.stock||0)+Number(cantidad);
        const mov={fecha:today(),codigo:id,descripcion:ins?.descripcion||id,movimiento:"ENTRADA",cantidad:Number(cantidad),obs:"Compra"};
        setInsumos(prev=>prev.map(i=>i.id===id?{...i,stock:nuevoStock}:i));
        setMovimientos(prev=>[mov,...prev]);
        await sb("insumos","PATCH",{stock:nuevoStock},`?id=eq.${id}`);
        await sb("movimientos","POST",movToDb(mov));
        setModal(null);
      }} onClose={()=>setModal(null)}/>}

      <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}*{box-sizing:border-box}input:focus,select:focus{border-color:#1a5c2e!important}`}</style>
    </div>
  );
}

// ── PRECIOS TAB ───────────────────────────────────────────
function PreciosTab({ precios, onGuardarPrecios, insumos, onUpdatePrecioInsumo }) {
  const [form, setForm] = useState({...precios});
  const [guardado, setGuardado] = useState(false);

  function guardar() {
    onGuardarPrecios({...form, ultimaActualizacion: today()});
    setGuardado(true);
    setTimeout(()=>setGuardado(false), 2000);
  }

  return (
    <div>
      <div style={G.secTitle}>💰 Precios y cotización</div>

      {/* Cotización del día */}
      <div style={G.card}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#374151"}}>📅 Valores del día</div>
        <div style={{fontSize:11,color:"#9ca3af",marginBottom:12}}>Última actualización: {precios.ultimaActualizacion}</div>

        <label style={G.lbl}>💵 Cotización dólar (pesos)</label>
        <input type="number" style={G.inp} value={form.dolar} onChange={e=>setForm(f=>({...f,dolar:Number(e.target.value)}))} placeholder="ej: 1200"/>

        <label style={G.lbl}>📈 % Ganancia general</label>
        <input type="number" style={G.inp} value={form.ganancia} onChange={e=>setForm(f=>({...f,ganancia:Number(e.target.value)}))} placeholder="ej: 40"/>

        <button onClick={guardar} style={{...G.btn(), marginTop:4}}>
          {guardado?"✅ Guardado":"Actualizar valores"}
        </button>
      </div>

      {/* Precios de insumos */}
      <div style={{fontWeight:700,fontSize:14,color:"#374151",marginBottom:10,marginTop:8}}>🧲 Precio de insumos por metro</div>
      {insumos.filter(i=>i.esIman||i.esPerfil||i.esManguera).map(ins=>(
        <div key={ins.id} style={G.card}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:8}}>{ins.descripcion}</div>
          {ins.esIman ? (
            <div>
              <label style={G.lbl}>Precio en USD por metro</label>
              <input type="number" step="0.01" style={G.inp} value={ins.precioDolarPorMetro||0}
                onChange={e=>onUpdatePrecioInsumo(ins.id,{precioDolarPorMetro:Number(e.target.value)})}/>
              <div style={{fontSize:12,color:"#6b7280"}}>= {formatPesos((ins.precioDolarPorMetro||0)*precios.dolar)}/m al dólar actual</div>
            </div>
          ) : (
            <div>
              <label style={G.lbl}>Precio en pesos por metro</label>
              <input type="number" style={G.inp} value={ins.precioPorMetro||0}
                onChange={e=>onUpdatePrecioInsumo(ins.id,{precioPorMetro:Number(e.target.value)})}/>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── CLIENTES TAB ──────────────────────────────────────────
function ClientesTab({ clientes, onGuardarCliente, onEliminarCliente, onNuevoPedido }) {
  const [editando, setEditando] = useState(null);
  const [form, setForm]         = useState({});
  const [buscar, setBuscar]     = useState("");

  const filtrados = clientes.filter(c=>c.nombre.toLowerCase().includes(buscar.toLowerCase()));

  async function guardar() {
    if (!form.nombre?.trim()) return;
    const esNuevo = !!editando.nuevo;
    const cli = esNuevo ? {...form, id:`CLI-${String(Date.now()).slice(-4)}`} : form;
    await onGuardarCliente(cli, esNuevo);
    setEditando(null);
  }

  if (editando) return (
    <div>
      <button onClick={()=>setEditando(null)} style={{background:"none",border:"none",color:"#1a5c2e",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:16,padding:0}}>← Volver</button>
      <div style={G.card}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>{editando.nuevo?"➕ Nuevo cliente":"✏️ Editar cliente"}</div>
        {[["nombre","Nombre *"],["telefono","Teléfono"],["direccion","Dirección"]].map(([key,label])=>(
          <div key={key}><label style={G.lbl}>{label}</label><input style={G.inp} value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}/></div>
        ))}
        <label style={G.lbl}>Transporte habitual</label>
        <input style={G.inp} value={form.transporte||""} onChange={e=>setForm(f=>({...f,transporte:e.target.value}))} placeholder="Andreani, OCA..." list="tlist"/>
        <datalist id="tlist">{TRANSPORTES.map(t=><option key={t} value={t}/>)}</datalist>
        <label style={G.lbl}>Descuento (%)</label>
        <input type="number" min={0} max={100} style={G.inp} value={form.descuento||0} onChange={e=>setForm(f=>({...f,descuento:Number(e.target.value)}))} placeholder="0"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:6}}>
          <button onClick={()=>setEditando(null)} style={{padding:"11px",border:"2px solid #e5e7eb",borderRadius:10,background:"white",fontWeight:600,cursor:"pointer",fontSize:14}}>Cancelar</button>
          <button onClick={guardar} style={{padding:"11px",background:"#1a5c2e",color:"white",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer",fontSize:14}}>Guardar</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={G.secTitle}>👥 Clientes</div>
        <button onClick={()=>{setEditando({nuevo:true});setForm({id:"",nombre:"",telefono:"",direccion:"",transporte:"",descuento:0});}} style={{background:"#1a5c2e",color:"white",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",fontWeight:600}}>+ Nuevo</button>
      </div>
      <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="🔍 Buscar cliente..." style={{...G.inp,marginBottom:14}}/>
      {filtrados.map(c=>(
        <div key={c.id} style={G.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15}}>{c.nombre}</div>
              {c.telefono&&<div style={{fontSize:12,color:"#6b7280",marginTop:2}}>📞 {c.telefono}</div>}
              {c.direccion&&<div style={{fontSize:12,color:"#6b7280"}}>📍 {c.direccion}</div>}
              {c.transporte&&<div style={{fontSize:12,color:"#6b7280"}}>🚚 {c.transporte}</div>}
              {c.descuento>0&&<div style={{fontSize:12,color:"#059669",fontWeight:600}}>🏷️ {c.descuento}% descuento</div>}
            </div>
            <div style={{display:"flex",gap:6,marginLeft:10,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
              <button onClick={()=>onNuevoPedido(c)} style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"6px 10px",fontSize:12,color:"#166534",fontWeight:600,cursor:"pointer"}}>+ Pedido</button>
              <button onClick={()=>{setEditando({id:c.id});setForm({...c});}} style={{background:"#f3f4f6",border:"none",borderRadius:8,padding:"6px 10px",fontSize:13,cursor:"pointer"}}>✏️</button>
              <button onClick={()=>onEliminarCliente(c.id)} style={{background:"#fff1f2",border:"1px solid #fecdd3",borderRadius:8,padding:"6px 10px",fontSize:13,color:"#be123c",cursor:"pointer"}}>🗑️</button>
            </div>
          </div>
        </div>
      ))}
      {filtrados.length===0&&<div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>No hay clientes</div>}
    </div>
  );
}

// ── NUEVO PEDIDO MODAL ────────────────────────────────────
function NuevoPedidoModal({ insumos, clientes, clientePrefill, precios, onConfirm, onClose }) {
  const [clienteId,   setClienteId]   = useState(clientePrefill?.id||"");
  const [cliente,     setCliente]     = useState(clientePrefill?.nombre||"");
  const [telefono,    setTelefono]    = useState(clientePrefill?.telefono||"");
  const [transporte,  setTransporte]  = useState(clientePrefill?.transporte||"");
  const [descuento,   setDescuento]   = useState(clientePrefill?.descuento||0);
  const [via,         setVia]         = useState("Teléfono");
  const [obs,         setObs]         = useState("");
  const [items,       setItems]       = useState([newItem()]);

  function newItem() { return {id:Date.now(),tipoProducto:"Marco",aplicacion:"Heladera",perfilId:"",imanId:"",ancho:"",alto:"",largo:"",cantidad:1,presentacion:null}; }

  function buildDesc(item) {
    const pres=item.presentacion?` (${item.presentacion} x20)`:"";
    if (["Marco","Burlete","Angulo"].includes(item.tipoProducto)) return `${item.tipoProducto} ${item.aplicacion||""} ${item.ancho}×${item.alto}mm${pres}`;
    if (item.tipoProducto==="Tira") return `Tira ${item.aplicacion||""} ${item.largo}mm`;
    return `Manguera ${item.largo}mm`;
  }

  function upd(idx,key,val) { setItems(prev=>prev.map((it,i)=>i!==idx?it:{...it,[key]:val})); }

  function selCliente(id) {
    const c=clientes.find(c=>c.id===id);
    if (!c) return;
    setClienteId(id); setCliente(c.nombre); setTelefono(c.telefono||""); setTransporte(c.transporte||""); setDescuento(c.descuento||0);
  }

  const perfiles=insumos.filter(i=>i.esPerfil||i.esManguera);
  const imanes=insumos.filter(i=>i.esIman);
  const subtotal=items.reduce((acc,item)=>{const p=calcularPrecioItem(item,insumos,precios);return acc+(p?.precioVenta||0);},0);
  const total=subtotal*(1-(descuento||0)/100);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}}>
      <div style={{background:"white",borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:600,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>📦 Nuevo pedido</div>

        <label style={G.lbl}>Cliente</label>
        <select style={G.inp} value={clienteId} onChange={e=>selCliente(e.target.value)}>
          <option value="">— Seleccionar cliente guardado —</option>
          {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}{c.descuento>0?` (${c.descuento}% dto)`:""}</option>)}
        </select>
        {!clienteId&&<><label style={G.lbl}>Nombre *</label><input style={G.inp} value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="Nombre del cliente"/></>}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div><label style={G.lbl}>Transporte</label><input style={G.inp} value={transporte} onChange={e=>setTransporte(e.target.value)} list="tlist2"/><datalist id="tlist2">{TRANSPORTES.map(t=><option key={t} value={t}/>)}</datalist></div>
          <div><label style={G.lbl}>Vía</label><select style={G.inp} value={via} onChange={e=>setVia(e.target.value)}>{["Teléfono","Mail","WhatsApp","Presencial"].map(v=><option key={v}>{v}</option>)}</select></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div><label style={G.lbl}>Descuento (%)</label><input type="number" min={0} max={100} style={G.inp} value={descuento} onChange={e=>setDescuento(Number(e.target.value))}/></div>
          <div style={{display:"flex",alignItems:"flex-end",paddingBottom:10}}>
            {descuento>0&&<div style={{fontSize:13,color:"#059669",fontWeight:600}}>🏷️ {descuento}% de descuento</div>}
          </div>
        </div>

        <div style={{fontWeight:700,fontSize:13,color:"#1a5c2e",margin:"10px 0 8px"}}>Productos</div>
        {items.map((item,idx)=>(
          <div key={item.id} style={{background:"#f9fafb",borderRadius:10,padding:12,marginBottom:10,border:"1px solid #e5e7eb"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontWeight:600,fontSize:13}}>Producto {idx+1}</div>
              {items.length>1&&<button onClick={()=>setItems(p=>p.filter((_,i)=>i!==idx))} style={{background:"#fee2e2",border:"none",borderRadius:6,padding:"4px 8px",color:"#991b1b",cursor:"pointer",fontSize:12}}>✕</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><label style={G.lbl}>Tipo</label><select style={G.inp} value={item.tipoProducto} onChange={e=>upd(idx,"tipoProducto",e.target.value)}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select></div>
              {item.tipoProducto!=="Manguera"&&<div><label style={G.lbl}>Aplicación</label><select style={G.inp} value={item.aplicacion} onChange={e=>upd(idx,"aplicacion",e.target.value)}>{APLICACIONES.map(a=><option key={a}>{a}</option>)}</select></div>}
            </div>
            {["Marco","Burlete","Angulo"].includes(item.tipoProducto)&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><label style={G.lbl}>Ancho (mm)</label><input type="number" style={G.inp} value={item.ancho} onChange={e=>upd(idx,"ancho",e.target.value)} placeholder="ej: 600"/></div>
                <div><label style={G.lbl}>Alto (mm)</label><input type="number" style={G.inp} value={item.alto} onChange={e=>upd(idx,"alto",e.target.value)} placeholder="ej: 800"/></div>
              </div>
            )}
            {["Tira","Manguera"].includes(item.tipoProducto)&&(
              <div><label style={G.lbl}>Largo (mm)</label><input type="number" style={G.inp} value={item.largo} onChange={e=>upd(idx,"largo",e.target.value)} placeholder="ej: 2500"/></div>
            )}

            {/* Presentación para ángulos */}
            {item.tipoProducto==="Angulo"&&(
              <div>
                <label style={G.lbl}>Presentación</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
                  {[["unidad","📦 Unidad",null],["caja","📦 Caja (x20)","caja"],["bolsa","🛍️ Bolsa (x20)","bolsa"]].map(([key,label,val])=>(
                    <button key={key} onClick={()=>upd(idx,"presentacion",val)} style={{padding:"8px 4px",border:`2px solid ${item.presentacion===val?"#1a5c2e":"#e5e7eb"}`,borderRadius:8,background:item.presentacion===val?"#f0fdf4":"white",color:item.presentacion===val?"#1a5c2e":"#374151",fontWeight:item.presentacion===val?700:400,cursor:"pointer",fontSize:12}}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div><label style={G.lbl}>Perfil / Material</label><select style={G.inp} value={item.perfilId} onChange={e=>upd(idx,"perfilId",e.target.value)}><option value="">Seleccionar</option>{perfiles.map(p=><option key={p.id} value={p.id}>{p.descripcion}</option>)}</select></div>
              {item.tipoProducto!=="Manguera"&&<div><label style={G.lbl}>Imán</label><select style={G.inp} value={item.imanId} onChange={e=>upd(idx,"imanId",e.target.value)}><option value="">Seleccionar</option>{imanes.map(p=><option key={p.id} value={p.id}>{p.descripcion}</option>)}</select></div>}
            </div>
            <div><label style={G.lbl}>{item.tipoProducto==="Angulo"&&item.presentacion?"Cantidad de cajas/bolsas":"Cantidad"}</label><input type="number" min={1} style={G.inp} value={item.cantidad} onChange={e=>upd(idx,"cantidad",e.target.value)}/></div>

            {(()=>{
              const mat=calcularMateriales(item);
              const p=calcularPrecioItem(item,insumos,precios);
              if (!mat&&!p) return null;
              return (
                <div style={{background:"#f0fdf4",borderRadius:8,padding:"8px 10px",fontSize:12,color:"#166534"}}>
                  {mat&&<div>📐 Material: <b>{mmToM(mat.perfilMm*(item.presentacion?item.cantidad*20:item.cantidad))}m</b> perfil{mat.imanMm>0?<> + <b>{mmToM(mat.imanMm*(item.presentacion?item.cantidad*20:item.cantidad))}m</b> imán</>:""}</div>}
                  {p&&<div style={{marginTop:2}}>💰 Precio: <b>{formatPesos(p.precioVenta)}</b></div>}
                </div>
              );
            })()}
          </div>
        ))}
        <button onClick={()=>setItems(p=>[...p,newItem()])} style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"8px 14px",fontSize:13,color:"#166534",cursor:"pointer",fontWeight:600,width:"100%",marginBottom:10}}>+ Agregar producto</button>

        <label style={G.lbl}>Observaciones</label>
        <input style={G.inp} value={obs} onChange={e=>setObs(e.target.value)} placeholder="Urgencia, fecha de entrega..."/>

        {/* Total */}
        <div style={{background:"#f0fdf4",borderRadius:10,padding:"12px 14px",marginBottom:14,textAlign:"right"}}>
          {descuento>0&&<div style={{fontSize:13,color:"#6b7280"}}>Subtotal: {formatPesos(subtotal)}</div>}
          {descuento>0&&<div style={{fontSize:13,color:"#059669"}}>Descuento {descuento}%: -{formatPesos(subtotal*descuento/100)}</div>}
          <div style={{fontSize:18,fontWeight:800,color:"#1a5c2e"}}>TOTAL: {formatPesos(total)}</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <button onClick={onClose} style={{padding:"12px",border:"2px solid #e5e7eb",borderRadius:10,background:"white",fontWeight:600,cursor:"pointer",fontSize:14}}>Cancelar</button>
          <button onClick={()=>{
            if (!(cliente||clienteId)||!items.length) return;
            onConfirm({clienteId,cliente:cliente||clientes.find(c=>c.id===clienteId)?.nombre,telefono,transporte,descuento,via,obs,items:items.map(it=>({...it,descripcion:buildDesc(it)}))});
          }} style={{padding:"12px",background:"#1a5c2e",color:"white",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer",fontSize:14}}>Guardar pedido</button>
        </div>
      </div>
    </div>
  );
}

// ── ENTRADA INSUMO MODAL ──────────────────────────────────
function EntradaInsumoModal({ insumos, onConfirm, onClose }) {
  const [selectedId, setSelectedId] = useState(insumos[0]?.id||"");
  const [cantidad, setCantidad]     = useState("");
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}}>
      <div style={{background:"white",borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:600}}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>📥 Entrada de insumo</div>
        <label style={G.lbl}>Insumo</label>
        <select style={G.inp} value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
          {insumos.map(i=><option key={i.id} value={i.id}>{i.descripcion} (stock: {typeof i.stock==="number"?i.stock.toFixed(1):i.stock} {i.unidad})</option>)}
        </select>
        <label style={G.lbl}>Cantidad (metros)</label>
        <input type="number" min={0.1} step={0.1} style={G.inp} value={cantidad} onChange={e=>setCantidad(e.target.value)} placeholder="ej: 50"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:6}}>
          <button onClick={onClose} style={{padding:"12px",border:"2px solid #e5e7eb",borderRadius:10,background:"white",fontWeight:600,cursor:"pointer",fontSize:14}}>Cancelar</button>
          <button onClick={()=>cantidad>0&&onConfirm(selectedId,cantidad)} style={{padding:"12px",background:"#1a5c2e",color:"white",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer",fontSize:14}}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ── CONFIG INSUMOS ────────────────────────────────────────
function ConfigInsumos({ insumos, onUpdateInsumo, onAddInsumo, onDeleteInsumo }) {
  const [editando, setEditando]   = useState(null);
  const [form, setForm]           = useState({});
  const [confirmDel, setConfirmDel] = useState(null);

  function guardar() {
    if (!form.descripcion?.trim()) return;
    editando.nuevo ? onAddInsumo(form) : onUpdateInsumo(form.id,form);
    setEditando(null);
  }

  if (editando) return (
    <div>
      <button onClick={()=>setEditando(null)} style={{background:"none",border:"none",color:"#1a5c2e",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:16,padding:0}}>← Volver</button>
      <div style={G.card}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>{editando.nuevo?"➕ Agregar":"✏️ Editar"} insumo</div>
        <label style={G.lbl}>Código</label>
        <input style={{...G.inp,background:editando.nuevo?"white":"#f9fafb",color:editando.nuevo?"#111":"#9ca3af"}} value={form.id||""} onChange={e=>setForm(f=>({...f,id:e.target.value}))} readOnly={!editando.nuevo}/>
        <label style={G.lbl}>Descripción</label>
        <input style={G.inp} value={form.descripcion||""} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))}/>
        <label style={G.lbl}>Tipo</label>
        <select style={G.inp} value={form.esIman?"iman":form.esPerfil?"perfil":form.esManguera?"manguera":"otro"} onChange={e=>setForm(f=>({...f,esIman:e.target.value==="iman",esPerfil:e.target.value==="perfil",esManguera:e.target.value==="manguera"}))}>
          <option value="iman">Imán</option><option value="perfil">Perfil PVC</option><option value="manguera">Manguera</option><option value="otro">Otro</option>
        </select>
        <label style={G.lbl}>Unidad</label>
        <select style={G.inp} value={form.unidad||"metro"} onChange={e=>setForm(f=>({...f,unidad:e.target.value}))}>
          {["metro","litro","kg","unidad","rollo","paquete"].map(u=><option key={u}>{u}</option>)}
        </select>
        <label style={G.lbl}>Proveedor</label>
        <input style={G.inp} value={form.proveedor||""} onChange={e=>setForm(f=>({...f,proveedor:e.target.value}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={G.lbl}>Stock mínimo</label><input type="number" style={G.inp} value={form.minimo||0} onChange={e=>setForm(f=>({...f,minimo:Number(e.target.value)}))}/></div>
          <div><label style={G.lbl}>Stock máximo</label><input type="number" style={G.inp} value={form.maximo||0} onChange={e=>setForm(f=>({...f,maximo:Number(e.target.value)}))}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:6}}>
          <button onClick={()=>setEditando(null)} style={{padding:"11px",border:"2px solid #e5e7eb",borderRadius:10,background:"white",fontWeight:600,cursor:"pointer",fontSize:14}}>Cancelar</button>
          <button onClick={guardar} style={{padding:"11px",background:"#1a5c2e",color:"white",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer",fontSize:14}}>Guardar</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={G.secTitle}>⚙️ Configuración de insumos</div>
      <button onClick={()=>{setEditando({nuevo:true});setForm({id:`INS-${String(Date.now()).slice(-3)}`,descripcion:"",unidad:"metro",stock:0,minimo:10,maximo:100,proveedor:"",esIman:false,esPerfil:false,esManguera:false});}} style={{...G.btn(),marginBottom:14}}>+ Agregar insumo</button>
      {insumos.map(item=>(
        <div key={item.id} style={{...G.card,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13}}>{item.descripcion}</div><div style={{fontSize:11,color:"#9ca3af"}}>{item.id} · {item.proveedor}</div></div>
          <div style={{display:"flex",gap:8,marginLeft:10}}>
            <button onClick={()=>{setEditando({id:item.id});setForm({...item});}} style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"6px 10px",fontSize:13,color:"#1a5c2e",cursor:"pointer"}}>✏️</button>
            <button onClick={()=>setConfirmDel({id:item.id,nombre:item.descripcion})} style={{background:"#fff1f2",border:"1px solid #fecdd3",borderRadius:8,padding:"6px 10px",fontSize:13,color:"#be123c",cursor:"pointer"}}>🗑️</button>
          </div>
        </div>
      ))}
      {confirmDel&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:20}}>
          <div style={{background:"white",borderRadius:16,padding:24,maxWidth:320,width:"100%"}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>¿Eliminar?</div>
            <div style={{fontSize:14,color:"#6b7280",marginBottom:20}}>Se eliminará <b>{confirmDel.nombre}</b>.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={()=>setConfirmDel(null)} style={{padding:"11px",border:"2px solid #e5e7eb",borderRadius:10,fontWeight:600,cursor:"pointer",fontSize:14}}>Cancelar</button>
              <button onClick={()=>{onDeleteInsumo(confirmDel.id);setConfirmDel(null);}} style={{padding:"11px",background:"#ef4444",color:"white",border:"none",borderRadius:10,fontWeight:700,cursor:"pointer",fontSize:14}}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ESTADÍSTICAS TAB ──────────────────────────────────────
function EstadisticasTab({ pedidos, insumos, precios, clientes }) {
  const [anio, setAnio] = useState(new Date().getFullYear());

  // Solo pedidos entregados con fechaEntrega
  const entregados = pedidos.filter(p => p.estado === "entregado" && p.fechaEntrega);

  // Parsear fecha "dd/mm/yyyy"
  function parseDate(str) {
    if (!str) return null;
    const [d,m,y] = str.split("/");
    return new Date(y, m-1, d);
  }

  function getMonthYear(str) {
    const d = parseDate(str);
    if (!d) return null;
    return { mes: d.getMonth(), anio: d.getFullYear() };
  }

  const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  // Ventas por mes del año seleccionado
  const ventasPorMes = Array(12).fill(0).map((_,mes) => {
    const pedidosMes = entregados.filter(p => {
      const my = getMonthYear(p.fechaEntrega);
      return my && my.mes === mes && my.anio === anio;
    });
    const total = pedidosMes.reduce((acc,p) => {
      const subtotal = p.items.reduce((a,item) => {
        const pr = calcularPrecioItem(item, insumos, precios);
        return a + (pr?.precioVenta||0);
      }, 0);
      return acc + subtotal * (1 - (p.descuento||0)/100);
    }, 0);
    return { mes: MESES[mes], total, cantidad: pedidosMes.length };
  });

  const totalAnio = ventasPorMes.reduce((a,m) => a + m.total, 0);
  const maxVenta  = Math.max(...ventasPorMes.map(m => m.total), 1);

  // Productos más vendidos (por tipo)
  const porTipo = {};
  entregados.filter(p => {
    const my = getMonthYear(p.fechaEntrega);
    return my && my.anio === anio;
  }).forEach(p => {
    p.items.forEach(item => {
      const t = item.tipoProducto || "Otro";
      if (!porTipo[t]) porTipo[t] = { cantidad: 0, total: 0 };
      let qty = Number(item.cantidad||1);
      if (item.presentacion) qty *= 20;
      porTipo[t].cantidad += qty;
      const pr = calcularPrecioItem(item, insumos, precios);
      porTipo[t].total += pr?.precioVenta||0;
    });
  });

  // Aplicaciones más vendidas
  const porAplicacion = {};
  entregados.filter(p => {
    const my = getMonthYear(p.fechaEntrega);
    return my && my.anio === anio;
  }).forEach(p => {
    p.items.forEach(item => {
      const a = item.aplicacion || "Manguera";
      if (!porAplicacion[a]) porAplicacion[a] = 0;
      porAplicacion[a]++;
    });
  });

  // Clientes que más compran
  const porCliente = {};
  entregados.filter(p => {
    const my = getMonthYear(p.fechaEntrega);
    return my && my.anio === anio;
  }).forEach(p => {
    const nombre = p.cliente || "Sin nombre";
    if (!porCliente[nombre]) porCliente[nombre] = { pedidos: 0, total: 0 };
    porCliente[nombre].pedidos++;
    const subtotal = p.items.reduce((a,item) => {
      const pr = calcularPrecioItem(item, insumos, precios);
      return a + (pr?.precioVenta||0);
    }, 0);
    porCliente[nombre].total += subtotal * (1 - (p.descuento||0)/100);
  });
  const topClientes = Object.entries(porCliente).sort((a,b) => b[1].total - a[1].total).slice(0,5);

  // Margen promedio
  const costoTotal = entregados.filter(p => {
    const my = getMonthYear(p.fechaEntrega);
    return my && my.anio === anio;
  }).reduce((acc,p) => {
    return acc + p.items.reduce((a,item) => {
      const pr = calcularPrecioItem(item, insumos, precios);
      return a + (pr?.costoTotal||0);
    }, 0);
  }, 0);
  const margenReal = totalAnio > 0 ? ((totalAnio - costoTotal) / totalAnio * 100).toFixed(1) : 0;

  const aniosDisponibles = [...new Set(entregados.map(p => {
    const my = getMonthYear(p.fechaEntrega);
    return my?.anio;
  }).filter(Boolean))].sort((a,b) => b-a);
  if (!aniosDisponibles.includes(anio) && aniosDisponibles.length > 0) aniosDisponibles.unshift(anio);

  const colores = ["#1a5c2e","#2d8a4e","#3b82f6","#f59e0b","#8b5cf6","#ef4444"];

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={G.secTitle}>📈 Estadísticas</div>
        <select style={{border:"2px solid #e5e7eb",borderRadius:8,padding:"6px 10px",fontSize:14,background:"white",outline:"none"}} value={anio} onChange={e=>setAnio(Number(e.target.value))}>
          {(aniosDisponibles.length>0?aniosDisponibles:[new Date().getFullYear()]).map(a=><option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Resumen del año */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
        {[
          {label:"Ventas del año",   value:formatPesos(totalAnio), color:"#1a5c2e", icon:"💰"},
          {label:"Pedidos entregados", value:ventasPorMes.reduce((a,m)=>a+m.cantidad,0), color:"#3b82f6", icon:"📦"},
          {label:"Margen real",      value:`${margenReal}%`, color:"#8b5cf6", icon:"📊"},
          {label:"Ticket promedio",  value:ventasPorMes.reduce((a,m)=>a+m.cantidad,0)>0?formatPesos(totalAnio/ventasPorMes.reduce((a,m)=>a+m.cantidad,0)):"—", color:"#f59e0b", icon:"🎫"},
        ].map((c,i)=>(
          <div key={i} style={{...G.card,marginBottom:0}}>
            <div style={{fontSize:22}}>{c.icon}</div>
            <div style={{fontSize:typeof c.value==="string"&&c.value.length>8?16:24,fontWeight:800,color:c.color,lineHeight:1.2,marginTop:4}}>{c.value}</div>
            <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico de ventas por mes */}
      <div style={G.card}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:16,color:"#374151"}}>📅 Ventas por mes — {anio}</div>
        {ventasPorMes.every(m=>m.total===0) ? (
          <div style={{textAlign:"center",padding:24,color:"#9ca3af"}}>
            <div style={{fontSize:32}}>📭</div>
            <div style={{marginTop:8}}>Sin ventas registradas en {anio}</div>
            <div style={{fontSize:12,marginTop:4}}>Las ventas aparecen cuando confirmás la entrega de un pedido</div>
          </div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <div style={{display:"flex",alignItems:"flex-end",gap:6,height:160,minWidth:500,paddingBottom:24,position:"relative"}}>
              {ventasPorMes.map((m,i)=>(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{fontSize:10,color:"#6b7280",fontWeight:600}}>{m.total>0?formatPesos(m.total):""}</div>
                  <div style={{width:"100%",background:m.total>0?"#1a5c2e":"#f3f4f6",borderRadius:"4px 4px 0 0",height:`${Math.max(4,(m.total/maxVenta)*120)}px`,position:"relative",transition:"height 0.3s"}}>
                    {m.cantidad>0&&<div style={{position:"absolute",top:-18,left:"50%",transform:"translateX(-50%)",fontSize:9,color:"#6b7280",whiteSpace:"nowrap"}}>{m.cantidad} ped.</div>}
                  </div>
                  <div style={{fontSize:10,color:"#6b7280",fontWeight:600}}>{m.mes}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Productos más vendidos */}
      {Object.keys(porTipo).length > 0 && (
        <div style={G.card}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#374151"}}>🔧 Por tipo de producto</div>
          {Object.entries(porTipo).sort((a,b)=>b[1].total-a[1].total).map(([tipo,data],i)=>(
            <div key={tipo} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                <span style={{fontWeight:600}}>{tipo}</span>
                <div style={{textAlign:"right"}}>
                  <span style={{fontWeight:700,color:"#1a5c2e"}}>{formatPesos(data.total)}</span>
                  <span style={{fontSize:11,color:"#9ca3af",marginLeft:8}}>{data.cantidad} uds</span>
                </div>
              </div>
              <div style={{background:"#f3f4f6",borderRadius:4,height:6}}>
                <div style={{width:`${(data.total/Math.max(...Object.values(porTipo).map(d=>d.total)))*100}%`,background:colores[i%colores.length],height:6,borderRadius:4}}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Por aplicación */}
      {Object.keys(porAplicacion).length > 0 && (
        <div style={G.card}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#374151"}}>🏭 Por aplicación</div>
          {Object.entries(porAplicacion).sort((a,b)=>b[1]-a[1]).map(([apl,cant],i)=>(
            <div key={apl} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                <span style={{fontWeight:600}}>{apl}</span>
                <span style={{color:"#6b7280"}}>{cant} productos</span>
              </div>
              <div style={{background:"#f3f4f6",borderRadius:4,height:6}}>
                <div style={{width:`${(cant/Math.max(...Object.values(porAplicacion)))*100}%`,background:colores[i%colores.length],height:6,borderRadius:4}}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top clientes */}
      {topClientes.length > 0 && (
        <div style={G.card}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#374151"}}>👥 Top clientes</div>
          {topClientes.map(([nombre,data],i)=>(
            <div key={nombre} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:colores[i%colores.length],color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{nombre}</div>
                <div style={{fontSize:11,color:"#9ca3af"}}>{data.pedidos} pedido{data.pedidos!==1?"s":""}</div>
              </div>
              <div style={{fontWeight:700,color:"#1a5c2e",fontSize:14}}>{formatPesos(data.total)}</div>
            </div>
          ))}
        </div>
      )}

      {entregados.length === 0 && (
        <div style={{...G.card,textAlign:"center",padding:32,color:"#9ca3af"}}>
          <div style={{fontSize:40}}>📊</div>
          <div style={{fontWeight:600,marginTop:8}}>Las estadísticas aparecen cuando confirmás la entrega de pedidos</div>
        </div>
      )}
    </div>
  );
}
