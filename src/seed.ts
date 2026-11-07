import { addDays, type Dados, type Pacote, type Sessao } from './lib';

const CL: [string, string, string, string][] = [
  ['Helena Albuquerque', '(41) 90000-0101', 'Curitiba', 'Pele sensível; evita ácidos fortes.'],
  ['Marina Teixeira', '(41) 90000-0102', 'Curitiba', 'Prefere horários após as 17h.'],
  ['Beatriz Camargo', '(41) 90000-0103', 'São José dos Pinhais', 'Alergia a lidocaína tópica.'],
  ['Isadora Prado', '(41) 90000-0104', 'Curitiba', ''],
  ['Camila Ferraz', '(41) 90000-0105', 'Pinhais', 'Gestante: retomar após o parto.'],
  ['Letícia Nogueira', '(41) 90000-0106', 'Curitiba', 'Indicação da Marina Teixeira.'],
  ['Valentina Rocha', '(41) 90000-0107', 'Colombo', ''],
  ['Júlia Matos', '(41) 90000-0108', 'Curitiba', 'Toma anticoagulante: avisar a profissional.'],
  ['Renata Duarte', '(41) 90000-0109', 'Araucária', ''],
  ['Sofia Lacerda', '(41) 90000-0110', 'Curitiba', 'Primeira vez com laser.'],
];
// nome, sessões, valor, intervalo (dias)
export const PROT: [string, number, number, number][] = [
  ['Limpeza de pele profunda', 6, 840, 21],
  ['Drenagem linfática', 10, 1200, 7],
  ['Depilação a laser · axilas', 8, 960, 30],
  ['Peeling de diamante', 4, 720, 28],
  ['Microagulhamento facial', 3, 1350, 30],
  ['Radiofrequência corporal', 8, 1760, 14],
];
export const PROFS = ['Dra. Lívia Serrano', 'Tay Ribeiro', 'Dra. Marta Quintela'];
export const HORAS = ['09:00', '10:30', '14:00', '15:30', '17:00', '18:30'];

/** cliente, protocolo, realizadas, dias desde a última, agendar daqui a N dias (-1 = não), compra há N dias, % pago */
const PLANO: [number, number, number, number, number, number, number][] = [
  [0, 0, 3, 24, -1, 90, 100],
  [1, 1, 6, 9, -1, 70, 100],
  [2, 2, 3, 41, -1, 215, 60],
  [3, 3, 1, 12, 2, 40, 100],
  [4, 4, 1, 55, -1, 110, 50],
  [5, 5, 4, 6, 8, 75, 100],
  [6, 0, 6, 10, -1, 160, 100],
  [7, 1, 2, 18, 0, 30, 40],
  [8, 3, 2, 33, -1, 95, 100],
  [9, 2, 1, 5, 25, 20, 100],
  [0, 5, 2, 15, 1, 35, 100],
  [1, 4, 0, 0, 3, 5, 100],
  [3, 0, 2, 31, -1, 120, 70],
];

export function seed(hoje: string): Dados {
  const clientes = CL.map(([nome, tel, cidade, obs], i) => ({ id: `c${i}`, nome, tel, cidade, obs, desde: addDays(hoje, -400 + i * 31) }));
  const pacotes: Pacote[] = [];
  const sessoes: Sessao[] = [];
  PLANO.forEach(([ci, pi, feitas, desde, agendar, compra, pct], k) => {
    const [nome, total, valor, intervalo] = PROT[pi];
    const id = `p${k}`;
    pacotes.push({ id, clienteId: `c${ci}`, nome, total, valor, pago: Math.round((valor * pct) / 100), compra: addDays(hoje, -compra), validade: addDays(hoje, 240 - compra), intervalo });
    for (let n = 0; n < feitas; n++) {
      sessoes.push({ id: `${id}r${n}`, pacoteId: id, clienteId: `c${ci}`, data: addDays(hoje, -(desde + (feitas - 1 - n) * intervalo)), hora: HORAS[(k + n) % 6], prof: PROFS[(k + n) % 3], status: 'realizada' });
    }
    if (feitas > 2 && k % 4 === 0) sessoes.push({ id: `${id}f`, pacoteId: id, clienteId: `c${ci}`, data: addDays(hoje, -(desde + intervalo + 3)), hora: '16:00', prof: PROFS[k % 3], status: 'faltou' });
    if (agendar >= 0) sessoes.push({ id: `${id}a`, pacoteId: id, clienteId: `c${ci}`, data: addDays(hoje, agendar), hora: HORAS[(k * 2) % 6], prof: PROFS[k % 3], status: 'agendada' });
  });
  return { clientes, pacotes, sessoes };
}
