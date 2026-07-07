import type { Archetype } from "@prod/data/quiz";

// ---------- HERO (Passo 0) ----------
export const HERO = {
  headline: "Deus não te chamou para viver de plantão.",
  sub: "Sua exaustão não é falta de fé, é o seu corpo pedindo rendição. Descubra em 2 minutos qual padrão está roubando sua paz e como voltar ao colo do Pai.",
  microLabel: "Toque no que mais dói hoje:",
};

export type Dor = {
  id: "cansaco" | "oracao" | "culpa";
  label: string;
  preScore: Partial<Record<Archetype, number>>;
  reply: string; // resposta da Jaqueline na tela do nome
};

export const DORES: Dor[] = [
  {
    id: "cansaco",
    label: "O cansaço que me esmaga",
    preScore: { sobrecarga: 2 },
    reply: "Eu te vejo. Esse peso nos ombros tem nome — é o seu corpo gritando o que a sua boca cala. Vamos entender juntas como esse alarme travou.",
  },
  {
    id: "oracao",
    label: "Minha oração não passa do teto",
    preScore: { vigilante: 2 },
    reply: "Não é que Deus não te ouve. É que existe um ruído por dentro abafando a voz d'Ele. Vamos descobrir de onde vem esse ruído.",
  },
  {
    id: "culpa",
    label: "Sinto culpa por querer sumir",
    preScore: { culposa: 2 },
    reply: "Querer sumir não é falta de amor pela sua família. É um coração que carrega mais do que devia. Ninguém aqui vai te julgar.",
  },
];

export const NAME_ASK = "Antes de darmos nome ao seu padrão, como posso te chamar? Quero falar diretamente com você.";
export const NAME_CTA = "Descobrir meu padrão →";

// ---------- CHAT DE VALIDAÇÃO ----------
/** Exibido após marcar a opção, antes da próxima pergunta. {nome} é substituído. */
export const FEEDBACKS: Record<string, Record<string, string>> = {
  situacao: {
    "casada-filhos-pequenos": "Entendi, {nome}. Quem cuida de filho pequeno raramente tem tempo de escutar a si mesma. Você reservou esses minutos — use com honestidade.",
    "casada-filhos-grandes": "Entendi, {nome}. Mãe de filho grande aprende que reclamar é fraqueza. Aqui não tem ninguém para te julgar.",
    "casada-sem-filhos": "Entendi, {nome}. Existe uma exaustão que aparece quando por fora 'está tudo certo' — e justamente por isso ninguém suspeita.",
    "mae-solo": "{nome}, sustentar uma casa sozinha já é peso suficiente. Algumas perguntas vão ser difíceis, mas só você pode responder por você.",
    "solteira": "{nome}, ansiedade não tem cara nem idade. Mulher solteira sofre em silêncio porque ninguém pergunta. Aqui, alguém está perguntando.",
  },
  risco: {
    funcionando: "\"Cansada, mas funcionando\" — {nome}, essa é a frase de quem segura tudo. Ser sincera é o primeiro passo do alívio.",
    dificil: "Dias difíceis e você continua de pé. Isso diz muito, {nome}. Agora vamos entender o que está drenando essa força.",
    sombrios: "{nome}, obrigada pela coragem de marcar isso. Você não está sozinha — e o que você sente tem caminho. Continua comigo.",
    crise: "{nome}, eu recebi isso com cuidado. Você deu um passo importante ao ser honesta. Vamos com calma, uma pergunta de cada vez.",
  },
  sintoma: {
    madrugada: "Acordar entre 3h e 5h não é insônia comum, {nome}. É o seu sistema fazendo a ronda da casa porque não sente segurança para desligar.",
    tensao: "Ombros, pescoço, mandíbula… {nome}, seu corpo está gritando o que sua boca cala. Esse cansaço mora onde dormir não alcança.",
    estomago: "Quando o estômago trava, é o sistema nervoso falando uma língua que poucos médicos traduzem. Você não está inventando, {nome}.",
    peito: "Peito apertado e a sensação de que algo ruim vem… isso tem nome técnico, {nome} — e tem caminho de saída.",
    todos: "Quando o corpo manifesta tudo, é porque um padrão dominante está disparando os outros. Vamos encontrar o seu, {nome}.",
  },
  comportamento: {
    checagem: "Checar a porta, o gás, a mensagem do filho… {nome}, você virou a sentinela da casa. E sentinela nenhuma aguenta o turno a vida inteira.",
    "aceitar-mais": "Mais uma tarefa, mais um cuidado, e você por último. {nome}, você tenta segurar tudo para nada desabar — e desaba por dentro.",
    oracao: "Você ora, relê, tenta confiar — e não passa. {nome}, isso não é falta de fé. É um alarme que oração nenhuma desliga sem o sinal certo.",
    cenarios: "Criar o diálogo difícil antes de acontecer é a mente tentando se proteger do golpe. Mas ela apanha duas vezes, {nome}: na imaginação e na vida.",
  },
  frase: {
    soltar: "\"Se eu soltar, algo ruim acontece.\" Essa frase é a corrente, {nome}. E correntes não se quebram com esforço — se quebram com verdade.",
    "nao-parar": "\"Não posso parar.\" {nome}, sabia que descansar também é um ato de obediência? Estamos chegando no seu veredito.",
    insuficiente: "\"Nunca sou suficiente.\" {nome}, quem plantou essa frase em você não foi Deus. Vamos arrancar essa raiz pelo nome.",
    pior: "\"E se acontecer o pior?\" — a pergunta que rouba o presente para pagar um futuro que quase nunca chega. Falta pouco, {nome}.",
  },
  espiritual: {
    "mente-nao-desliga": "Você tenta orar e a mente não desliga. Não é que Deus não te ouve, {nome} — é o ruído do alarme abafando a voz d'Ele.",
    "sirvo-muito": "Servir muito e sentir pouco… {nome}, você virou a Marta da casa. E o convite de Jesus continua de pé: escolher a boa parte.",
    "perdao-constante": "Pedir perdão o tempo todo é sinal de um coração sensível — que aprendeu a se acusar. {nome}, condenação não vem de Deus.",
    "medo-abandono": "Medo de abandono não é profecia, {nome}. É um alarme antigo. E alarme se desliga — vou te mostrar como.",
  },
  desejo: {
    dormir: "Dormir a noite inteira… {nome}, guarda esse desejo. Ele vai voltar já já — com um caminho do lado.",
    descansar: "Descansar sem culpa. {nome}, esse desejo é bíblico — e é exatamente para ele que existe um caminho.",
    orar: "Sentir Deus de novo. {nome}, esse é o desejo nº 1 das mulheres que passam por aqui. E ele tem resposta.",
    "parar-pior": "Parar de imaginar o pior. {nome}, a sua mente pode aprender um caminho novo — é literalmente Romanos 12:2.",
  },
};

