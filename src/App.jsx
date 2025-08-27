import React, { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:4000";
const fold = (s)=>String(s||"").toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/\s+/g,' ').trim();
const isBarcode = (s)=> /^\d{6,}$/.test(String(s||"").replace(/\s+/g,""));

// ======= Login =======
function Login({ onLogged }) {
  const [role,setRole]=useState("admin");
  const [username,setUsername]=useState("admin");
  const [password,setPassword]=useState("admin123");
  const [branches,setBranches]=useState([]);
  const [branchId,setBranchId]=useState("");
  const [pin,setPin]=useState("");

  useEffect(()=>{
    fetch(`${API}/branches`).then(r=>r.json()).then(setBranches).catch(()=>{});
  },[]);

  const submit = async (e)=>{
    e.preventDefault();
    const payload = role==="admin"
      ? { role, username, password }
      : { role, branchId, pin };
    const r = await fetch(`${API}/auth/login`, {
      method:"POST", headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    const j = await r.json().catch(()=>({}));
    if(!r.ok || !j.ok){ alert(j.error||"No pude iniciar sesión"); return; }
    onLogged(j);
  };

  return (
    <div className="wrap">
      <h1>📦 Sistema de Remitos — Ingresar</h1>
      <div className="card">
        <div className="row" style={{gap:8}}>
          <label><input type="radio" checked={role==="admin"} onChange={()=>setRole("admin")}/> Admin</label>
          <label><input type="radio" checked={role==="branch"} onChange={()=>setRole("branch")}/> Sucursal</label>
        </div>
        <form onSubmit={submit} style={{marginTop:10}}>
          {role==="admin" ? (
            <>
              <div className="row"><input className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Usuario" /></div>
              <div className="row"><input className="input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña" type="password" /></div>
            </>
          ) : (
            <>
              <div className="row">
                <select className="input" value={branchId} onChange={e=>setBranchId(e.target.value)}>
                  <option value="">— Elegí tu sucursal —</option>
                  {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="row"><input className="input" value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN" type="password" /></div>
            </>
          )}
          <div className="row" style={{marginTop:10}}>
            <button type="submit">Entrar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ======= Topbar =======
function Topbar({ view, setView, reloadBranches, me, onLogout }) {
  return (
    <div className="toolbar" style={{marginBottom:12}}>
      <div className="tabs">
        {me.role==="admin" ? (
          <>
            <button className={view==="central"?"active":""} onClick={()=>setView("central")}>Central</button>
            <button className={view==="pre"?"active":""} onClick={()=>setView("pre")}>Pre-Remito</button>
            <button className={view==="nota"?"active":""} onClick={()=>setView("nota")}>Nota de Pedido</button>
            <button className={view==="productos"?"active":""} onClick={()=>setView("productos")}>Productos</button>
            <button className={view==="sucursales"?"active":""} onClick={()=>setView("sucursales")}>Sucursales</button>
          </>
        ) : (
          <button className={view==="central"?"active":""} onClick={()=>setView("central")}>Mis Remitos</button>
        )}
      </div>
      <span style={{marginLeft:"auto"}} className="toolbar">
        {me.role==="admin" && <button className="secondary" onClick={reloadBranches}>↻ Sucursales</button>}
        <button className="secondary" onClick={onLogout}>Salir</button>
      </span>
    </div>
  );
}

// ======= Sucursales (admin) =======
function SucursalesView({ branches, onChanged }) {
  const [rows,setRows]=useState((branches||[]).map(b=>({...b})));
  useEffect(()=>{ setRows((branches||[]).map(b=>({...b}))); },[branches]);

  const save=async (row)=>{
    const r=await fetch(`${API}/branches/${row.id}/update`,{
      method:"POST", headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        name: row.name||"", address: row.address||"",
        phone: String(row.phone||"").replace(/\D+/g,""),
        pin: row.pin||""
      })
    });
    if(!r.ok){ const j=await r.json().catch(()=>({})); alert(j.error||"No se pudo guardar"); return; }
    onChanged?.();
  };
  const add=async ()=>{
    const name=prompt("Nombre sucursal:","")||"";
    if(!name.trim()) return;
    const address=prompt("Dirección:","")||"";
    const phone=(prompt("Teléfono (solo números):","")||"").replace(/\D+/g,"");
    const pin=prompt("PIN (sólo números):","")||"";
    const r=await fetch(`${API}/branches/add`,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({name,address,phone,pin})});
    if(!r.ok){ alert("No se pudo crear"); return; }
    onChanged?.();
  };
  const del=async (id)=>{
    if(!confirm("¿Eliminar sucursal?"))return;
    const r=await fetch(`${API}/branches/${id}/delete`,{method:"POST"});
    if(!r.ok){ alert("No se pudo eliminar"); return; }
    onChanged?.();
  };

  return (
    <div>
      <div className="row"><h2 style={{marginRight:"auto"}}>Sucursales</h2><button onClick={add}>➕ Agregar</button></div>
      {rows.length===0 ? <p style={{color:"#777"}}>No hay sucursales. Probá “Seed”.</p> : (
        <table cellPadding="6" style={{borderCollapse:"collapse",width:"100%",border:"1px solid #ddd"}}>
          <thead style={{background:"#f5f5f5"}}><tr>
            <th>ID</th><th>Nombre</th><th>Dirección</th><th>Teléfono</th><th>PIN</th><th>Acciones</th>
          </tr></thead>
          <tbody>
            {rows.map((b,i)=>(
              <tr key={b.id} style={{borderTop:"1px solid #eee"}}>
                <td>{b.id}</td>
                <td><input value={b.name||""} onChange={e=>setRows(p=>p.map((x,k)=>k===i?{...x,name:e.target.value}:x))} style={{width:"100%",padding:6}}/></td>
                <td><input value={b.address||""} onChange={e=>setRows(p=>p.map((x,k)=>k===i?{...x,address:e.target.value}:x))} style={{width:"100%",padding:6}}/></td>
                <td><input value={b.phone||""} onChange={e=>setRows(p=>p.map((x,k)=>k===i?{...x,phone:e.target.value.replace(/\D+/g,"")}:x))} style={{width:"100%",padding:6}}/></td>
                <td><input value={b.pin||""} onChange={e=>setRows(p=>p.map((x,k)=>k===i?{...x,pin:e.target.value}:x))} style={{width:120,padding:6}}/></td>
                <td>
                  <button onClick={()=>save(rows[i])}>💾 Guardar</button>{" "}
                  <button onClick={()=>del(b.id)} style={{color:"#b00"}}>🗑 Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ======= Productos (admin) =======
function ProductosView(){
  const [q,setQ]=useState("");
  const [rows,setRows]=useState([]);
  const [codes,setCodes]=useState({}); // id -> new code (para inline add)

  const load=async()=>{ const r=await fetch(`${API}/products`+(q?`?q=${encodeURIComponent(q)}`:"")); setRows(await r.json()); };
  useEffect(()=>{ load(); },[]);
  const create=async ()=>{
    const desc=prompt("Descripción del producto:","")||"";
    if(!desc.trim()) return;
    const code1=prompt("Código 1 (opcional):","")||"";
    const code2=prompt("Código 2 (opcional):","")||"";
    const code3=prompt("Código 3 (opcional):","")||"";
    const codes=[code1,code2,code3].map(s=>String(s).trim()).filter(Boolean);
    const r=await fetch(`${API}/products`,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({description:desc,codes})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok){ alert(j.error||"No pude crear"); return; }
    load();
  };
  const upd=async (p)=>{ const r=await fetch(`${API}/products/${p.id}/update`,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify({description:p.description,codes:p.codes})}); if(!r.ok){ const j=await r.json().catch(()=>({})); alert(j.error||"No pude guardar"); } };
  const del=async (id)=>{ if(!confirm("¿Eliminar producto?"))return; await fetch(`${API}/products/${id}/delete`,{method:"POST"}); load(); };

  return (
    <div className="card">
      <div className="row" style={{justifyContent:"space-between"}}>
        <h2>Productos</h2>
        <div className="row">
          <input className="input" placeholder="Buscar por descripción o código" value={q} onChange={e=>setQ(e.target.value)}/>
          <button className="secondary" onClick={load}>Buscar</button>
          <button onClick={create}>➕ Nuevo</button>
        </div>
      </div>
      <table>
        <thead><tr><th>Descripción</th><th>Códigos (máx 3)</th><th>Acciones</th></tr></thead>
        <tbody>
          {rows.map((p,idx)=>(
            <tr key={p.id}>
              <td><input className="input" defaultValue={p.description} onBlur={e=>{ p.description=e.target.value; upd(p); }}/></td>
              <td>
                {(p.codes||[]).map((c,i)=>(
                  <span key={c} className="badge" style={{marginRight:6}}>
                    {c} <button className="link" onClick={()=>{ p.codes=p.codes.filter(x=>x!==c); upd(p); }}>×</button>
                  </span>
                ))}
                {(p.codes||[]).length<3 && (
                  <>
                    <input className="input" style={{width:140,display:"inline-block"}} placeholder="nuevo código"
                      value={codes[p.id]||""} onChange={e=>setCodes({...codes, [p.id]: e.target.value})}/>
                    <button className="secondary" onClick={()=>{ const v=(codes[p.id]||"").trim(); if(!v) return; p.codes=[...(p.codes||[]),v]; setCodes({...codes,[p.id]:""}); upd(p); }}>Agregar</button>
                  </>
                )}
              </td>
              <td><button onClick={()=>del(p.id)}>Eliminar</button></td>
            </tr>
          ))}
          {rows.length===0 && <tr><td colSpan="3" style={{color:"var(--muted)"}}>Sin productos</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ======= Pre-Remito (admin) =======
function PreRemitoView({ branches }){
  const [branchId,setBranchId]=useState("");
  const [origin,setOrigin]=useState("Juan Manuel de Rosas 1325");
  const [q,setQ]=useState("");
  const [qty,setQty]=useState(1);
  const [sugg,setSugg]=useState([]);
  const [openSugg,setOpenSugg]=useState(false);
  const [items,setItems]=useState([]);
  const prodInputRef=useRef(null);

  const selectedBranch = useMemo(()=> branches.find(b=>String(b.id)===String(branchId)), [branches,branchId]);

  const addFromProd=(p)=>{
    setItems(prev=>{
      const i=prev.findIndex(x=>fold(x.description)===fold(p.description));
      if(i>-1){ const cp=[...prev]; cp[i].qty+=Number(qty)||1; return cp; }
      return [...prev, { description:p.description, qty:Number(qty)||1 }];
    });
    setQ(""); setQty(1); setOpenSugg(false);
  };
  const onChangeQ=async (val)=>{
    setQ(val);
    if(!val.trim()){ setSugg([]); setOpenSugg(false); return; }
    const r=await fetch(`${API}/products?q=${encodeURIComponent(val)}`);
    const data=await r.json().catch(()=>[]);
    setSugg(Array.isArray(data)?data:[]); setOpenSugg(true);
  };
  const onKeyDownQ=async (e)=>{
    if(e.key!=="Enter") return;
    const txt=q.trim(); if(!txt) return;
    if(isBarcode(txt)){
      const r=await fetch(`${API}/products?q=${encodeURIComponent(txt)}`); // simple match
      const arr=await r.json().catch(()=>[]);
      const by = (arr||[]).find(p=>(p.codes||[]).includes(txt));
      if(by){ addFromProd(by); return; }
      alert("Código desconocido. Crealo primero en Productos.");
      return;
    }
    if(sugg.length>0) addFromProd(sugg[0]);
    else alert("Elegí un producto existente (o escaneá un código).");
  };

  const inc=i=> setItems(p=>{ const cp=[...p]; cp[i].qty+=1; return cp; });
  const dec=i=> setItems(p=>{ const cp=[...p]; cp[i].qty=Math.max(1,cp[i].qty-1); return cp; });
  const del=i=> setItems(p=> p.filter((_,k)=>k!==i));
  const totalUnidades = useMemo(()=> items.reduce((a,x)=>a+(parseInt(x.qty,10)||0),0), [items]);

  const crearRemito = async ()=>{
    if(!selectedBranch) return alert("Elegí una sucursal destino.");
    if(items.length===0) return alert("Agregá al menos un renglón.");
    const payload = {
      branch: { id:selectedBranch.id, name:selectedBranch.name, address:selectedBranch.address },
      origin, date: new Date().toISOString().slice(0,10),
      items: items.map(x=>({ description:x.description, qty:x.qty }))
    };
    const r=await fetch(`${API}/remitos`,{method:"POST",headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const j=await r.json().catch(()=>({}));
    if(!j.ok) return alert(j.error||"No pude crear el remito");
    // abrir solo recepción
    window.open(`${API}${j.publicUrl}`,"_blank");
    // reset
    setItems([]); setQ(""); setQty(1); setSugg([]); setOpenSugg(false);
    prodInputRef.current?.focus();
  };

  return (
    <div className="card">
      <h2>Pre-Remito</h2>
      <div className="row" style={{gap:12}}>
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
          <select className="input" onChange={e=>setOrigin(e.target.value)} value={origin}>
            <option value="Juan Manuel de Rosas 1325">Casa Central (Juan Manuel de Rosas 1325)</option>
            {branches.map(b=><option key={b.id} value={`${b.name} — ${b.address}`}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{marginTop:12, position:"relative"}}>
        <label>Producto (escaneá o escribí)</label>
        <div className="row" style={{gap:8}}>
          <input ref={prodInputRef} className="input" placeholder="Ej. KUMARA… o 7790…" value={q} onChange={e=>onChangeQ(e.target.value)} onKeyDown={onKeyDownQ}/>
          <input className="input" type="number" min="1" style={{width:120}} value={qty} onChange={e=>setQty(e.target.value)}/>
          <button className="secondary" onClick={()=>{ if(sugg.length>0) addFromProd(sugg[0]); else alert("Elegí un producto."); }}>Agregar</button>
        </div>
        {openSugg && sugg.length>0 && (
          <div className="sugg" style={{left:0,right:0,marginTop:4,maxHeight:260,overflow:"auto"}}>
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
          <div style={{color:"var(--muted)"}}>Renglones: <b>{items.length}</b> — Unidades: <b>{totalUnidades}</b></div>
          <button onClick={crearRemito} style={{fontWeight:600}}>Crear Remito</button>
        </div>
      </div>
    </div>
  );
}

// ======= Nota de Pedido (admin) =======
function NotaPedidoView({ branches }){
  const [matrix,setMatrix]=useState([]); // [{description, codes:[], perBranch:{[id]:qty}}]
  const [q,setQ]=useState("");
  const [sugg,setSugg]=useState([]);
  const [open,setOpen]=useState(false);

  const addProduct = (p)=>{
    setMatrix(prev=>{
      const ex = prev.find(x=> fold(x.description)===fold(p.description));
      if(ex) return prev;
      const perBranch = Object.fromEntries((branches||[]).map(b=>[String(b.id), 0]));
      return [...prev, { description:p.description, codes:p.codes||[], perBranch }];
    });
    setQ(""); setSugg([]); setOpen(false);
  };
  const onSearch=async (val)=>{
    setQ(val);
    if(!val.trim()){ setSugg([]); setOpen(false); return; }
    const r=await fetch(`${API}/products?q=${encodeURIComponent(val)}`); const a=await r.json().catch(()=>[]);
    setSugg(Array.isArray(a)?a:[]); setOpen(true);
  };

  const setQty=(rowIdx, branchId, v)=>{
    setMatrix(prev=> prev.map((row,i)=> i===rowIdx ? {...row, perBranch:{...row.perBranch, [String(branchId)]: Math.max(0, parseInt(v||0)) }} : row));
  };

  const generar = async ()=>{
    // Para cada sucursal, arma items a partir de matrix
    for(const b of branches){
      const items = [];
      for(const row of matrix){
        const qty = row.perBranch[String(b.id)]||0;
        if(qty>0) items.push({ description: row.description, qty });
      }
      if(items.length===0) continue;
      const payload={ branch:{ id:b.id, name:b.name, address:b.address }, origin:"Juan Manuel de Rosas 1325", date:new Date().toISOString().slice(0,10), items };
      const r=await fetch(`${API}/remitos`,{method:"POST",headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      const j=await r.json().catch(()=>({}));
      if(r.ok && j.ok) window.open(`${API}${j.publicUrl}`,"_blank");
    }
    setMatrix([]);
  };

  return (
    <div className="card">
      <h2>Nota de Pedido → Remitos por sucursal</h2>
      <div className="row">
        <input className="input" placeholder="Buscar producto" value={q} onChange={e=>onSearch(e.target.value)} />
        <button className="secondary" onClick={()=>{ if(sugg.length>0) addProduct(sugg[0]); }}>Agregar producto</button>
      </div>
      {open && sugg.length>0 && (
        <div className="sugg" style={{left:0,right:0,marginTop:6}}>
          {sugg.slice(0,20).map(p=><div key={p.id} onClick={()=>addProduct(p)}><b>{p.description}</b><div style={{fontSize:12,color:"var(--muted)"}}>{(p.codes||[]).join(" · ")}</div></div>)}
        </div>
      )}

      <div style={{overflow:"auto", marginTop:10}}>
        {matrix.length===0 ? <div style={{color:"var(--muted)"}}>Agregá productos arriba para asignar cantidades por sucursal.</div> : (
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                {branches.map(b=><th key={b.id}>{b.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row,ri)=>(
                <tr key={ri}>
                  <td>{row.description}</td>
                  {branches.map(b=>(
                    <td key={b.id}>
                      <input type="number" min="0" className="input" style={{width:90}}
                        value={row.perBranch[String(b.id)]||0}
                        onChange={e=>setQty(ri, b.id, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="row" style={{marginTop:10, justifyContent:"flex-end"}}>
        <button onClick={generar} style={{fontWeight:600}}>Generar Remitos</button>
      </div>
    </div>
  );
}

// ======= Central (lista) =======
function CentralView({ me }){
  const [list,setList]=useState([]);
  const [status,setStatus]=useState("");
  const load=async()=>{
    const params = me.role==="branch" ? `?role=branch&branchId=${me.branch?.id}` : "";
    const r=await fetch(`${API}/remitos${params}`); const data=await r.json().catch(()=>[]);
    setList(Array.isArray(data)?data:[]);
  };
  useEffect(()=>{ load(); },[me]);
  const filtered=useMemo(()=> status? list.filter(r=>r.status===status): list, [list,status]);
  const badge=(s)=> s==="ok"?"badge ok":(s==="diferencias"?"badge diff":"badge pend");
  return (
    <div className="card">
      <h2>{me.role==="admin"?"Central — Remitos":"Mis Remitos"}</h2>
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
                <a className="link" href={`${API}${r.publicUrl}`} target="_blank" rel="noreferrer">Recepción</a>{" · "}
                <a className="link" href={`${API}${r.pdf}`} target="_blank" rel="noreferrer">PDF</a>
              </td>
            </tr>
          ))}
          {filtered.length===0 && <tr><td colSpan="6" style={{color:"var(--muted)"}}>Sin remitos</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ======= App =======
export default function App(){
  const [me,setMe]=useState(null); // {role:"admin"} | {role:"branch", branch:{id,name}}
  const [view,setView]=useState("central");
  const [branches,setBranches]=useState([]);
  const loadBranches=async()=>{ const r=await fetch(`${API}/branches`); setBranches(await r.json()); };
  useEffect(()=>{ loadBranches(); },[]);
  useEffect(()=>{ console.log("👉 API:", API); },[]);

  if(!me) return <Login onLogged={(info)=>{ setMe(info); setView("central"); }} />;

  return (
    <div className="wrap">
      <h1>📦 Sistema de Remitos</h1>
      <Topbar view={view} setView={setView} reloadBranches={loadBranches} me={me} onLogout={()=>setMe(null)} />
      {view==="central"   && <CentralView me={me} />}
      {me.role==="admin" && view==="pre" && <PreRemitoView branches={branches}/>}
      {me.role==="admin" && view==="nota" && <NotaPedidoView branches={branches}/>}
      {me.role==="admin" && view==="productos" && <ProductosView/>}
      {me.role==="admin" && view==="sucursales" && <SucursalesView branches={branches} onChanged={loadBranches}/>}
    </div>
  );
}
