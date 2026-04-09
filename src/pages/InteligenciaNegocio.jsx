import { useState } from "react";
import { entities } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/components/context/WorkspaceContext";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Target, Zap, RefreshCw, Sparkles, MessageCircle } from "lucide-react";
import moment from "moment";

function pct(n, d) { return d > 0 ? ((n / d) * 100).toFixed(1) : "0.0"; }
function daysLeftInMonth() { const now = moment(); return now.daysInMonth() - now.date(); }

function KPICard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || "#0f172a" }}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, icon: Icon, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon className="w-4 h-4 text-slate-600" />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function RankRow({ rank, name, value, sub, bar, barColor, badge }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <span className="text-sm font-bold min-w-[20px]" style={{ color: rank === 1 ? "#f59e0b" : "#94a3b8" }}>#{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-700 truncate">{name}</p>
          {badge && <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5 shrink-0">{badge}</span>}
        </div>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        {bar !== undefined && (
          <div className="h-1 bg-slate-100 rounded-full mt-1.5">
            <div className="h-1 rounded-full transition-all duration-700" style={{ width: `${Math.min(bar, 100)}%`, background: barColor || "#10b981" }} />
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-700 shrink-0">{value}</p>
    </div>
  );
}

function ManualToggleRow({ label, subAuto, subManual, active, onToggle, children }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{active ? subManual : subAuto}</p>
      </div>
      <div className="flex items-center gap-3">
        {active && children}
        <button
          onClick={onToggle}
          className="relative w-11 h-6 rounded-full transition-colors duration-200 border-none cursor-pointer shrink-0"
          style={{ background: active ? "#0f172a" : "#e2e8f0" }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
            style={{ transform: active ? "translateX(20px)" : "translateX(0)" }}
          />
        </button>
      </div>
    </div>
  );
}

// ─── Sección de Actividad ────────────────────────────────────────────────────

function ActividadContacto({ workspace }) {
  const [rango, setRango] = useState(7);

  // ── Días agrupados por día según rango ──
  const ultimos7 = Array.from({ length: rango }, (_, i) => {
    const dia = moment().subtract(rango - 1 - i, "days").startOf("day");
    const count = todosLosContactos.filter(c =>
      moment(c.fecha).isSame(dia, "day")
    ).length;
    return { label: dia.format(rango === 7 ? "ddd DD" : "DD/MM"), count, isHoy: i === rango - 1 };
  });
  const promedio7 = (ultimos7.reduce((s, d) => s + d.count, 0) / rango).toFixed(1);

  // ── Recontactos por consulta (consultas con más de 1 contacto) ──
  const recontactosPorConsulta = {};
  todosLosContactos.forEach(c => {
    if (!c.consultaId) return;
    recontactosPorConsulta[c.consultaId] = recontactosPorConsulta[c.consultaId] || {
      nombre: c.nombre,
      count: 0
    };
    recontactosPorConsulta[c.consultaId].count++;
  });

  const topRecontactos = Object.entries(recontactosPorConsulta)
    .map(([id, d]) => ({ id, nombre: d.nombre, count: d.count }))
    .filter(r => r.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  const maxRecontacto = topRecontactos[0]?.count || 1;

  // ── Tipo de contacto breakdown ──
  const porTipo = [
    { label: "WhatsApp / Lista", count: todosLosContactos.filter(c => c.tipo === "whatsapp").length, color: "#25D366" },
    { label: "Seguimiento marcado", count: todosLosContactos.filter(c => c.tipo === "seguimiento").length, color: "#6366f1" },
  ].filter(t => t.count > 0);
  const totalTipos = porTipo.reduce((s, t) => s + t.count, 0) || 1;

  return (
    <Section title="Actividad de Contacto" icon={MessageCircle}
      action={
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setRango(7)}
            className="text-xs font-semibold px-2.5 py-1 rounded-md transition-all border-none cursor-pointer"
            style={{ background: rango === 7 ? "#0f172a" : "transparent", color: rango === 7 ? "#fff" : "#64748b" }}
          >7 días</button>
          <button
            onClick={() => setRango(30)}
            className="text-xs font-semibold px-2.5 py-1 rounded-md transition-all border-none cursor-pointer"
            style={{ background: rango === 30 ? "#0f172a" : "transparent", color: rango === 30 ? "#fff" : "#64748b" }}
          >30 días</button>
        </div>
      }
    >
      {/* KPIs de actividad */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Contactos hoy</p>
          <p className="text-3xl font-black" style={{ color: contactosHoy.length > 0 ? "#6366f1" : "#94a3b8" }}>
            {contactosHoy.length}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Promedio / día</p>
          <p className="text-3xl font-black text-slate-700">{promedio7}</p>
          <p className="text-xs text-slate-400">últimos {rango} días</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total {rango} días</p>
          <p className="text-3xl font-black text-slate-700">{ultimos7.reduce((s, d) => s + d.count, 0)}</p>
        </div>
      </div>

      {/* Barras por día */}
      <div className="mb-5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Contactos por día</p>
        <div className={`flex items-end gap-1 h-24`}>
          {ultimos7.map((d) => {
            const h = maxDia > 0 ? Math.max((d.count / maxDia) * 80, d.count > 0 ? 6 : 0) : 0;
            return (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                {d.count > 0 && (
                  <p className="text-xs text-slate-500">{d.count}</p>
                )}
                <div
                  className="w-full rounded-t-md transition-all duration-700"
                  style={{
                    height: `${h}px`,
                    minHeight: d.count > 0 ? 6 : 0,
                    background: d.isHoy ? "#6366f1" : "#e2e8f0",
                  }}
                />
                <p className={`text-xs font-medium leading-tight text-center ${d.isHoy ? "text-slate-900" : "text-slate-400"}`}
                  style={{ fontSize: rango === 30 ? 8 : 10 }}>
                  {d.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown por tipo */}
      {porTipo.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Por tipo</p>
          <div className="space-y-2">
            {porTipo.map(t => (
              <div key={t.label} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                <p className="text-sm text-slate-600 flex-1">{t.label}</p>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${(t.count / totalTipos) * 100}%`, background: t.color }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 w-6 text-right">{t.count}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top recontactos */}
      {topRecontactos.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Clientes con más recontactos
          </p>
          {topRecontactos.map((r, i) => (
            <RankRow
              key={r.id}
              rank={i + 1}
              name={r.nombre}
              value={`${r.count} contactos`}
              bar={(r.count / maxRecontacto) * 100}
              barColor={i === 0 ? "#6366f1" : "#94a3b8"}
              badge={i === 0 ? "TOP" : null}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-3">
          Aún no hay recontactos registrados. Los contactos aparecen acá cuando usás los botones de WhatsApp o marcás seguimientos.
        </p>
      )}
    </Section>
  );
}

// ─── AI Insights ─────────────────────────────────────────────────────────────

function AIInsights({ aiData }) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const runAnalysis = async () => {
    if (loading) return;
    setLoading(true);
    setDone(false);
    setAnalysis("");

    const prompt = `Sos un analista de negocios senior especializado en comercialización de celulosa y materiales de construcción en Argentina.
Analizá estos datos del CRM y dá recomendaciones concretas y accionables en español rioplatense informal pero profesional.

DATOS DEL NEGOCIO (últimos 30 días):
- Consultas: ${aiData.totalConsultas} | Ganadas este mes: ${aiData.ganadasMes}
- Tasa de conversión: ${aiData.tasaConversion}%
- Importe ganado este mes: $${(aiData.importeMes || 0).toLocaleString("es-AR")}

CANALES:
${aiData.canales.slice(0, 4).map(c => `  ${c.name}: ${c.ventas} ganadas, conversión ${c.conversion}%`).join("\n")}

Respondé con 3 secciones cortas y directas:
1. **Lo que está funcionando bien** (2-3 puntos)
2. **Lo que hay que mejorar urgente** (2-3 puntos con acciones concretas)
3. **La recomendación más importante del mes** (1 sola cosa, la más impactante)

Sé específico con los números. No uses frases genéricas. Máximo 350 palabras.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          stream: true,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") continue;
            try {
              const json = JSON.parse(raw);
              if (json.type === "content_block_delta" && json.delta?.text) {
                setAnalysis(prev => prev + json.delta.text);
              }
            } catch {}
          }
        }
      }
      setDone(true);
    } catch (err) {
      setAnalysis("❌ Error al conectar con la IA. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const formatText = (text) =>
    text.split("\n").map((line, i) => {
      if (!line.trim()) return <br key={i} />;
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="mb-1 text-sm leading-relaxed text-slate-700">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-slate-900">{p}</strong> : p)}
        </p>
      );
    });

  return (
    <Section title="Análisis IA del Negocio" icon={Sparkles}
      action={
        <button onClick={runAnalysis} disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all border-none"
          style={{ background: loading ? "#e2e8f0" : "#0f172a", color: loading ? "#94a3b8" : "#fff", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {loading ? "Analizando..." : done ? "Actualizar" : "Generar análisis"}
        </button>
      }
    >
      {!analysis && !loading && (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">Generá un análisis con IA basado en tus datos reales del CRM.</p>
        </div>
      )}
      {loading && !analysis && (
        <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Analizando datos del negocio...
        </div>
      )}
      {analysis && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
          {formatText(analysis)}
          {loading && <span className="inline-block w-2 h-4 bg-slate-400 ml-1 animate-pulse rounded-sm" />}
        </div>
      )}
    </Section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InteligenciaNegocio() {
  const { workspace } = useWorkspace();

  const [objetivo, setObjetivo] = useState("");
  const [diasHabiles, setDiasHabiles] = useState(String(Math.round(daysLeftInMonth() * 0.7)));
  const [tdcManual, setTdcManual] = useState(false);
  const [tdcManualVal, setTdcManualVal] = useState("");
  const [gpManual, setGpManual] = useState(false);
  const [gpManualVal, setGpManualVal] = useState("");

  const { data: consultas = [] } = useQuery({
    queryKey: ["ib-consultas", workspace?.id],
    queryFn: () => workspace ? entities.Consulta.filter({ workspace_id: workspace.id }, "-created_date", 2000) : [],
    enabled: !!workspace
  });

  const cut30 = moment().subtract(30, "days");
  const consultas30 = consultas.filter(c => moment(c.created_date).isAfter(cut30));
  const ganadas30 = consultas30.filter(c => c.etapa === "GANADA" || c.etapa === "EJECUTADA");

  const totalConsultas = consultas30.length;
  const tasaConversion = parseFloat(pct(ganadas30.length, totalConsultas));

  const cutMes = moment().startOf("month");
  const consultasMes = consultas.filter(c => moment(c.created_date).isAfter(cutMes));
  const ganadasMes = consultasMes.filter(c => c.etapa === "GANADA" || c.etapa === "EJECUTADA");
  const importeMes = ganadasMes.reduce((s, c) => s + (c.importe || 0), 0);

  const canalMap = {};
  consultas30.forEach(c => {
    const k = c.canalOrigen || "Sin especificar";
    if (!canalMap[k]) canalMap[k] = { consultas: 0, ganadas: 0 };
    canalMap[k].consultas++;
    if (c.etapa === "GANADA" || c.etapa === "EJECUTADA") canalMap[k].ganadas++;
  });
  const canales = Object.entries(canalMap)
    .map(([name, d]) => ({ name, ventas: d.ganadas, conversion: pct(d.ganadas, d.consultas) }))
    .sort((a, b) => b.ventas - a.ventas);

  const objNum = parseFloat(objetivo) || 0;
  const diasNum = parseFloat(diasHabiles) || 1;
  const tdcEfectiva = tdcManual ? (parseFloat(tdcManualVal) || 0) : tasaConversion;
  const gpEfectiva = gpManual ? (parseFloat(gpManualVal) || 0) : 0;
  const faltaGanar = Math.max(0, objNum - importeMes);
  const ventasNecesarias = gpEfectiva > 0 ? Math.ceil(faltaGanar / gpEfectiva) : 0;
  const consultasNecesarias = tdcEfectiva > 0 ? Math.ceil(ventasNecesarias / (tdcEfectiva / 100)) : 0;
  const llamadasPorDia = diasNum > 0 ? Math.ceil(consultasNecesarias / diasNum) : 0;
  const yaAlcanzado = objNum > 0 && faltaGanar <= 0;
  const calculadoraLista = gpEfectiva > 0 && tdcEfectiva > 0;

  const aiData = { totalConsultas, tasaConversion, ganadasMes: ganadasMes.length, importeMes, canales };
  const barColors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];

  function ManualInput({ value, onChange, prefix, suffix, placeholder }) {
    return (
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
        <input
          type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "0"}
          className="border border-slate-200 rounded-lg py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
          style={{ width: 110, paddingLeft: prefix ? 36 : 12, paddingRight: suffix ? 28 : 12 }}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{suffix}</span>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Home")}>
            <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors bg-transparent border-none cursor-pointer p-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </button>
          </Link>
          <div className="w-px h-5 bg-slate-200" />
          <div>
            <h1 className="text-sm font-bold text-slate-900">Inteligencia de Negocio</h1>
            <p className="text-xs text-slate-400 hidden sm:block">Últimos 30 días · Solo admin</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">EN VIVO</span>
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Presupuestos del mes" value={consultasMes.length} sub="nuevos este mes" color="#6366f1" />
          <KPICard label="Conversión (30d)" value={`${tasaConversion}%`} sub={`${ganadas30.length} de ${totalConsultas}`} color="#10b981" />
          <KPICard label="Ganadas este mes" value={ganadasMes.length} sub="GANADA + EJECUTADA" color="#059669" />
          <KPICard label="Importe ganado" value={`$${importeMes.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`} sub="mes actual" color="#f59e0b" />
        </div>

        {/* Actividad de Contacto */}
        <ActividadContacto workspace={workspace} />

        {/* Calculadora */}
        <Section title="Calculadora de Contactos Diarios" icon={Target}
          action={<span className="text-xs text-slate-400">{daysLeftInMonth()} días restantes</span>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Objetivo mensual ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" value={objetivo} onChange={e => setObjetivo(e.target.value)} placeholder="0"
                  className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Días hábiles restantes</label>
              <input type="number" value={diasHabiles} onChange={e => setDiasHabiles(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1.5">Ya ganado este mes</label>
              <div className="border border-emerald-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-emerald-600 bg-emerald-50">
                ${importeMes.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <ManualToggleRow
              label="Importe promedio por operación"
              subAuto="Sin datos automáticos — activá para ingresar manualmente"
              subManual={`Usando valor manual: ${gpManualVal ? `$${parseFloat(gpManualVal).toLocaleString("es-AR")}` : "ingresá un monto"}`}
              active={gpManual}
              onToggle={() => { setGpManual(!gpManual); setGpManualVal(""); }}
            >
              <ManualInput value={gpManualVal} onChange={setGpManualVal} prefix="$" placeholder="ej: 5000" />
            </ManualToggleRow>
            <ManualToggleRow
              label="Tasa de conversión manual"
              subAuto={tasaConversion > 0 ? `Usando dato del CRM: ${tasaConversion}% (${ganadas30.length} de ${totalConsultas} consultas)` : "Sin datos en el CRM — activá para ingresar manualmente"}
              subManual={`Usando valor manual: ${tdcManualVal ? tdcManualVal + "%" : "ingresá un porcentaje"}`}
              active={tdcManual}
              onToggle={() => { setTdcManual(!tdcManual); setTdcManualVal(""); }}
            >
              <ManualInput value={tdcManualVal} onChange={setTdcManualVal} suffix="%" placeholder="ej: 15" />
            </ManualToggleRow>
          </div>

          {objNum > 0 && (
            <div className={`rounded-xl p-4 border ${yaAlcanzado ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
              {yaAlcanzado ? (
                <div className="text-center py-2">
                  <p className="text-lg font-bold text-emerald-600">🎉 ¡Objetivo alcanzado!</p>
                  <p className="text-sm text-slate-500 mt-1">Importe: ${importeMes.toLocaleString("es-AR")} de ${objNum.toLocaleString("es-AR")}</p>
                </div>
              ) : !calculadoraLista ? (
                <div className="text-center py-3">
                  <p className="text-sm text-slate-400">
                    Activá los valores manuales de importe promedio y tasa de conversión para calcular.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Falta</p>
                    <p className="text-xl font-bold text-amber-500">${faltaGanar.toLocaleString("es-AR")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Operaciones</p>
                    <p className="text-xl font-bold text-slate-700">{ventasNecesarias}</p>
                    <p className="text-xs text-slate-400">${gpEfectiva.toLocaleString("es-AR")} c/u</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Consultas</p>
                    <p className="text-xl font-bold text-slate-700">{consultasNecesarias}</p>
                    <p className="text-xs text-slate-400">conv. {tdcEfectiva}%</p>
                  </div>
                  <div className="text-center bg-slate-900 rounded-lg py-2 px-3">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Por día</p>
                    <p className="text-3xl font-black text-white">{llamadasPorDia}</p>
                    <p className="text-xs text-slate-400">contactos</p>
                  </div>
                </div>
              )}
            </div>
          )}
          {objNum === 0 && (
            <p className="text-sm text-slate-400 text-center py-3">Ingresá tu objetivo mensual para calcular cuántos contactos necesitás por día.</p>
          )}
        </Section>

        {/* Canales */}
        <Section title="Rendimiento por Canal" icon={Zap}>
          {canales.length === 0
            ? <p className="text-sm text-slate-400 text-center py-6">Sin datos</p>
            : canales.slice(0, 6).map((c, i) => (
              <RankRow key={c.name} rank={i + 1} name={c.name} value={`${c.ventas} ganadas`}
                sub={`conv. ${c.conversion}%`}
                bar={(c.ventas / (canales[0]?.ventas || 1)) * 100} barColor={barColors[i] || "#6366f1"} />
            ))
          }
        </Section>

        {/* IA */}
        <AIInsights aiData={aiData} />

      </div>
    </div>
  );
}