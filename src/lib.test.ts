import { describe, expect, it } from 'vitest';
import { addDays, livres, retornos, resumoFinanceiro, statusPacote, type Dados, type Pacote, type Sessao } from './lib';
import { seed } from './seed';

const H = '2026-11-07';
const pac = (o: Partial<Pacote> = {}): Pacote => ({ id: 'p', clienteId: 'c', nome: 'X', total: 4, valor: 400, pago: 400, compra: '2026-09-01', validade: '2027-03-01', intervalo: 14, ...o });
const ses = (status: Sessao['status'], data: string): Sessao => ({ id: data + status, pacoteId: 'p', clienteId: 'c', data, hora: '10:00', prof: 'A', status });

describe('pacotes', () => {
  it('saldo livre desconta realizadas e agendadas', () => {
    expect(livres(pac(), [ses('realizada', '2026-10-01'), ses('agendada', '2026-11-20'), ses('faltou', '2026-10-15')])).toBe(2);
  });
  it('status: concluído, vencido, vence em breve, ativo', () => {
    const feitas = [1, 2, 3, 4].map((i) => ses('realizada', `2026-10-0${i}`));
    expect(statusPacote(pac(), feitas, H)).toBe('concluído');
    expect(statusPacote(pac({ validade: '2026-11-01' }), [], H)).toBe('vencido');
    expect(statusPacote(pac({ validade: '2026-11-20' }), [], H)).toBe('vence em breve');
    expect(statusPacote(pac(), [], H)).toBe('ativo');
  });
});

describe('retornos', () => {
  const base = (s: Sessao[], contatado?: string): Dados => ({
    clientes: [{ id: 'c', nome: 'Ana', tel: '', cidade: '', desde: '', obs: '', contatado }],
    pacotes: [pac()],
    sessoes: s,
  });
  it('lista quem passou do intervalo sem sessão marcada', () => {
    const r = retornos(base([ses('realizada', '2026-10-10')]), H);
    expect(r).toHaveLength(1);
    expect(r[0].devido).toBe('2026-10-24');
    expect(r[0].atraso).toBe(14);
  });
  it('não lista com sessão agendada, contato feito ou fora da janela', () => {
    expect(retornos(base([ses('realizada', '2026-10-10'), ses('agendada', '2026-11-12')]), H)).toHaveLength(0);
    expect(retornos(base([ses('realizada', '2026-10-10')], '2026-11-05'), H)).toHaveLength(0);
    expect(retornos(base([ses('realizada', '2026-11-01')]), H)).toHaveLength(0);
  });
});

describe('financeiro e seed', () => {
  it('soma vendido, recebido e em aberto', () => {
    expect(resumoFinanceiro([pac(), pac({ valor: 1000, pago: 300 })])).toEqual({ vendido: 1400, recebido: 700, aberto: 700 });
  });
  it('addDays atravessa mês', () => expect(addDays('2026-11-28', 5)).toBe('2026-12-03'));
  it('seed é consistente e gera retornos', () => {
    const d = seed(H);
    for (const p of d.pacotes) expect(d.clientes.some((c) => c.id === p.clienteId)).toBe(true);
    for (const s of d.sessoes) expect(d.pacotes.some((p) => p.id === s.pacoteId)).toBe(true);
    expect(retornos(d, H).length).toBeGreaterThan(2);
  });
});
