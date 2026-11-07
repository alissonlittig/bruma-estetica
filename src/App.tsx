import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import {
  addDays, agendadas, brl, dataBR, diasAte, iso, livres, resumoFinanceiro, retornos, statusPacote, uid, ultimaSessao, usadas,
  type Cliente, type Dados, type Pacote, type Sessao, type Status,
} from './lib';
import { HORAS, PROFS, PROT, seed } from './seed';

const KEY = 'bruma-estetica:v1';
const hoje = iso(new Date());

function carregar(): Dados {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Dados;
  } catch {
    localStorage.removeItem(KEY); // JSON corrompido: recomeça da semente
  }
  return seed(hoje);
}

type Aba = 'painel' | 'agenda' | 'pacotes' | 'clientes' | 'retornos';
const ABAS: { id: Aba; nome: string; d: string }[] = [
  { id: 'painel', nome: 'Painel', d: 'M3 12 12 4l9 8M5 10v10h5v-6h4v6h5V10' },
  { id: 'agenda', nome: 'Agenda', d: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
  { id: 'pacotes', nome: 'Pacotes', d: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8' },
  { id: 'clientes', nome: 'Clientes', d: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6' },
  { id: 'retornos', nome: 'Retornos', d: 'M4 12a8 8 0 018-8 8 8 0 016 2.7M20 4v5h-5M20 12a8 8 0 01-14 5.3M4 20v-5h5' },
];
const Ico = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={d} /></svg>
);

const rotuloDia = (d: string) => {
  const n = diasAte(d, hoje);
  return n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : n === -1 ? 'Ontem' : dataBR(d).slice(0, 5);
};
const iniciais = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('');

function Modal({ titulo, fechar, children }: { titulo: string; fechar: () => void; children: ComponentChildren }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && fechar();
    addEventListener('keydown', h);
    return () => removeEventListener('keydown', h);
  }, []);
  return (
    <div class="veil" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div class="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div class="mh"><h2>{titulo}</h2><button class="x" onClick={fechar} aria-label="Fechar">×</button></div>
        {children}
      </div>
    </div>
  );
}

const Tag = ({ t }: { t: string }) => <span class={'tag ' + t.replace(/\s/g, '-').replace('í', 'i')}>{t}</span>;
const Barra = ({ feitas, marc, total }: { feitas: number; marc: number; total: number }) => (
  <div class="bar" role="img" aria-label={`${feitas} de ${total} sessões realizadas, ${marc} agendadas`}>
    <i style={{ width: `${(feitas / total) * 100}%` }} />
    <i class="m" style={{ width: `${(marc / total) * 100}%` }} />
  </div>
);