// ---------- GATE WHATSAPP ----------
export const WHATS_GATE = {
  title: "{nome}, seu diagnóstico está pronto.",
  sub: "Deixa seu WhatsApp para eu te enviar o seu padrão completo e o caminho de saída — e você já vê tudo aqui na tela, agora.",
  cta: "Ver meu diagnóstico agora →",
  privacy: "🔒 Seus dados estão seguros. Nada de spam — apenas o seu resultado.",
};

// ---------- LOADING ----------
export const LOADING = {
  bridge: "{nome}, cada padrão tem um caminho específico de saída. Estou cruzando suas respostas para montar o seu…",
  proof: "Enquanto isso, veja o que aconteceu com mulheres que descobriram o delas:",
  steps: ["Analisando seus sintomas…", "Identificando seu padrão…", "Montando seu caminho de saída…"],
  durationMs: 9000,
};

// ---------- DEPOIMENTOS (MODELOS — ancorar em histórias reais antes de produção) ----------
export type Testimonial = { name: string; time: string; text: string; reactions?: string };
export const TESTIMONIALS: Testimonial[] = [
  { name: "Lúcia", time: "22:47", text: "Gente eu preciso contar. hj é meu décimo dia do protocolo e eu dormi a noite INTEIRA pela primeira vez em anos. acordei e chorei de gratidão viu 🙏❤️", reactions: "🙏 ❤️ 6" },
  { name: "Marta R.", time: "06:12", text: "Fiz a oração da manhã do volume 1 antes de todo mundo acordar. faz 8 dias que não acordo 3h da madrugada. só quem passa sabe o que é isso", reactions: "😭 4" },
  { name: "Ana Paula", time: "21:03", text: "eu confesso que estou sentindo muito forte todo poder que existe na oração. minha mandíbula soltou, meus ombros soltaram. glória a Deus pela sua vida viu ❤️" },
  { name: "Regina", time: "13:28", text: "Meu esposo perguntou o que mudou em mim kkk eu tava mais leve sem gritar com ninguém. mostrei o app pra ele e ele fez a noite comigo 🙏", reactions: "❤️ 8" },
  { name: "Cleide", time: "23:10", text: "sempre achei que era falta de fé minha. quando entendi que era o alarme travado eu chorei. Deus usou esse protocolo na minha vida", reactions: "🙏 3" },
  { name: "Sônia", time: "20:39", text: "no terceiro dia senti a presença de Deus na oração de novo. fazia TEMPO. já estou colhendo os frutos da minha fé viu ❤️🙏" },
];

// ---------- DICOTOMIA ----------
export const DICOTOMIA = {
  title: "{nome}, existe uma escolha na sua frente.",
  ladoA: { tag: "A Mula de Carga", emoji: "🔴", items: ["As sobras de paciência para quem você ama", "O alarme ligado dia e noite", "A fé secando no cansaço"] },
  ladoB: { tag: "A Filha Cuidada", emoji: "🟢", items: ["O turno rendido no colo do Pai", "O sono que volta a ser abrigo", "A Presença que você sente de novo"] },
  fecho: "Deus está rendendo o seu turno agora, {nome}. Você aceita o colo?",
  cta: "Aceito o colo do Pai →",
};

// ---------- OFERTA (copy nova; números de NEUROFE_OFFER/@prod) ----------
export const OFERTA_V2 = {
  chamada: "{nome}, este é o seu caminho de volta.",
  produto: "Rotina de Paz — Protocolo de 14 Encontros",
  passos: [
    { n: 1, titulo: "Render o corpo", texto: "Usamos o fôlego para calar o grito biológico. Se o corpo não silencia, a alma não ouve.", img: 2 },
    { n: 2, titulo: "Resetar a mente", texto: "Tiramos o seu cérebro do 'modo operacional' para sintonizar a paz (Romanos 12:2).", img: 3 },
    { n: 3, titulo: "Habitar no colo", texto: "Com o alarme desligado, a entrega finalmente 'gruda' — e você volta a sentir Deus de perto.", img: 4 },
  ],
  precoFrase: "Um investimento único de R$ 47 para render o seu plantão.",
  garantia: "Faça a sua primeira noite. Se você não sentir a primeira gota de paz, eu devolvo cada centavo — e você ainda fica com os áudios e bônus. Eu não quero o seu dinheiro se você não sentir o alívio que o Pai reservou para você.",
  garantiaDias: 15,
};
