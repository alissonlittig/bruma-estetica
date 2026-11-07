export type Cliente = { id: string; nome: string; tel: string; cidade: string; desde: string; obs: string; contatado?: string };
export type Pacote = { id: string; clienteId: string; nome: string; total: number; valor: number; pago: number; compra: string; validade: string; intervalo: number };
export type Status = 'agendada' | 'realizada' | 'faltou';
export type Sessao = { id: string; pacoteId: string; clienteId: string; data: string; hora: string; prof: string; status: Status };
export type Dados = { clientes: Cliente[]; pacotes: Pacote[]; sessoes: Sessao[] };

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (base: string, n: number) => {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const diasAte = (data: string, hoje: string) =>
  Math.round((new Date(data + 'T12:00:00').getTime() - new Date(hoje + 'T12:00:00').getTime()) / 864e5);

export const usadas = (p: Pacote, ss: Sessao[]) => ss.filter((s) => s.pacoteId === p.id && s.status === 'realizada').length;
export const agendadas = (p: Pacote, ss: Sessao[]) => ss.filter((s) => s.pacoteId === p.id && s.status === 'agendada').length;
/** sessões ainda disponíveis para marcar (total - realizadas - já agendadas) */
export const livres = (p: Pacote, ss: Sessao[]) => Math.max(0, p.total - usadas(p, ss) - agendadas(p, ss));

export type StatusPacote = 'concluído' | 'vencido' | 'vence em breve' | 'ativo';
export function statusPacote(p: Pacote, ss: Sessao[], hoje: string): StatusPacote {
  if (usadas(p, ss) >= p.total) return 'concluído';
  const d = diasAte(p.validade, hoje);
  return d < 0 ? 'vencido' : d <= 30 ? 'vence em breve' : 'ativo';
}

export const ultimaSessao = (clienteId: string, ss: Sessao[]) =>
  ss.filter((s) => s.clienteId === clienteId && s.status === 'realizada').map((s) => s.data).sort().pop();

export type Retorno = { cliente: Cliente; pacote: Pacote; devido: string; atraso: number };
/**
 * Retorno devido: pacote com saldo, dentro da validade e sem sessão agendada, onde
 * última sessão realizada (ou a compra) + intervalo do protocolo já passou ou passa em 7 dias.
 */
export function retornos(d: Dados, hoje: string): Retorno[] {
  const out: Retorno[] = [];
  for (const p of d.pacotes) {
    const c = d.clientes.find((x) => x.id === p.clienteId);
    if (!c || usadas(p, d.sessoes) >= p.total || diasAte(p.validade, hoje) < 0 || agendadas(p, d.sessoes) > 0) continue;
    const ult = d.sessoes.filter((s) => s.pacoteId === p.id && s.status === 'realizada').map((s) => s.data).sort().pop() ?? p.compra;
    const devido = addDays(ult, p.intervalo);
    const atraso = -diasAte(devido, hoje);
    if (atraso >= -7 && !(c.contatado && c.contatado >= devido)) out.push({ cliente: c, pacote: p, devido, atraso });
  }
  return out.sort((a, b) => b.atraso - a.atraso);
}

export const resumoFinanceiro = (pacotes: Pacote[]) => ({
  vendido: pacotes.reduce((s, p) => s + p.valor, 0),
  recebido: pacotes.reduce((s, p) => s + p.pago, 0),
  aberto: pacotes.reduce((s, p) => s + (p.valor - p.pago), 0),
});

export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const dataBR = (s: string) => s.split('-').reverse().join('/');
export const uid = () => Math.random().toString(36).slice(2, 9);