export function App() {
  const [d, setD] = useState<Dados>(carregar);
  const [aba, setAba] = useState<Aba>('painel');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { t: 'cliente' } | { t: 'venda'; cid?: string } | { t: 'agendar'; pid: string }>(null);
  const [aviso, setAviso] = useState('');
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(d)), [d]);
  useEffect(() => { if (aviso) { const t = setTimeout(() => setAviso(''), 2600); return () => clearTimeout(t); } }, [aviso]);

  const cli = (id: string) => d.clientes.find((c) => c.id === id)!;
  const pac = (id: string) => d.pacotes.find((p) => p.id === id)!;
  const ret = useMemo(() => retornos(d, hoje), [d]);
  const fin = resumoFinanceiro(d.pacotes);
  const msg = (t: string) => setAviso(t);

  const setStatus = (id: string, status: Status) => { setD({ ...d, sessoes: d.sessoes.map((s) => (s.id === id ? { ...s, status } : s)) }); msg(status === 'realizada' ? 'Sessão registrada; saldo do pacote atualizado.' : status === 'faltou' ? 'Falta registrada.' : 'Sessão reaberta.'); };
  const receber = (p: Pacote) => { setD({ ...d, pacotes: d.pacotes.map((x) => (x.id === p.id ? { ...x, pago: x.valor } : x)) }); msg(`Recebimento de ${brl(p.valor - p.pago)} lançado.`); };
  const contatar = (c: Cliente) => { setD({ ...d, clientes: d.clientes.map((x) => (x.id === c.id ? { ...x, contatado: hoje } : x)) }); msg(`Contato com ${c.nome.split(' ')[0]} registrado.`); };

  const busca = q.trim().toLowerCase();
  const clientes = d.clientes.filter((c) => !busca || (c.nome + c.cidade + c.tel).toLowerCase().includes(busca));
  const proximas = d.sessoes.filter((s) => s.status === 'agendada').sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  const pendentesHoje = d.sessoes.filter((s) => s.status === 'agendada' && s.data <= hoje).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  const aVencer = d.pacotes.filter((p) => ['vence em breve'].includes(statusPacote(p, d.sessoes, hoje)));
  const emAberto = d.pacotes.filter((p) => p.pago < p.valor);

  const LinhaSessao = ({ s, acoes = true }: { s: Sessao; acoes?: boolean }) => (
    <li class="row">
      <div class="when"><b>{s.hora}</b><span>{rotuloDia(s.data)}</span></div>
      <div class="grow"><button class="lnk" onClick={() => { setSel(s.clienteId); setAba('clientes'); }}>{cli(s.clienteId).nome}</button><div class="mut">{pac(s.pacoteId).nome} · {s.prof}</div></div>
      {acoes && s.status === 'agendada' && s.data <= hoje ? (
        <div class="acts"><button class="btn sm" onClick={() => setStatus(s.id, 'realizada')}>Realizada</button><button class="btn sm ghost" onClick={() => setStatus(s.id, 'faltou')}>Faltou</button></div>
      ) : <Tag t={s.status === 'agendada' ? 'agendada' : s.status} />}
    </li>
  );

  const CartaoPacote = ({ p }: { p: Pacote }) => {
    const st = statusPacote(p, d.sessoes, hoje);
    const u = usadas(p, d.sessoes), a = agendadas(p, d.sessoes);
    return (
      <article class="card pk">
        <div class="pkh"><div><h3>{p.nome}</h3><button class="lnk" onClick={() => { setSel(p.clienteId); setAba('clientes'); }}>{cli(p.clienteId).nome}</button></div><Tag t={st} /></div>
        <Barra feitas={u} marc={a} total={p.total} />
        <div class="pkm"><span><b>{u}</b> de {p.total} realizadas</span><span class="mut">{a ? `${a} agendada${a > 1 ? 's' : ''} · ` : ''}{livres(p, d.sessoes)} a marcar</span></div>
        <div class="pkm mut"><span>Validade {dataBR(p.validade)}</span><span>{p.pago >= p.valor ? `Quitado · ${brl(p.valor)}` : `Falta ${brl(p.valor - p.pago)} de ${brl(p.valor)}`}</span></div>
        <div class="acts">
          {livres(p, d.sessoes) > 0 && st !== 'vencido' && <button class="btn sm" onClick={() => setModal({ t: 'agendar', pid: p.id })}>Agendar sessão</button>}
          {p.pago < p.valor && <button class="btn sm ghost" onClick={() => receber(p)}>Lançar recebimento</button>}
        </div>
      </article>
    );
  };

  const titulos: Record<Aba, [string, string]> = {
    painel: ['Bom dia, equipe', 'Resumo da clínica em ' + new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })],
    agenda: ['Agenda', 'Sessões marcadas, em ordem de data'],
    pacotes: ['Pacotes', 'Saldo de sessões, validade e pagamento'],
    clientes: ['Clientes', `${d.clientes.length} cadastradas`],
    retornos: ['Retornos', 'Quem já deveria estar de volta — e ainda não marcou'],
  };

  const detalhe = sel ? d.clientes.find((c) => c.id === sel) : undefined;

  return (
    <div class="app">
      <a class="skip" href="#main">Pular para o conteúdo</a>
      <aside class="side">
        <div class="brand"><span class="logo" aria-hidden="true" />Bruma</div>
        <nav aria-label="Principal">
          {ABAS.map((a) => (
            <button class={'nav' + (aba === a.id ? ' on' : '')} aria-current={aba === a.id ? 'page' : undefined} onClick={() => { setAba(a.id); setSel(null); }}>
              <Ico d={a.d} /><span>{a.nome}</span>{a.id === 'retornos' && ret.length > 0 && <em>{ret.length}</em>}
            </button>
          ))}
        </nav>
        <div class="side-foot">Dados fictícios guardados só neste navegador.<button class="lnk w" onClick={() => { setD(seed(hoje)); msg('Dados de demonstração restaurados.'); }}>Restaurar demonstração</button></div>
      </aside>
      <div class="col">
        <header class="top">
          <label class="search"><span class="sr">Buscar cliente</span><input type="search" placeholder="Buscar cliente, cidade ou telefone" value={q} onInput={(e) => { setQ((e.target as HTMLInputElement).value); if (aba !== 'clientes') { setAba('clientes'); setSel(null); } }} /></label>
          <span class="demo">Demonstração · dados fictícios</span>
        </header>
        <main id="main" tabIndex={-1}>
          <div class="titulo">
            <div><h1>{titulos[aba][0]}</h1><p class="mut cap">{titulos[aba][1]}</p></div>
            <div class="acts">
              {aba === 'clientes' && <button class="btn ghost" onClick={() => setModal({ t: 'cliente' })}>Nova cliente</button>}
              <button class="btn" onClick={() => setModal({ t: 'venda' })}>Vender pacote</button>
            </div>
          </div>

          {aba === 'painel' && (<>
            <section class="kpis" aria-label="Indicadores">
              <div class="kpi"><span>Sessões hoje</span><b>{d.sessoes.filter((s) => s.data === hoje && s.status !== 'faltou').length}</b><small>{pendentesHoje.length} aguardando registro</small></div>
              <div class="kpi"><span>Pacotes ativos</span><b>{d.pacotes.filter((p) => ['ativo', 'vence em breve'].includes(statusPacote(p, d.sessoes, hoje))).length}</b><small>{aVencer.length} vencem em 30 dias</small></div>
              <div class="kpi warn"><span>Retornos pendentes</span><b>{ret.length}</b><small>{ret.filter((r) => r.atraso > 14).length} há mais de 14 dias</small></div>
              <div class="kpi"><span>A receber</span><b>{brl(fin.aberto)}</b><small>de {brl(fin.vendido)} vendidos</small></div>
            </section>
            <div class="grid2">
              <section class="card"><h2>Próximas sessões</h2><ul class="list">{proximas.slice(0, 6).map((s) => <LinhaSessao s={s} />)}</ul></section>
              <section class="card"><h2>Retornos para chamar</h2>
                <ul class="list">{ret.slice(0, 5).map((r) => (
                  <li class="row"><span class="av">{iniciais(r.cliente.nome)}</span><div class="grow"><b>{r.cliente.nome}</b><div class="mut">{r.pacote.nome} · {usadas(r.pacote, d.sessoes)}/{r.pacote.total}</div></div><span class={'late' + (r.atraso > 14 ? ' hot' : '')}>{r.atraso > 0 ? `${r.atraso} d de atraso` : 'esta semana'}</span></li>
                ))}{ret.length === 0 && <li class="mut">Nenhum retorno pendente.</li>}</ul>
                <button class="lnk" onClick={() => setAba('retornos')}>Ver todos os retornos</button>
              </section>
            </div>
          </>)}

          {aba === 'agenda' && (
            <section class="card"><ul class="list">{proximas.map((s) => <LinhaSessao s={s} />)}{proximas.length === 0 && <li class="mut">Nada agendado. Abra um pacote e marque a próxima sessão.</li>}</ul></section>
          )}

          {aba === 'pacotes' && (<>
            <div class="grid3">{d.pacotes.slice().sort((a, b) => a.validade.localeCompare(b.validade)).map((p) => <CartaoPacote p={p} />)}</div>
            {emAberto.length > 0 && <p class="mut foot">Em aberto: {brl(fin.aberto)} em {emAberto.length} pacotes.</p>}
          </>)}

          {aba === 'clientes' && !detalhe && (
            <section class="card flush"><ul class="list">{clientes.map((c) => {
              const u = ultimaSessao(c.id, d.sessoes);
              const n = d.pacotes.filter((p) => p.clienteId === c.id && statusPacote(p, d.sessoes, hoje) !== 'concluído').length;
              return <li class="row click"><span class="av">{iniciais(c.nome)}</span><button class="grow rb" onClick={() => setSel(c.id)}><b>{c.nome}</b><div class="mut">{c.cidade} · {n} pacote{n === 1 ? '' : 's'} em andamento</div></button><span class="mut hide-s">{u ? 'Última visita ' + dataBR(u) : 'Sem visitas'}</span></li>;
            })}{clientes.length === 0 && <li class="mut pad">Nenhuma cliente encontrada para “{q}”.</li>}</ul></section>
          )}

          {aba === 'clientes' && detalhe && (
            <section>
              <button class="lnk back" onClick={() => setSel(null)}>← Todas as clientes</button>
              <div class="card hd"><span class="av lg">{iniciais(detalhe.nome)}</span><div class="grow"><h2 style={{ margin: 0 }}>{detalhe.nome}</h2><div class="mut">{detalhe.cidade} · {detalhe.tel} · cliente desde {dataBR(detalhe.desde)}</div>{detalhe.obs && <p class="obs">{detalhe.obs}</p>}</div><button class="btn sm" onClick={() => setModal({ t: 'venda', cid: detalhe.id })}>Vender pacote</button></div>
              <h2 class="sp">Pacotes</h2>
              <div class="grid3">{d.pacotes.filter((p) => p.clienteId === detalhe.id).map((p) => <CartaoPacote p={p} />)}</div>
              <h2 class="sp">Histórico de sessões</h2>
              <section class="card"><ul class="list">{d.sessoes.filter((s) => s.clienteId === detalhe.id).sort((a, b) => b.data.localeCompare(a.data)).map((s) => <LinhaSessao s={s} />)}</ul></section>
            </section>
          )}

          {aba === 'retornos' && (
            <section class="card flush"><ul class="list">{ret.map((r) => (
              <li class="row">
                <span class="av">{iniciais(r.cliente.nome)}</span>
                <div class="grow"><b>{r.cliente.nome}</b><div class="mut">{r.pacote.nome} · fez {usadas(r.pacote, d.sessoes)} de {r.pacote.total} · retorno previsto {dataBR(r.devido)}</div></div>
                <span class={'late' + (r.atraso > 14 ? ' hot' : '')}>{r.atraso > 0 ? `${r.atraso} d de atraso` : 'esta semana'}</span>
                <div class="acts"><button class="btn sm" onClick={() => setModal({ t: 'agendar', pid: r.pacote.id })}>Agendar</button><button class="btn sm ghost" onClick={() => contatar(r.cliente)}>Contato feito</button></div>
              </li>
            ))}{ret.length === 0 && <li class="mut pad">Tudo em dia: ninguém aguardando contato.</li>}</ul></section>
          )}
        </main>
      </div>

      <nav class="tabbar" aria-label="Principal (celular)">
        {ABAS.map((a) => <button class={aba === a.id ? 'on' : ''} aria-current={aba === a.id ? 'page' : undefined} onClick={() => { setAba(a.id); setSel(null); }}><Ico d={a.d} /><span>{a.nome}</span></button>)}
      </nav>

      {modal?.t === 'cliente' && <FormCliente fechar={() => setModal(null)} salvar={(c) => { setD({ ...d, clientes: [{ ...c, id: uid(), desde: hoje }, ...d.clientes] }); setModal(null); msg('Cliente cadastrada.'); }} />}
      {modal?.t === 'venda' && <FormVenda cid={modal.cid} clientes={d.clientes} fechar={() => setModal(null)} salvar={(cid, pi, entrada) => {
        const [nome, total, valor, intervalo] = PROT[pi];
        setD({ ...d, pacotes: [{ id: uid(), clienteId: cid, nome, total, valor, pago: entrada, compra: hoje, validade: addDays(hoje, 240), intervalo }, ...d.pacotes] });
        setModal(null); setAba('pacotes'); setSel(null); msg(`Pacote “${nome}” vendido para ${cli(cid).nome.split(' ')[0]}.`);
      }} />}
      {modal?.t === 'agendar' && <FormAgendar p={pac(modal.pid)} cliente={cli(pac(modal.pid).clienteId)} fechar={() => setModal(null)} salvar={(data, hora, prof) => {
        const p = pac(modal.pid);
        setD({ ...d, sessoes: [...d.sessoes, { id: uid(), pacoteId: p.id, clienteId: p.clienteId, data, hora, prof, status: 'agendada' }] });
        setModal(null); msg(`Sessão marcada para ${dataBR(data)} às ${hora}.`);
      }} />}
      <div class="toast" role="status" aria-live="polite">{aviso}</div>
    </div>
  );
}

