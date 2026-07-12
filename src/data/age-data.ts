// Dados estáticos das faixas etárias (CDC/NCHS 2022, Pew Research 2023)

export type AgeBand = "18-29" | "30-44" | "45-59" | "60+";

export interface BandData {
  label: string;
  ansiedade: number;
  depressao: number;
  sobrecarga: number;
}

export const AGE_BANDS: Record<AgeBand, BandData> = {
  "18-29": { label: "18 a 29 anos", ansiedade: 29.4, depressao: 24.6, sobrecarga: 28.0 },
  "30-44": { label: "30 a 44 anos", ansiedade: 20.7, depressao: 21.8, sobrecarga: 33.0 },
  "45-59": { label: "45 a 59 anos", ansiedade: 18.2, depressao: 18.1, sobrecarga: 22.0 },
  "60+":   { label: "60+ anos",     ansiedade: 11.7, depressao: 14.3, sobrecarga: 12.0 },
};

export function getAgeBand(age: number): AgeBand {
  if (age < 30) return "18-29";
  if (age < 45) return "30-44";
  if (age < 60) return "45-59";
  return "60+";
}

// Headlines: conectam situação → corpo em alerta (metáfora do mecanismo NeuroFé)
export const ALERT_HEADLINES: Record<string, string> = {
  "casada-filhos-pequenos": "Seu corpo está em alerta 24 horas — e ninguém percebe porque você não para.",
  "casada-filhos-grandes": "A rotina mudou, mas o alarme dentro de você nunca desligou.",
  "casada-sem-filhos": "Por fora parece que está tudo certo. Por dentro, o alarme não para.",
  "mae-solo": "Você cuida de tudo sozinha — e o corpo paga a conta em silêncio.",
  "solteira": "O peso que ninguém vê é o mais perigoso — porque ninguém pergunta.",
};

// Subs: dado real + conexão com corpo travado em modo de emergência
export const ALERT_SUBS: Record<string, string> = {
  "casada-filhos-pequenos": "1 em cada 3 mães nessa faixa vive em sobrecarga silenciosa. Não é exagero: é o corpo travado em modo de emergência há tempo demais.",
  "casada-filhos-grandes": "O corpo não desliga o alerta só porque os filhos cresceram. A sobrecarga muda de forma — mas continua drenando.",
  "casada-sem-filhos": "Ansiedade não precisa de motivo visível. O corpo registra perigo mesmo quando a vida parece em ordem.",
  "mae-solo": "Mães solo têm 2x mais chance de burnout parental. O corpo vive em plantão — e não sabe que pode sair.",
  "solteira": "Mulheres solteiras relatam os maiores índices de ansiedade não nomeada. O alarme dispara igual — só não tem testemunha.",
};

// Blocos emocionais: o que o alarme travado causa no dia a dia
export const ALERT_EMOTIONAL: Record<string, string> = {
  "casada-filhos-pequenos": "Paciência no limite com os filhos. Presença no casamento que some. E a dor de amar demais e estar cansada demais pra viver isso em paz.",
  "casada-filhos-grandes": "Distância dos filhos sem entender por quê. Sensação de vazio mesmo com a missão cumprida. E a culpa de não conseguir sentir alegria.",
  "casada-sem-filhos": "Tensão que o casamento não explica. Cobrança interna que não para. E a sensação de que deveria estar bem — mas o corpo diz outra coisa.",
  "mae-solo": "Exaustão sem folga. Culpa por não dar conta. E o medo constante de que algo vai dar errado quando você não estiver olhando.",
  "solteira": "Isolamento que parece escolha mas é proteção. Dificuldade de confiar. E a sensação de carregar um peso que ninguém mais enxerga.",
};
