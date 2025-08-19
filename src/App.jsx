import React, { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:4000";
const isBarcode = (s) => /^\d{6,}$/.test(String(s||"").replace(/\s+/g,""));
const fold = (s)=>String(s||"").toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/\s+/g,' ').trim();

function Topbar({ view, setView, reloadBranches }) {
  return (
    <div className="toolbar" style={{marginBottom:12}}>
      <div className="tabs">
        <button className={view==="central"?"active":""} onClick={()=>setView("central")}>Central</button>
        <button className={view==="pre"?"active":""} onClick={()=>setView("pre")}>Pre‑Remito</button>
        <button className={view==="productos"?"active":""} onClick={()=>setView("productos")}>Productos</button>
        <button className={view==="sucursales"?"active":""} onClick={()=>setView("sucursales")}>Sucursales</button>
      </div>
      <span style={{marginLeft:"auto"}} className="toolbar">
        <button className="secondary" onClick={reloadBranches}>↻ Sucursales</button>
        <a className="link" href={`${API}/admin/products-xlsx`} target="_blank" rel="noreferrer">Importar XLSX (página)</a>
        <a className="link" href={`${API}/seed`} target="_blank" rel="noreferrer">Seed</a>
      </span>
    </div>
  );
}

/* =============== Sucursales =============== */
function SucursalesView({ branches, onAddedOrUpdated }) {
  const [name,setName]=useState("");
  const [address,setAddress]=useState("");
  const [editId,setEditId]=useState(null);

  const submit = async ()=>{
    if(!name.trim()) return alert("Nombre requerido");
    if(editId){
      const r = await fetch(`${API}/branches/${editId}/update`, {method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({name,address})});
      if(!r.ok) return alert("No se pudo actualizar");
      setEditId(null);
    }else{
      const r = await fetch(`${API}/branches/add`, {method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({name,address})});
      if(!r.ok) return alert("No se pudo crear");
    }
    setName(""); setAddress(""); onAddedOrUpdated?.();
  };
  const edit = (b)=>{ setEditId(b.id); setName(b.name); setAddress(b.address||""); };
  const del = async (id)=>{ if(!confirm("¿Eliminar sucursal?"))return; await fetch(`${API}/branches/${id}/delete`,{method:"POST"}); onAddedOrUpdated?.(); };

  return (
    <div className="card">
      <h2>Sucursales</h2>
      <div className="row" style={{gap:8,flexWrap:"wrap",margin:"8px 0 12px"}}>
        <input className="input" placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} style={{flex:"1 1 240px"}}/>
        <input className="input" placeholder="Dirección" value={address} onChange={e=>setAddress(e.target.value)} style={{flex:"2 1 340px"}}/>
        <button onClick={submit}>{editId?"Guardar":"Agregar"}</button>
        {editId && <button className="secondary" onClick={()=>{setEditId(null);setName("");setAddress("");}}>Cancelar</button>}
      </div>
      <table>
        <thead><tr><th>ID</th><th>Nombre</th><th>Dirección</th><th>Acciones</th></tr></thead>
        <tbody>
        {branches.map(b=>(
          <tr key={b.id}>
            <td>{b.id}</td><td>{b.name}</td><td>{b.address}</td>
            <td>
              <button className="secondary" onClick={()=>edit(b)}>Editar</button>{" "}
              <button onClick={()=>del(b.id)}>Eliminar</button>
            </td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
}

/* =============== Productos =============== */
function ProductosView(){
  const [q,setQ]=useState("");
  const [rows,setRows]=useState([]);
  const [file,setFile]=useState(null);
  const load=async()=>{
    const r=await fetch(`${API}/products`+(q?`?q=${encodeURIComponent(q)}`:""));
    setRows(await r.json());
  };
  useEffect(()=>{ load(); },[]);
  const upd = async (id,description)=>{ await fetch(`${API}/products/${id}/update`,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({description})}); };
  const del = async (id)=>{ if(!confirm("¿Eliminar producto?"))return; await fetch(`${API}/products/${id}/delete`,{method:"POST"}); load(); };
  const addCode = async (id)=>{ const code = prompt("Nuevo código de barras:", ""); if(!code) return;
    const r=await fetch(`${API}/products/${id}/addCode`,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
    if(!r.ok){ const j=await r.json().catch(()=>({})); alert(j.error||"No se pudo agregar"); } load();
  };
  const removeCode = async (id,code)=>{ if(!confirm(`Quitar código ${code}?`))return;
    await fetch(`${API}/products/${id}/removeCode`,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
    load();
  };
  const importJson = async ()=>{
    if(!file) return alert("Elegí un XLSX");
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(`${API}/admin/products-xlsx-json`, { method:"POST", body: fd });
    const j = await r.json().catch(()=>({}));
    if(!j.ok) return alert(j.error||"Falló importación");
    alert(`Importado:\nFilas: ${j.summary.totalRows}\nCreados: ${j.summary.created}\nCódigos agregados: ${j.summary.codesAdded}\nDuplicados: ${j.summary.duplicatesSkipped}`);
    setFile(null); load();
  };

  return (
    <div className="card">
      <h2>Productos</h2>
      <div className="toolbar" style={{marginBottom:8}}>
        <input className="input" placeholder="Buscar por descripción o código" value={q} onChange={e=>setQ(e.target.value)} style={{flex:"1 1 320px"}}/>
        <button className="secondary" onClick={load}>Buscar</button>
        <span style={{flex:1}}/>
        <input type="file" accept=".xlsx,.xls" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <button onClick={importJson}>Importar XLSX</button>
      </div>
      <table>
        <thead><tr><th>Descripción</th><th style={{width:380}}>Códigos</th><th style={{width:190}}>Acciones</th></tr></thead>
        <tbody>
          {rows.map(p=>(
            <tr key={p.id}>
              <td>
                <input className="input" defaultValue={p.description} onBlur={e=>upd(p.id,e.target.value)} />
              </td>
              <td>
                {(p.codes||[]).map(c=>
                  <span key={c} className="badge" style={{marginRight:6}}>
                    {c} <button className="link" onClick={()=>removeCode(p.id,c)} title="Quitar">×</button>
                  </span>
                )}
                <button className="secondary" onClick={()=>addCode(p.id)}>+ código</button>
              </td>
              <td>
                <button onClick={()=>del(p.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
          {rows.length===0 && <tr><td colSpan="3" style={{color:"var(--muted)"}}>Sin productos</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* =============== Pre‑Remito =============== */
function PreRemitoView({ branches }){
  const [branchId,setBranchId]=useState("");
  const [origin,setOrigin]=useState("Juan Manuel de Rosas 1325"); // default Casa Central
  const [q,setQ]=useState("");
  const [qty,setQty]=useState(1);
  const [sugg,setSugg]=useState([]);
  const [openSugg,setOpenSugg]=useState(false);
  const [items,setItems]=useState([]); // {id?, description, qty}
  const boxRef = useRef(null);

  const selectedBranch = useMemo(()=> branches.find(b=>String(b.id)===String(branchId)), [branches,branchId]);
  const addFromProd = (p)=>{
    setItems(prev=>{
      const i = prev.findIndex(x=> fold(x.description)===fold(p.description));
      if(i>-1){ const cp=[...prev]; cp[i].qty += Number(qty)||1; return cp; }
      return [...prev, { description: p.description, qty: Number(qty)||1 }];
    });
    setQ(""); setQty(1); setOpenSugg(false);
  };
  const onChangeQ = async (val)=>{
    setQ(val);
    if(!val.trim()){ setSugg([]); setOpenSugg(false); return; }
    const r = await fetch(`${API}/products?q=${encodeURIComponent(val)}`); const data = await r.json().catch(()=>[]);
    setSugg(Array.isArray(data)?data:[]); setOpenSugg(true);
  };
  const onKeyDownQ = async (e)=>{
    if(e.key!=="Enter") return;
    const txt = q.trim();
    if(!txt) return;
    // Si parece código de barras, intentamos by-code
    if(isBarcode(txt)){
      const r = await fetch(`${API}/products/by-code/${encodeURIComponent(txt)}`);
      if(r.ok){
        const j=await r.json(); addFromProd(j.product); return;
      }else{
        // desconocido: MODAL crear o vincular
        openUnknownModal(txt);
        return;
      }
    }
    // Si no es código, forzamos elegir de sugerencias para evitar “texto suelto”
    if(sugg.length>0){ addFromProd(sugg[0]); }
    else alert("Elegí un producto existente (o escaneá un código).");
  };

  const inc=(i)=> setItems(prev=>{ const cp=[...prev]; cp[i].qty+=1; return cp; });
  const dec=(i)=> setItems(prev=>{ const cp=[...prev]; cp[i].qty=Math.max(1,cp[i].qty-1); return cp; });
  const del=(i)=> setItems(prev=> prev.filter((_,idx)=>idx!==i));
  const totalUnidades = useMemo(()=> items.reduce((a,x)=>a+(parseInt(x.qty,10)||0),0), [items]);

  const crearRemito = async ()=>{
    if(!selectedBranch) return alert("Elegí una sucursal destino.");
    if(items.length===0) return alert("Agregá al menos un renglón.");
    const payload = {
      branch: { id: selectedBranch.id, name: selectedBranch.name, address: selectedBranch.address },
      origin, date: new Date().toISOString().slice(0,10),
      items: items.map(x=>({ description: x.description, qty: x.qty }))
    };
    const r = await fetch(`${API}/remitos`, { method:"POST", headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await r.json().catch(()=>({}));
    if(!j.ok) return alert(j.error||"No pude crear el remito");
    window.open(`${API}${j.pdf}`, "_blank");             // PDF en nueva pestaña
    window.open(`${API}${j.publicUrl}`, "_blank");       // Link de recepción
  };

  // ===== Modal: Crear/Vincular código desconocido =====
  const [uOpen,setUOpen]=useState(false);
  const [uCode,setUCode]=useState("");
  const [uTab,setUTab]=useState("create");
  const [uDesc,setUDesc]=useState("");
  const [uQ,setUQ]=useState("");
  const [uList,setUList]=useState([]);

  function openUnknownModal(code){ setUOpen(true); setUCode(code); setUTab("create"); setUDesc(""); setUQ(""); setUList([]); }
  async function uCreate(){
    if(!uDesc.trim()) return alert("Escribí la descripción");
    const r = await fetch(`${API}/products`, { method:"POST", headers:{'Content-Type':'application/json'}, body: JSON.stringify({ description: uDesc, code: uCode }) });
    if(!r.ok) return alert("No pude crear el producto");
    alert("Producto creado. Volvé a escanear o escribí para agregarlo.");
    setUOpen(false);
  }
  useEffect(()=>{ // buscar para vincular
    if(uTab!=="link") return;
    const t = setTimeout(async ()=>{
      const r = await fetch(`${API}/products?q=${encodeURIComponent(uQ)}`);
      const data = await r.json().catch(()=>[]);
      setUList(Array.isArray(data)?data:[]);
    }, 200);
    return ()=>clearTimeout(t);
  }, [uQ,uTab]);
  async function uLink(p){
    const r = await fetch(`${API}/products/${p.id}/addCode`, { method:"POST", headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code: uCode }) });
    if(!r.ok){ const j=await r.json().catch(()=>({})); return alert(j.error||"No se pudo vincular"); }
    alert("Código vinculado. Volvé a escanear o elegí el producto para agregarlo.");
    setUOpen(false);
  }

  return (
    <div className="card" ref={boxRef}>
      <h2>Pre‑Remito</h2>

      <div className="row" style={{flexWrap:"wrap", gap:12}}>
        <div style={{flex:"1 1 280px"}}>
          <label>Destino</label>
          <select className="input" value={branchId} onChange={e=>setBranchId(e.target.value)}>
            <option value="">— Elegir —</option>
            {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {selectedBranch && <small style={{color:"var(--muted)"}}>Dirección: {selectedBranch.address}</small>}
        </div>
        <div style={{flex:"1 1 320px"}}>
          <label>Origen</label>
          <div className="row" style={{gap:8}}>
            <select className="input" onChange={e=>setOrigin(e.target.value)} value={origin}>
              <option value="Juan Manuel de Rosas 1325">Casa Central (Juan Manuel de Rosas 1325)</option>
              {branches.map(b=><option key={b.id} value={`${b.name} — ${b.address}`}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{marginTop:12, position:"relative"}}>
        <label>Producto (escaneá código o escribí descripción)</label>
        <div className="row" style={{gap:8}}>
          <input className="input" placeholder="Ej. HYLAS, KUMARA… o 7790…" value={q}
            onChange={e=>onChangeQ(e.target.value)} onKeyDown={onKeyDownQ}/>
          <input className="input" type="number" min="1" style={{width:120}} value={qty}
            onChange={e=>setQty(e.target.value)} />
          <button className="secondary" onClick={()=>{
            if(sugg.length>0) addFromProd(sugg[0]); else alert("Elegí un producto existente.");
          }}>Agregar</button>
        </div>

        {openSugg && sugg.length>0 && (
          <div className="sugg" style={{left:0, right:0, marginTop:4}}>
            {sugg.slice(0,20).map(p=>
              <div key={p.id} onClick={()=>addFromProd(p)}>
                <div style={{fontWeight:600}}>{p.description}</div>
                <div style={{color:"var(--muted)", fontSize:12}}>{(p.codes||[]).join(" · ")||"—"}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{marginTop:12}}>
        <table>
          <thead><tr><th>Descripción</th><th style={{width:120}}>Cantidad</th><th style={{width:180}}>Acciones</th></tr></thead>
          <tbody>
            {items.length===0 && <tr><td colSpan="3" style={{color:"var(--muted)"}}>Sin renglones aún.</td></tr>}
            {items.map((it,i)=>(
              <tr key={i}>
                <td>{it.description}</td>
                <td>{it.qty}</td>
                <td>
                  <button className="secondary" onClick={()=>inc(i)}>+1</button>{" "}
                  <button className="secondary" onClick={()=>dec(i)}>-1</button>{" "}
                  <button onClick={()=>del(i)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row" style={{justifyContent:"space-between", marginTop:10}}>
          <div style={{color:"var(--muted)"}}>Total renglones: <b>{items.length}</b> — Unidades: <b>{totalUnidades}</b></div>
          <button onClick={crearRemito} style={{fontWeight:600}}>Crear Remito</button>
        </div>
      </div>

      {/* Modal código desconocido */}
      <div className="modal-backdrop" style={{display:uOpen?"flex":"none"}}>
        <div className="modal">
          <h3>El código <code>{uCode}</code> no existe</h3>
          <div className="row" style={{margin:"8px 0"}}>
            <button className={uTab==="create"?"":"secondary"} onClick={()=>setUTab("create")}>➕ Crear producto</button>
            <button className={uTab==="link"?"":"secondary"} onClick={()=>setUTab("link")}>🔗 Vincular a existente</button>
            <span style={{flex:1}}/>
            <button className="secondary" onClick={()=>setUOpen(false)}>Cerrar</button>
          </div>
          {uTab==="create" ? (
            <div>
              <label>Descripción</label>
              <input className="input" value={uDesc} onChange={e=>setUDesc(e.target.value)} />
              <div className="row" style={{marginTop:10}}><button onClick={uCreate}>Crear</button></div>
            </div>
          ) : (
            <div>
              <label>Buscar producto</label>
              <input className="input" value={uQ} onChange={e=>setUQ(e.target.value)} placeholder="Ej. KUMARA" />
              <div style={{maxHeight:260,overflow:"auto",border:"1px solid var(--line)",borderRadius:10,padding:6,marginTop:8}}>
                {uList.length===0 && <div style={{color:"var(--muted)"}}>Sin resultados</div>}
                {uList.slice(0,20).map(p=>(
                  <div key={p.id} style={{padding:8,borderTop:"1px solid #eef2f7",cursor:"pointer"}} onClick={()=>uLink(p)}>
                    <div style={{fontWeight:600}}>{p.description}</div>
                    <div style={{color:"var(--muted)",fontSize:12}}>{(p.codes||[]).join(" · ")||"—"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =============== Central (lista de remitos) =============== */
function CentralView(){
  const [list,setList]=useState([]);
  const [status,setStatus]=useState("");
  const load=async()=>{
    const r=await fetch(`${API}/remitos`); const data=await r.json().catch(()=>[]);
    setList(Array.isArray(data)?data:[]);
  };
  useEffect(()=>{ load(); },[]);
  const filtered = useMemo(()=> status? list.filter(r=>r.status===status): list, [list,status]);
  const badge = (s)=> s==="ok"?"badge ok":(s==="diferencias"?"badge diff":"badge pend");
  return (
    <div className="card">
      <h2>Central — Remitos</h2>
      <div className="toolbar" style={{marginBottom:8}}>
        <select className="input" style={{maxWidth:240}} value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="ok">OK</option>
          <option value="diferencias">Diferencias</option>
        </select>
        <button className="secondary" onClick={load}>Actualizar</button>
      </div>
      <table>
        <thead><tr><th>Nº</th><th>Fecha</th><th>Destino</th><th>Origen</th><th>Estado</th><th>Links</th></tr></thead>
        <tbody>
          {filtered.map(r=>(
            <tr key={r.id}>
              <td>{r.numero}</td>
              <td>{r.fecha}</td>
              <td>{r.branch?.name}</td>
              <td>{r.origin}</td>
              <td><span className={badge(r.status)}>{String(r.status).toUpperCase()}</span></td>
              <td>
                <a className="link" href={`${API}${r.pdf}`} target="_blank" rel="noreferrer">PDF</a>{" · "}
                <a className="link" href={`${API}${r.publicUrl}`} target="_blank" rel="noreferrer">Recepción</a>
              </td>
            </tr>
          ))}
          {filtered.length===0 && <tr><td colSpan="6" style={{color:"var(--muted)"}}>Sin remitos</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* =============== App =============== */
export default function App(){
  const [view,setView]=useState("central");
  const [branches,setBranches]=useState([]);
  const loadBranches = async ()=>{ const r=await fetch(`${API}/branches`); setBranches(await r.json()); };
  useEffect(()=>{ loadBranches(); },[]);
  useEffect(()=>{ console.log("👉 API base URL:", API); },[]);

  return (
    <div className="wrap">
      <h1>📦 Sistema de Remitos</h1>
      <Topbar view={view} setView={setView} reloadBranches={loadBranches} />
      {view==="central" && <CentralView/>}
      {view==="pre" && <PreRemitoView branches={branches}/>}
      {view==="productos" && <ProductosView/>}
      {view==="sucursales" && <SucursalesView branches={branches} onAddedOrUpdated={loadBranches}/>}
    </div>
  );
}