function FormCliente({ fechar, salvar }: { fechar: () => void; salvar: (c: Omit<Cliente, 'id' | 'desde'>) => void }) {
  const [nome, setNome] = useState(''); const [tel, setTel] = useState(''); const [cidade, setCidade] = useState('Curitiba'); const [obs, setObs] = useState('');
  return (
    <Modal titulo="Nova cliente" fechar={fechar}>
      <form onSubmit={(e) => { e.preventDefault(); if (nome.trim()) salvar({ nome: nome.trim(), tel, cidade, obs }); }}>
        <label>Nome<input required value={nome} onInput={(e) => setNome((e.target as HTMLInputElement).value)} autoFocus /></label>
        <label>Telefone<input value={tel} placeholder="(41) 90000-0000" onInput={(e) => setTel((e.target as HTMLInputElement).value)} /></label>
        <label>Cidade<input value={cidade} onInput={(e) => setCidade((e.target as HTMLInputElement).value)} /></label>
        <label>Observações clínicas<input value={obs} onInput={(e) => setObs((e.target as HTMLInputElement).value)} /></label>
        <button class="btn">Cadastrar</button>
      </form>
    </Modal>
  );
}

function FormVenda({ cid, clientes, fechar, salvar }: { cid?: string; clientes: Cliente[]; fechar: () => void; salvar: (cid: string, pi: number, entrada: number) => void }) {
  const [c, setC] = useState(cid ?? clientes[0]?.id ?? ''); const [pi, setPi] = useState(0); const [ent, setEnt] = useState(0);
  const [, total, valor] = PROT[pi];
  return (
    <Modal titulo="Vender pacote" fechar={fechar}>
      <form onSubmit={(e) => { e.preventDefault(); salvar(c, pi, Math.min(Math.max(ent, 0), valor)); }}>
        <label>Cliente<select value={c} onChange={(e) => setC((e.target as HTMLSelectElement).value)}>{clientes.map((x) => <option value={x.id}>{x.nome}</option>)}</select></label>
        <label>Protocolo<select value={pi} onChange={(e) => setPi(Number((e.target as HTMLSelectElement).value))}>{PROT.map((p, i) => <option value={i}>{p[0]} · {p[1]} sessões</option>)}</select></label>
        <p class="resumo">{total} sessões · {brl(valor)} · validade de 8 meses</p>
        <label>Entrada (R$)<input type="number" min="0" max={valor} value={ent} onInput={(e) => setEnt(Number((e.target as HTMLInputElement).value))} /></label>
        <button class="btn">Confirmar venda</button>
      </form>
    </Modal>
  );
}

function FormAgendar({ p, cliente, fechar, salvar }: { p: Pacote; cliente: Cliente; fechar: () => void; salvar: (data: string, hora: string, prof: string) => void }) {
  const [data, setData] = useState(addDays(hoje, 1)); const [hora, setHora] = useState(HORAS[0]); const [prof, setProf] = useState(PROFS[0]);
  const fora = diasAte(data, hoje) < 0 || data > p.validade;
  return (
    <Modal titulo="Agendar sessão" fechar={fechar}>
      <form onSubmit={(e) => { e.preventDefault(); if (!fora) salvar(data, hora, prof); }}>
        <p class="resumo">{cliente.nome} · {p.nome}</p>
        <label>Data<input type="date" required min={hoje} max={p.validade} value={data} onInput={(e) => setData((e.target as HTMLInputElement).value)} /></label>
        {fora && <p class="erro" role="alert">Escolha uma data entre hoje e {dataBR(p.validade)} (validade do pacote).</p>}
        <label>Horário<select value={hora} onChange={(e) => setHora((e.target as HTMLSelectElement).value)}>{HORAS.map((h) => <option>{h}</option>)}</select></label>
        <label>Profissional<select value={prof} onChange={(e) => setProf((e.target as HTMLSelectElement).value)}>{PROFS.map((h) => <option>{h}</option>)}</select></label>
        <button class="btn" disabled={fora}>Marcar sessão</button>
      </form>
    </Modal>
  );
}
