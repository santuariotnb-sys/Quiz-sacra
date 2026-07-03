// =====================================================================
// CONTEÚDO DO QUIZ — Rotina de Paz (conteúdo oficial)
// =====================================================================

export type Archetype = "vigilante" | "sobrecarga" | "culposa" | "antecipatoria";

export type QuizOption = {
  value: string;
  label: string;
  scores?: Partial<Record<Archetype, number>>;
  risk?: boolean;
  pill?: string;
};

export type QuizQuestion = {
  key: string;
  prompt: string;
  options: QuizOption[];
  meta?: "situation" | "desire";
  /** Texto opcional dito pela guia ANTES da pergunta. */
  transition?: string;
  /** Se presente, sobrescreve a transição com base em uma resposta anterior. */
  transitionFrom?: { questionKey: string; map: Record<string, string> };
};

export const QUESTIONS: QuizQuestion[] = [
  {
    key: "situacao",
    meta: "situation",
    transition:
      "Para que o diagnóstico seja preciso para a sua vida, preciso entender o seu contexto primeiro.",
    prompt: "Qual situação descreve melhor a sua vida hoje?",
    options: [
      { value: "casada-filhos-pequenos", label: "Sou casada e tenho filhos pequenos (0-12 anos)", pill: "Filhos pequenos" },
      { value: "casada-filhos-grandes", label: "Sou casada e tenho filhos grandes (adolescentes/adultos)", pill: "Filhos grandes" },
      { value: "casada-sem-filhos", label: "Sou casada, sem filhos (ou tentando)", pill: "Casada" },
      { value: "mae-solo", label: "Sou mãe solo — sustento minha casa sozinha", pill: "Mãe solo" },
      { value: "solteira", label: "Sou solteira, sem filhos", pill: "Solteira" },
    ],
  },
  {
    key: "risco",
    prompt: "Nas últimas 2 semanas, o que melhor descreve como você tem se sentido?",
    transitionFrom: {
      questionKey: "situacao",
      map: {
        "casada-filhos-pequenos":
          "Quem cuida de filho pequeno raramente tem tempo pra escutar a si mesma. Você reservou esses 3 minutos. Use eles com honestidade.",
        "casada-filhos-grandes":
          "Mãe de filho grande raramente reclama. A gente aprende que reclamar é fraqueza. Aqui não tem ninguém pra te julgar.",
        "casada-sem-filhos":
          "Existe um tipo de ansiedade que aparece quando por fora 'está tudo certo'. Justamente por isso, ninguém suspeita.",
        "mae-solo":
          "Sustentar uma casa sozinha já é peso suficiente. Algumas perguntas vão ser difíceis. Mas você é a única que pode responder por você.",
        solteira:
          "Ansiedade não tem cara nem idade. Mulher solteira sofre em silêncio porque ninguém pergunta. Aqui alguém está perguntando.",
      },
    },
    options: [
      { value: "funcionando", label: "Cansada, ansiosa, mas funcionando" },
      { value: "dificil", label: "Tenho tido dias muito difíceis, mas consigo continuar" },
      { value: "sombrios", label: "Pensamentos sombrios têm aparecido com frequência", risk: true },
      { value: "crise", label: "Estou em crise. Não estou bem.", risk: true },
    ],
  },
  {
    key: "sintoma",
    transition:
      "Obrigada por ser honesta. Vou seguir. Agora vamos olhar para o corpo — porque ansiedade não mora só na cabeça.",
    prompt: "Qual desses sintomas físicos você mais reconhece em você?",
    options: [
      { value: "madrugada", label: "Acordo entre 3h e 5h da manhã e não consigo voltar a dormir", scores: { vigilante: 3 }, pill: "Acorda 3h–5h" },
      { value: "tensao", label: "Sinto cansaço crônico, tensão em ombros/pescoço/mandíbula", scores: { sobrecarga: 3 }, pill: "Tensão no corpo" },
      { value: "estomago", label: "Estômago travado, intestino reagindo, sintomas físicos que ninguém entende", scores: { culposa: 3, vigilante: 1 }, pill: "Estômago travado" },
      { value: "peito", label: "Peito apertado, respiração curta, sensação de que algo ruim vai acontecer", scores: { antecipatoria: 3 }, pill: "Peito apertado" },
      { value: "todos", label: "Tudo isso, em momentos diferentes", scores: { vigilante: 1, sobrecarga: 1, culposa: 1, antecipatoria: 1 }, pill: "Vários sinais" },
    ],
  },
  {
    key: "comportamento",
    transitionFrom: {
      questionKey: "sintoma",
      map: {
        madrugada:
          "Acordar de madrugada não é insônia comum. É um sinal específico que vou te explicar daqui a pouco.",
        tensao: "Tensão crônica é o corpo gritando o que a boca não diz. Vamos chegar lá.",
        estomago:
          "Quando o estômago reage, é o sistema nervoso falando uma língua que poucos médicos sabem traduzir.",
        peito: "Peito apertado tem nome técnico — e tem caminho de saída.",
        todos:
          "Quando o corpo manifesta tudo, geralmente é porque um padrão dominante está disparando os outros.",
      },
    },
    prompt: "Quando a ansiedade aparece, qual desses comportamentos é mais seu?",
    options: [
      { value: "checagem", label: "Fico checando: trava da porta, gás, e-mail, mensagem do filho. Não consigo desligar.", scores: { vigilante: 3 }, pill: "Checagem constante" },
      { value: "aceitar-mais", label: "Aceito mais uma tarefa. Mais um cuidado. Não consigo dizer não.", scores: { sobrecarga: 3 }, pill: "Não diz não" },
      { value: "oracao", label: "Oro pedindo perdão. Releio versículos. Tento confiar mais. E não passa.", scores: { culposa: 3 }, pill: "Ora e não passa" },
      { value: "cenarios", label: "Imagino cenários ruins. Crio diálogos difíceis na cabeça antes de acontecer.", scores: { antecipatoria: 3 }, pill: "Antecipação" },
    ],
  },
  {
    key: "frase",
    transition:
      "Agora a pergunta mais difícil. Leia cada frase devagar e marque a que mais aperta por dentro.",
    prompt: "Qual dessas frases mais aperta você por dentro?",
    options: [
      { value: "soltar", label: "“Se eu soltar isso, algo ruim vai acontecer.”", scores: { vigilante: 4 } },
      { value: "nao-parar", label: "“Eu não posso parar. Tem gente dependendo de mim.”", scores: { sobrecarga: 4 } },
      { value: "insuficiente", label: "“Eu nunca sou suficiente — pra ninguém. Nem pra Deus.”", scores: { culposa: 4 } },
      { value: "pior", label: "“E se acontecer o pior?”", scores: { antecipatoria: 4 } },
    ],
  },
  {
    key: "espiritual",
    transition:
      "Você está sendo corajosa. Falta pouco. Agora a parte que ninguém pergunta numa consulta médica.",
    prompt: "Como está sua vida com Deus hoje?",
    options: [
      { value: "mente-nao-desliga", label: "Tento orar mas minha mente não desliga. Não consigo focar.", scores: { vigilante: 2 } },
      { value: "sirvo-muito", label: "Sirvo bastante. Mas não sinto Deus como antes.", scores: { sobrecarga: 2 } },
      { value: "perdao-constante", label: "Oro pedindo perdão o tempo todo. Sinto que não sou digna.", scores: { culposa: 3 } },
      { value: "medo-abandono", label: "Tenho medo de que Deus me abandone ou algo grave aconteça.", scores: { antecipatoria: 2, culposa: 1 } },
    ],
  },
  {
    key: "desejo",
    meta: "desire",
    transition: "Última pergunta. Essa eu preciso que você responda com o coração.",
    prompt: "Se você pudesse mudar UMA coisa hoje, qual seria?",
    options: [
      { value: "dormir", label: "Dormir uma noite inteira sem acordar de madrugada." },
      { value: "descansar", label: "Conseguir parar e descansar sem sentir culpa." },
      { value: "orar", label: "Conseguir orar e sentir Deus de novo." },
      { value: "parar-pior", label: "Parar de imaginar o pior o tempo todo." },
    ],
  },
];

export const ENCOURAGEMENTS = [
  "Você está sendo corajosa. Continua.",
  "Falta pouco — você está perto.",
  "Estou com você. Respira fundo.",
];

export const CONFIRMATIONS = ["Compreendi 🤍", "Anotado 🤍", "Entendi 🤍", "Recebi 🤍"];

export type ArchetypeChapter = {
  num: string;
  title: string;
  period: string;
  description: string;
};

/** Conteúdo estruturado da tela de resultado (versão resumida, micro-CTAs). */
export type ArchetypeResult = {
  /** Tagline curta sob o nome no header. */
  tagline: string;
  /** Parágrafo "O que está acontecendo" (pode conter <strong>). */
  happening: string;
  /** Frase-espelho (citação) destacada. */
  mirror: string;
  /** Card escuro "verdade": título normal + parte em itálico dourado. */
  truthTitle: string;
  truthTitleEm: string;
  /** Corpo do card escuro (pode conter <strong>). */
  truthBody: string;
  verseRef: string;
  verseText: string;
  /** Selo final do card escuro (use \n para quebra de linha). */
  seal: string;
};

export type MechanismData = {
  hook: string;
  alarmOn: [string, string, string];
  alarmOff: [string, string, string];
};

export type MirrorChecks = {
  symptom: string;
  behavior: string;
};

export type NeurofeBox = {
  icone: string;
  titulo: string;
  texto: string;
};

export type NeurofeData = {
  dores: [string, string];
  espelho: string;
  verdadeTitulo1: string;
  verdadeTitulo2: string;
  verdadeCorpo: string;
  versiculoRef: string;
  versiculo: string;
  versiculoNota1: string;
  versiculoNota2: string;
  tentouCorpo: string;
  boxes: NeurofeBox[];
  mudaTitulo: string;
  mudaCorpo: string;
  proximoPasso: string;
};

export type ArchetypeData = {
  id: Archetype;
  name: string;
  subtitle: string;
  tagline: string;
  result: ArchetypeResult;
  mechanism: MechanismData;
  mirrorChecks: MirrorChecks;
  neurofe: NeurofeData;
  /** HTML rico — renderizado via dangerouslySetInnerHTML. */
  mechanismHtml: string;
  /** HTML rico do bloco "desarme" (verdade + versículo). */
  desarmeHtml: string;
  /** HTML rico explicando o método. */
  metodoHtml: string;
  esperar: string;
  naoEsperar: string;
  bridges: Record<string, string>;
  chapters: ArchetypeChapter[];
};

export const ARCHETYPES: Record<Archetype, ArchetypeData> = {
  vigilante: {
    id: "vigilante",
    name: "VIGILANTE",
    subtitle: "O padrão da Mente Que Não Desliga.",
    tagline: "O método guiado para a Mente Que Não Desliga.",
    result: {
      tagline: "O padrão de quem não consegue desligar.",
      happening:
        "Você acorda às 3h porque, por anos, seu corpo aprendeu que <strong>se desligar, algo escapa</strong>. É cortisol transbordando uma xícara já cheia.",
      mirror:
        "Você não dorme mal porque o barulho te acorda. Não dorme porque seu corpo aprendeu que, se desligar, algo escapa.",
      truthTitle: "Isso não é falta de fé.",
      truthTitleEm: "É um corpo em alerta.",
      truthBody:
        "Um padrão fisiológico instalado por anos de vigilância. E que pode ser <strong>desinstalado também</strong> — com o método certo, na ordem certa.",
      verseRef: "Salmos 121",
      verseText: "Aquele que te guarda não dormirá nem cochilará.",
      seal: "O Guarda já está acordado.\nVocê está acordada de graça.",
    },
    mechanism: {
      hook: "Você tentou orar mais, cansar mais, suplemento, chá. Mas ninguém te mostrou o interruptor: o seu corpo está com o alarme ligado — e alarme não se desliga com esforço. Se desliga com sinal.",
      alarmOn: [
        "mente ligada às 3h da manhã",
        "sono leve — qualquer barulho acorda",
        "corpo em plantão mesmo sem perigo",
      ],
      alarmOff: [
        "mente quieta ao deitar",
        "sono contínuo — a noite inteira",
        "corpo solto, em repouso real",
      ],
    },
    mirrorChecks: {
      symptom: "Você acorda às 3h porque seu corpo aprendeu que se desligar, algo escapa",
      behavior: "Você diz “tudo bem” — e volta a vigiar",
    },
    neurofe: {
      dores: [
        "Você deita exausta — e a mente liga. Revisa o dia, os filhos, as contas. O corpo na cama, o radar ligado.",
        "Qualquer barulho, qualquer silêncio estranho, e você já levantou. Descansar parece perigoso.",
      ],
      espelho:
        "Você virou a sentinela da casa. Mas sentinela nenhuma aguenta ficar de guarda a vida inteira — sem nunca ser rendida.",
      verdadeTitulo1: "Isso não é só uma noite mal dormida.",
      verdadeTitulo2: "É um corpo que esqueceu como baixar a guarda.",
      verdadeCorpo:
        "Anos vigiando todo mundo. Ninguém te avisou que <b>o turno da noite não é seu</b> — existe Alguém que não dorme para que você possa dormir.",
      versiculoRef: "Salmo 121",
      versiculo:
        "\"Eis que não dormita, nem dorme, o guarda de Israel.\"",
      versiculoNota1: "Ele fica de vigia a noite inteira.",
      versiculoNota2: "Pra você poder, finalmente, fechar os olhos.",
      tentouCorpo:
        "Você tentou de tudo. Chá, técnica atrás de técnica, orar até tarde, cansar o corpo. E a mente continuava de plantão. Alguém disse que era falta de fé. <b>Isso é mentira.</b>",
      boxes: [
        {
          icone: "🫁",
          titulo: "Corpo",
          texto:
            "A respiração guiada dá ao seu corpo o sinal de 'rendição de turno': por agora, não há nada para vigiar. A mandíbula solta, o coração desacelera e o corpo entende que pode, enfim, sair do posto.",
        },
        {
          icone: "🧠",
          titulo: "Mente",
          texto:
            "Nós interrompemos a ronda mental — aquela revisão infinita de tudo o que pode dar errado. Com constância, treinamos sua mente a aprender um novo caminho: sair do modo sentinela e entregar o plantão. É a renovação prática de Romanos 12:2.",
        },
        {
          icone: "🕊️",
          titulo: "Espírito",
          texto:
            "Com o radar desligado, a Palavra encontra espaço. Você deixa de ser a guarda solitária da casa e volta a ser a Filha guardada. Não é você que sustenta a noite — é Ele. E Ele não dormita.",
        },
      ],
      mudaTitulo: "Imagine dormir a noite inteira.",
      mudaCorpo:
        "Você deita. A mente não liga o radar. Pela primeira vez em anos, <b>o sono vem sem luta</b> — e você acorda com a sensação esquecida de ter descansado de verdade. A noite deixou de ser turno e voltou a ser abrigo.",
      proximoPasso:
        "No próximo passo, eu te mostro <b>como a Neurofé desliga esse radar no seu padrão Vigilante</b> — em poucos minutos.",
    },
    chapters: [
      {
        num: "06",
        title: "Descanso na Soberania",
        period: "Capítulo da manhã",
        description:
          "Trabalha o “soltar” antes do dia começar. Ensina seu corpo, pela respiração e pela Palavra, que o mundo está sustentado mesmo quando você não está segurando.",
      },
      {
        num: "06",
        title: "Poder da Entrega Total",
        period: "Capítulo da noite",
        description:
          "Trabalha o desligamento do guarda interno antes do sono. Ensina o sistema nervoso a aceitar repouso como obediência, não como abandono.",
      },
    ],
    mechanismHtml:
      "<p>Você acorda às 3h porque, por anos, seu corpo aprendeu que <strong>se desligar, algo escapa</strong>. É cortisol transbordando uma xícara já cheia.</p><blockquote>“Você não dorme mal porque o barulho te acorda. Não dorme porque, por anos, seu corpo aprendeu que se você desligar — algo escapa.”</blockquote>",
    desarmeHtml:
      "<div class=\"verdade-card\"><p class=\"eyebrow\">A verdade que você precisa ouvir</p><h3>Isso não é falta de fé. <em>É um corpo em alerta.</em></h3><p>É um padrão fisiológico que pode ser instalado em qualquer pessoa, depois de anos vivendo em vigilância. E pode ser desinstalado também — com o método certo, na ordem certa.</p><div class=\"versiculo\"><span>SALMOS 121</span><em>“Aquele que te guarda não dormirá nem cochilará.”</em></div><p class=\"closing\"><em>O Guarda já está acordado.<br>Você está acordada de graça.</em></p></div>",
    metodoHtml:
      "Dois capítulos do método foram feitos especificamente para a Ansiedade Vigilante: <strong>Capítulo 6 da manhã — Descanso na Soberania</strong> e <strong>Capítulo 6 da noite — Poder da Entrega Total</strong>. Em 7 dias, com 14 sessões (manhã e noite), seu corpo recebe 14 sinais consecutivos de que pode soltar.",
    esperar:
      "Começar a dormir mais profundo, acordar menos vezes de madrugada, sentir o corpo mais leve.",
    naoEsperar:
      "Cura imediata se a hipervigilância vem de trauma profundo. Trauma demanda terapia direcionada. Esse método é o começo do caminho, não o fim.",
    bridges: {
      "casada-filhos-pequenos":
        "Mãe de filho pequeno acordando às 3h não é insônia. É um corpo que aprendeu: se eu dormir, alguém chora e eu não ouço.",
      "casada-filhos-grandes":
        "Filho já cresceu — e o corpo continua vigiando. Um padrão antigo que ninguém te avisou que ficaria.",
      "casada-sem-filhos":
        "Você não dorme mal porque sua vida está mal. Dorme mal porque seu corpo aprendeu a vigiar.",
      "mae-solo":
        "Sustentar a casa sozinha ensina o corpo a nunca desligar. Se você soltar, o que segura tudo?",
      solteira:
        "Você dorme mal mesmo sem filhos em casa. O corpo aprendeu a vigiar — e continua de plantão, mesmo quando o perigo já passou.",
    },
  },
  sobrecarga: {
    id: "sobrecarga",
    name: "SOBRECARGA",
    subtitle: "O padrão da Que Carrega Todos.",
    tagline: "O método guiado para a Que Carrega Todos.",
    result: {
      tagline: "O padrão de quem carrega todos.",
      happening:
        "Você segura tudo — e quando perguntam, sorri e diz “tudo bem”. Mas o cansaço está num lugar que dormir não alcança: <strong>ombro, pescoço, mandíbula</strong>. E parar te dá uma culpa estranha.",
      mirror:
        "Você se perdeu sendo a pessoa que segura todo mundo. E agora, ninguém segura você — nem você mesma.",
      truthTitle: "Isso não é fraqueza.",
      truthTitleEm: "É exaustão acumulada.",
      truthBody:
        "Anos sendo “a forte”, “a prestativa”. Ninguém te avisou que <strong>descansar também é fé</strong> — confiar que Deus continua agindo enquanto você dorme.",
      verseRef: "Mateus 11",
      verseText:
        "Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.",
      seal: "O convite é específico pra você.\nNão é pra se esforçar mais — é pra parar.",
    },
    mechanism: {
      hook: "Você tentou ter mais força, mais disciplina, mais disposição. Mas ninguém te mostrou o interruptor: o seu corpo está com o alarme ligado — e alarme não se desliga com esforço. Se desliga com sinal.",
      alarmOn: [
        "ombro, pescoço e mandíbula travados",
        "culpa ao parar — como se descansar fosse errado",
        "cansaço que dormir não alcança",
      ],
      alarmOff: [
        "ombro solto, mandíbula relaxada",
        "parar sem culpa — descanso como direito",
        "acordar leve, corpo inteiro descansado",
      ],
    },
    mirrorChecks: {
      symptom: "O cansaço mora onde dormir não alcança: ombro, pescoço, mandíbula",
      behavior: "Você sorri, diz “tudo bem” — e segura tudo por dentro",
    },
    neurofe: {
      dores: [
        "Você não consegue parar — \"tem gente dependendo de mim\". Então se deixa por último, todo dia.",
        "Você grita com quem ama sem querer. E a culpa depois dói mais que o cansaço.",
      ],
      espelho:
        "Você se perdeu sendo a pessoa que segura todo mundo. E agora, ninguém segura você — nem você mesma.",
      verdadeTitulo1: "Isso não é fraqueza.",
      verdadeTitulo2: "É exaustão acumulada.",
      verdadeCorpo:
        "Anos sendo \"a forte\", \"a prestativa\". Ninguém te avisou que <b>descansar também é fé</b> — confiar que Deus continua agindo enquanto você dorme.",
      versiculoRef: "Mateus 11",
      versiculo:
        "\"Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.\"",
      versiculoNota1: "O convite é específico pra você.",
      versiculoNota2: "Não é pra se esforçar mais — é pra parar.",
      tentouCorpo:
        "Você tentou de tudo. Orar mais, confiar mais, ser forte, aguentar. E toda vez que não passava, alguém sussurrava que a culpa era sua — que faltava fé. <b>Isso é mentira.</b>",
      boxes: [
        {
          icone: "🫁",
          titulo: "Corpo",
          texto:
            "A respiração guiada desativa o seu 'modo de plantão'. É o sinal que o seu corpo cansado precisa para entender que, por agora, você não precisa vigiar nada. O ombro desce, o peito abre e o grito de alerta silenciosamente dá lugar ao repouso.",
        },
        {
          icone: "🧠",
          titulo: "Mente",
          texto:
            "Nós interrompemos o fluxo de preocupações automáticas. Com constância, treinamos sua mente a aprender um novo caminho — a sair do 'Modo Operacional', aquele que só enxerga tarefas, e retomar o controle sobre o que você pensa. É a renovação prática de Romanos 12:2.",
        },
        {
          icone: "🕊️",
          titulo: "Espírito",
          texto:
            "Com o ruído do cansaço silenciado, a Palavra de Deus finalmente encontra solo fértil. A barreira da culpa cai e você deixa de ser a 'mula de carga' para voltar a ser a Filha cuidada. Deus não está distante; era o seu cansaço que estava gritando alto demais.",
        },
      ],
      mudaTitulo: "Imagine descansar sem culpa.",
      mudaCorpo:
        "Você senta. Não faz nada por 15 minutos. E pela primeira vez, <b>a culpa não dispara junto</b>. O ombro desce. A pressa solta. Descansar deixa de ser pecado e volta a ser o que sempre foi: confiar que Deus continua agindo enquanto você para.",
      proximoPasso:
        "No próximo passo, eu te mostro <b>como a Neurofé desliga esse alarme no seu padrão Sobrecarga</b> — em poucos minutos.",
    },
    chapters: [
      {
        num: "05",
        title: "Saúde Emocional e Poda dos Pensamentos",
        period: "Capítulo da manhã",
        description:
          "Trabalha o “permitir parar” antes do dia inteiro pesar nas suas costas. Ensina seu corpo a entender que descanso não é abandono.",
      },
      {
        num: "05",
        title: "Ritmo do Descanso Confiante",
        period: "Capítulo da noite",
        description:
          "Trabalha o encerramento do dia sem culpa. Ensina o sistema nervoso a aceitar pausa como direito, não como pecado.",
      },
    ],
    mechanismHtml:
      "<p>Você é a que segura tudo — e quando alguém pergunta, sorri e diz “tudo bem”. Mas o cansaço está num lugar que dormir não alcança: ombro, pescoço, mandíbula. E parar te dá uma culpa estranha.</p><blockquote>“Você se perdeu sendo a pessoa que segura todo mundo. E agora, ninguém segura você — nem você mesma.”</blockquote>",
    desarmeHtml:
      "<div class=\"verdade-card\"><p class=\"eyebrow\">A verdade que você precisa ouvir</p><h3>Isso não é fraqueza. <em>É exaustão acumulada.</em></h3><p>Anos de você sendo “a forte”, “a prestativa”. Ninguém te avisou que <strong>descansar também é fé</strong>. Tentar dar conta sozinha é uma forma silenciosa de não confiar que Deus continua agindo enquanto você dorme.</p><div class=\"versiculo\"><span>MATEUS 11</span><em>“Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.”</em></div><p class=\"closing\"><em>O convite é específico pra você.<br>Não é pra se esforçar mais — é pra parar.</em></p></div>",
    metodoHtml:
      "Dois capítulos do método foram feitos especificamente para a Ansiedade da Sobrecarga: <strong>Capítulo 5 da manhã — Saúde Emocional e Poda dos Pensamentos</strong> e <strong>Capítulo 5 da noite — Ritmo do Descanso Confiante</strong>. Sessões curtas que ensinam seu corpo a entender que descanso não é abandono.",
    esperar:
      "Conseguir sentar sem fazer nada por 15 minutos sem disparar culpa. Sentir o ombro descer pela primeira vez em anos.",
    naoEsperar:
      "Que o método resolva a sobrecarga externa real. Se você cuida de pais idosos sozinha, se o marido não divide, se o trabalho é abusivo — essas conversas precisam acontecer fora daqui.",
    bridges: {
      "casada-filhos-pequenos":
        "Com filho pequeno em casa, você é o chão de todo mundo: do filho, do marido, da rotina. Segura tudo — e ninguém pergunta quem segura você.",
      "casada-filhos-grandes":
        "Filho cresceu — só mudou o tipo de cuidado. O corpo segue respondendo como se ainda houvesse criança chorando.",
      "casada-sem-filhos":
        "Você cuida do marido, da casa, dos pais, da família toda. Não tem filho — tem todo mundo.",
      "mae-solo":
        "Mãe solo é a definição de Sobrecarga: a primeira que acorda, a última que dorme. Não existe almoço sem você.",
      solteira:
        "Solteira da família vira a 'que está disponível porque não tem filhos'. E ninguém vê quanto isso custa.",
    },
  },
  culposa: {
    id: "culposa",
    name: "CULPOSA",
    subtitle: "O padrão da Que Não Se Perdoa.",
    tagline: "O método guiado para a Que Não Se Perdoa.",
    result: {
      tagline: "O padrão de quem não se perdoa.",
      happening:
        "Você ora, lê, tenta confiar — e acorda com o peito apertado. E aí vem a parte mais cruel: <strong>você se culpa por estar sentindo</strong>, como se cristã de verdade não tremesse.",
      mirror:
        "Essa voz que te diz “cristã de verdade não sente isso” não é a voz do Espírito Santo. É a voz da insuficiência.",
      truthTitle: "A condenação que você sente",
      truthTitleEm: "não vem do Pai.",
      truthBody:
        "Ansiedade não é fé fraca — é um corpo em alerta crônico. Você teria a fé de Abraão e seu cortisol ainda subiria às 3h. <strong>Cortisol responde a treino corporal, não a fé consciente.</strong>",
      verseRef: "Romanos 8",
      verseText: "Já não há condenação para os que estão em Cristo Jesus.",
      seal: "Já não há.\nA condenação que você sente vem de uma régua que confundiu sofrimento com santidade.",
    },
    mechanism: {
      hook: "Você tentou orar mais, servir mais, se cobrar mais. Mas ninguém te mostrou o interruptor: o seu corpo está com o alarme ligado — e alarme não se desliga com esforço. Se desliga com sinal.",
      alarmOn: [
        "peito apertado ao acordar",
        "voz interna que diz “cristã de verdade não sente isso”",
        "culpa por sentir — culpa da culpa",
      ],
      alarmOff: [
        "peito leve ao abrir os olhos",
        "orar sem revisar se “orou direito”",
        "sentir paz sem se culpar por sentir paz",
      ],
    },
    mirrorChecks: {
      symptom: "Você ora, lê, tenta confiar — e acorda com o peito apertado",
      behavior: "Você se culpa por estar sentindo, como se cristã de verdade não tremesse",
    },
    neurofe: {
      dores: [
        "Você faz tudo — e ainda deita com a sensação de que falhou. Como mãe, como esposa, como cristã.",
        "Você ora, mas parece que a oração bate no teto. Como se Deus estivesse cansado de você.",
      ],
      espelho:
        "Você virou juíza de si mesma. E é a juíza mais dura que existe — nunca te absolve, nem quando Deus já absolveu.",
      verdadeTitulo1: "Isso não é convicção do Espírito.",
      verdadeTitulo2: "É acusação em loop.",
      verdadeCorpo:
        "Anos ouvindo uma voz interna que só aponta falta. Ninguém te avisou que <b>essa voz não é a de Deus</b> — a voz d'Ele restaura; a que te esmaga, condena.",
      versiculoRef: "Romanos 8",
      versiculo:
        "\"Portanto, agora, nenhuma condenação há para os que estão em Cristo Jesus.\"",
      versiculoNota1: "Nenhuma. Nem a sua própria.",
      versiculoNota2: "A sentença já foi dada — e é absolvição.",
      tentouCorpo:
        "Você tentou de tudo. Se dedicar mais, servir mais, pedir perdão de novo pelo mesmo erro. E a culpa voltava sempre. Alguém sugeriu que era falta de arrependimento. <b>Isso é mentira.</b>",
      boxes: [
        {
          icone: "🫁",
          titulo: "Corpo",
          texto:
            "A culpa mora no corpo: peito apertado, garganta fechada. A respiração guiada afrouxa esse nó físico e dá ao seu corpo o sinal de que você não está sendo julgada agora. O peito abre. O ar volta.",
        },
        {
          icone: "🧠",
          titulo: "Mente",
          texto:
            "Nós interrompemos o tribunal interno — o replay automático de cada falha. Com constância, treinamos sua mente a aprender um novo caminho: soltar a acusação e reter a graça. É a renovação prática de Romanos 12:2.",
        },
        {
          icone: "🕊️",
          titulo: "Espírito",
          texto:
            "Com a voz da acusação silenciada, você volta a ouvir a voz certa. Deixa de ser a ré em julgamento permanente e volta a ser a Filha amada. Deus não estava distante — a culpa é que gritava mais alto que a graça.",
        },
      ],
      mudaTitulo: "Imagine sentir Deus de novo.",
      mudaCorpo:
        "Você ora — e não bate no teto. Pela primeira vez em muito tempo, <b>você se sente ouvida, não julgada</b>. O peso sai do peito. E a fé volta a ser abraço, não prova que você vive reprovando.",
      proximoPasso:
        "No próximo passo, eu te mostro <b>como a Neurofé silencia essa acusação no seu padrão Culposa</b> — em poucos minutos.",
    },
    chapters: [
      {
        num: "02",
        title: "Perdão e Reconciliação",
        period: "Capítulo da manhã",
        description:
          "Trabalha o perdão de si antes do dia começar a te julgar. Ensina seu corpo que graça é instalação, não recompensa.",
      },
      {
        num: "02",
        title: "Perdão e Purificação Neural",
        period: "Capítulo da noite",
        description:
          "Trabalha a liberação da autocondenação antes do sono. Ensina o sistema límbico a parar de te punir o tempo todo.",
      },
    ],
    mechanismHtml:
      "<p>Você ora, lê, tenta confiar — e acorda com o peito apertado. E aí vem a parte mais cruel: <strong>você se culpa por estar sentindo</strong>, como se cristã de verdade não tremesse.</p><blockquote>“Essa voz que te diz 'cristã de verdade não sente isso' não é a voz do Espírito Santo. É a voz da insuficiência.”</blockquote>",
    desarmeHtml:
      "<div class=\"verdade-card\"><p class=\"eyebrow\">A verdade que você precisa ouvir</p><h3>A condenação que você sente <em>não vem do Pai.</em></h3><p>A ansiedade não é fé fraca — é um corpo em alerta crônico. Você poderia ter a fé de Abraão e seu cortisol ainda subiria às 3h da manhã. Cortisol não responde a fé consciente. Responde a treino corporal.</p><div class=\"versiculo\"><span>ROMANOS 8</span><em>“Já não há condenação para os que estão em Cristo Jesus.”</em></div><p class=\"closing\"><em>Já não há.<br>A condenação que você sente vem de uma régua que confundiu sofrimento com santidade.</em></p></div>",
    metodoHtml:
      "Dois capítulos do método foram feitos especificamente para a Ansiedade Culposa: <strong>Capítulo 2 da manhã — Perdão e Reconciliação</strong> e <strong>Capítulo 2 da noite — Perdão e Purificação Neural</strong>. Em 7 dias, com 14 sessões, você vai começar a sentir no corpo o que a Palavra já te garantiu há 2000 anos.",
    esperar:
      "Começar a orar sem ficar revisando se “orou direito”. Sentir paz sem se culpar por estar sentindo paz.",
    naoEsperar:
      "Apagar de uma vez anos de cobrança religiosa internalizada. Esse trabalho continua — em terapia, em direção espiritual saudável. O método é o primeiro empurrão.",
    bridges: {
      "casada-filhos-pequenos":
        "Mãe cristã de filho pequeno carrega culpa dobrada: por cansar, por gritar, por querer 5 minutos sozinha — e culpa por ter culpa.",
      "casada-filhos-grandes":
        "Você revisa cada decisão antiga: 'e se tivesse feito diferente?' 'e se tivesse orado mais?' Culpa por escolhas que já não dá pra mudar.",
      "casada-sem-filhos":
        "Cristã casada sem filhos carrega uma culpa que ninguém nomeia: a da ausência. Por não ter, por ter desejado, por não ter desejado.",
      "mae-solo":
        "Mãe solo cristã carrega culpa em camadas: a de não dar conta de tudo, a de não ser a 'família completa' que ensinaram, e a de ser forte demais pra pedir ajuda.",
      solteira:
        "Cristã solteira na igreja carrega a culpa silenciosa de não ter cumprido o 'destino esperado' — e de se perguntar, sozinha, se Deus se esqueceu.",
    },
  },
  antecipatoria: {
    id: "antecipatoria",
    name: "ANTECIPATÓRIA",
    subtitle: "O padrão da Que Antecipa o Pior.",
    tagline: "O método guiado para a Que Antecipa o Pior.",
    result: {
      tagline: "O padrão de quem antecipa o pior.",
      happening:
        "Antes de levantar, sua mente já correu o dia inteiro. Cada dor vira doença, cada atraso vira tragédia. E <strong>nada disso acontece</strong> — mas seu corpo já gastou toda a energia.",
      mirror:
        "O futuro te preocupa antes mesmo de chegar. E quando chega — raramente é o que você temia.",
      truthTitle: "Isso não é frescura.",
      truthTitleEm: "É um padrão neural.",
      truthBody:
        "Seu cérebro aprendeu: <strong>“se eu não antecipar o pior, ele me pega de surpresa”</strong>. E continua prevendo, mesmo sem perigo. Cerca de 85% do que ansiosos preveem nunca acontece.",
      verseRef: "Jeremias 29",
      verseText: "Eu sei os planos que tenho para vocês — planos de paz, e não de mal.",
      seal: "O plano já existe.\nVocê está vivendo num futuro que ainda não foi escrito por Deus.",
    },
    mechanism: {
      hook: "Você tentou pensar positivo, confiar mais, parar de imaginar. Mas ninguém te mostrou o interruptor: o seu corpo está com o alarme ligado — e alarme não se desliga com esforço. Se desliga com sinal.",
      alarmOn: [
        "mente rodando 5 cenários antes de levantar",
        "cada dor vira doença, cada atraso vira tragédia",
        "corpo exausto de viver o que ainda não aconteceu",
      ],
      alarmOff: [
        "acordar no presente — sem rodar o futuro",
        "dor é só dor, atraso é só atraso",
        "energia pra viver o dia que chegou",
      ],
    },
    mirrorChecks: {
      symptom: "Antes de levantar, sua mente já correu o dia inteiro",
      behavior: "Você imagina o pior — e gasta toda a energia antes de sair da cama",
    },
    neurofe: {
      dores: [
        "Sua mente vive no futuro — ensaiando tragédias que nunca chegam. Doença, acidente, falta de dinheiro.",
        "Você não aproveita o presente: está sempre 'e se...'. O medo rouba até os momentos bons.",
      ],
      espelho:
        "Você vive pagando juros de dores que talvez nunca venham. E a vida real — a de hoje — passa sem você estar nela.",
      verdadeTitulo1: "Isso não é falta de fé.",
      verdadeTitulo2: "É uma mente treinada pra prever perigo.",
      verdadeCorpo:
        "Anos se preparando pro pior pra não ser pega de surpresa. Ninguém te avisou que <b>o futuro já tem dono</b> — e os planos d'Ele pra você não são de mal.",
      versiculoRef: "Jeremias 29",
      versiculo:
        "\"Porque eu bem sei os pensamentos que tenho a vosso respeito: pensamentos de paz e não de mal.\"",
      versiculoNota1: "O futuro que te assombra já foi pensado por Ele.",
      versiculoNota2: "E os pensamentos d'Ele são de paz.",
      tentouCorpo:
        "Você tentou de tudo. Controlar, planejar, declarar versículos contra o medo. E o 'e se...' sempre voltava. Alguém disse que era falta de fé, que bastava confiar. <b>Isso é mentira.</b>",
      boxes: [
        {
          icone: "🫁",
          titulo: "Corpo",
          texto:
            "O medo do futuro dispara o corpo no presente: coração acelerado, estômago em nó. A respiração guiada traz o seu corpo de volta pro agora — o único lugar onde você está segura de verdade.",
        },
        {
          icone: "🧠",
          titulo: "Mente",
          texto:
            "Nós interrompemos o cinema de tragédias — os ensaios automáticos do pior. Com constância, treinamos sua mente a aprender um novo caminho: sair do futuro imaginado e habitar o dia de hoje. É a renovação prática de Romanos 12:2.",
        },
        {
          icone: "🕊️",
          titulo: "Espírito",
          texto:
            "Com a mente de volta ao presente, a Palavra encontra você aqui. Você deixa de ser a profetisa do pior e volta a ser a Filha que confia. O amanhã pertence a Deus — e Ele já disse o que pensa sobre o seu.",
        },
      ],
      mudaTitulo: "Imagine a mente quieta.",
      mudaCorpo:
        "Você toma café e está ali — só ali. Pela primeira vez, <b>o 'e se...' não senta à mesa com você</b>. O peito solto, o dia inteiro pela frente, e uma paz estranha e boa: a de quem entregou o amanhã pra quem já cuida dele.",
      proximoPasso:
        "No próximo passo, eu te mostro <b>como a Neurofé aquieta esse alarme no seu padrão Antecipatória</b> — em poucos minutos.",
    },
    chapters: [
      {
        num: "01",
        title: "Despertar da Coragem",
        period: "Capítulo da manhã",
        description:
          "Trabalha o desligamento do “e se” antes do dia começar. Ensina seu corpo, pela respiração e ancoragem na Palavra, que o amanhã é território de Deus.",
      },
      {
        num: "01",
        title: "Fim do Alarme de Medo",
        period: "Capítulo da noite",
        description:
          "Trabalha o silenciamento da projeção catastrófica antes do sono. Ensina o sistema nervoso a aceitar que o futuro pode chegar sem ser vigiado por você.",
      },
    ],
    mechanismHtml:
      "<p>Antes de levantar, sua mente já correu o dia inteiro. Cada dor vira doença, cada atraso vira tragédia, cada silêncio vira separação. E <strong>nada disso acontece</strong> — mas seu corpo já gastou toda a energia.</p><blockquote>“O futuro te preocupa antes mesmo de chegar. E quando chega — raramente é o que você temia.”</blockquote>",
    desarmeHtml:
      "<div class=\"verdade-card\"><p class=\"eyebrow\">A verdade que você precisa ouvir</p><h3>Isso não é frescura. <em>É um padrão neural.</em></h3><p>Em algum momento, seu cérebro aprendeu: <em>“se eu não antecipar o pior, ele me pega de surpresa.”</em> E continuou prevendo, mesmo quando o perigo já passou. Cerca de <strong>85% das coisas que ansiosos preveem nunca acontecem</strong>.</p><div class=\"versiculo\"><span>JEREMIAS 29</span><em>“Eu sei os planos que tenho para vocês — planos de paz, e não de mal.”</em></div><p class=\"closing\"><em>O plano já existe.<br>Você está vivendo num futuro que ainda não foi escrito por Deus.</em></p></div>",
    metodoHtml:
      "Dois capítulos do método foram feitos especificamente para a Ansiedade Antecipatória: <strong>Capítulo 1 da manhã — Despertar da Coragem</strong> e <strong>Capítulo 1 da noite — Fim do Alarme de Medo</strong>. Em 7 dias, seu cérebro vai começar a receber sinais novos: “o futuro está nas mãos de quem já esteve nele.”",
    esperar:
      "Começar a perceber que consegue viver o presente sem rodar 5 cenários catastróficos em paralelo. Mente mais quieta, futuro mais leve.",
    naoEsperar:
      "Que substitua psiquiatria em casos de pânico severo. Se você tem várias crises por semana, o caminho saudável é fazer esse método em paralelo a acompanhamento profissional — não em vez de.",
    bridges: {
      "casada-filhos-pequenos":
        "Você vê doença em cada espirro, sequestro em cada atraso, ameaça em cada estranho. E a culpa por imaginar pesa tanto quanto o medo.",
      "casada-filhos-grandes":
        "Agora você antecipa o que já não depende de você — escolhas, casamentos, caminhos. Mas o corpo segue respondendo como se dependesse.",
      "casada-sem-filhos":
        "Sua mente antecipa o abstrato — perda do emprego, doença grave, separação. E ninguém vê o objeto do medo pra te validar.",
      "mae-solo":
        "Mãe solo antecipa o pior porque sabe: se algo der errado, só tem uma pessoa pra resolver — você.",
      solteira:
        "Você antecipa envelhecer sozinha, adoecer sem ninguém. E essa antecipação envenena o presente que ainda poderia viver.",
    },
  },
};

export const DESIRE_CTA: Record<string, string> = {
  dormir: "Quero dormir uma noite inteira",
  descansar: "Quero descansar sem culpa",
  orar: "Quero sentir Deus de novo",
  "parar-pior": "Quero parar de imaginar o pior",
};

/** Frase em primeira pessoa, do jeito que a usuária escreveria — usada na ponte e na oferta. */
export const DESIRE_QUOTE: Record<string, string> = {
  dormir: "dormir uma noite inteira sem acordar de madrugada.",
  descansar: "conseguir parar e descansar sem sentir culpa.",
  orar: "conseguir orar e sentir que Deus me ouve novamente.",
  "parar-pior": "parar de imaginar o pior o tempo todo.",
};

// ── Seção DESEJO no resultado: bloco emocional do "depois", keyado pelo desejo ──

export type DesireBeat = {
  eyebrow: string;
  title: string;
  body: string;
  closing: string;
  cta: string;
};

export const DESIRE_BEAT: Record<string, DesireBeat> = {
  dormir: {
    eyebrow: "O que muda quando o alarme desliga",
    title: "Imagine a primeira noite inteira.",
    body: "Você deita. O corpo entende que pode soltar. E pela primeira vez em anos, você <strong>não acorda às 3h pra checar se está tudo bem</strong>. Acorda quando o sol chega — leve, inteira, descansada.",
    closing: "<strong>Não é fé a mais que falta.</strong> É o seu corpo recebendo o sinal de que pode descansar — <strong>14 sinais em 7 dias</strong>, até o alarme aprender a desligar.",
    cta: "Quero dormir a noite inteira",
  },
  descansar: {
    eyebrow: "O que muda quando você se permite parar",
    title: "Imagine descansar sem culpa.",
    body: "Você senta. Não faz nada por 15 minutos. E pela primeira vez, <strong>a culpa não dispara junto</strong>. O ombro desce. A pressa solta.",
    closing: "Descansar deixa de ser pecado e volta a ser o que sempre foi: <strong>confiar que Deus continua agindo enquanto você para</strong> — um pouco a cada dia, na ordem certa.",
    cta: "Quero descansar sem culpa",
  },
  orar: {
    eyebrow: "O que muda quando o ruído baixa",
    title: "Imagine sentir Deus de novo.",
    body: "Você fecha os olhos pra orar — e a mente <strong>não dispara mil pensamentos</strong>. O ruído baixa. A Palavra alcança o fundo. E aquela presença que parecia distante <strong>volta a ser sentida, não só lembrada</strong>.",
    closing: "Não é falta de fé. É o corpo em alerta abafando o que a sua fé já tem — e dá pra silenciar esse ruído, um pouco a cada dia.",
    cta: "Quero sentir Deus de novo",
  },
  "parar-pior": {
    eyebrow: "O que muda quando o 'e se' perde a força",
    title: "Imagine a mente quieta.",
    body: "Algo acontece — e pela primeira vez você <strong>não roda cinco cenários catastróficos antes de respirar</strong>. O 'e se' perde a força. Você volta pro presente, que estava ali o tempo todo te esperando.",
    closing: "Não é exagero seu. É um cérebro que aprendeu a prever perigo onde não tem — e que <strong>pode reaprender</strong>, na ordem certa.",
    cta: "Quero a mente quieta",
  },
};

export const DESIRE_BEAT_FALLBACK: DesireBeat = {
  eyebrow: "O que muda quando o alarme desliga",
  title: "Imagine a sua primeira noite de paz.",
  body: "O corpo entende que pode soltar. A mente para de rodar. E pela primeira vez em anos, <strong>você descansa de verdade</strong>.",
  closing: "<strong>Não é fé a mais que falta.</strong> É o seu corpo recebendo o sinal certo — <strong>14 sinais em 7 dias</strong>, na ordem certa.",
  cta: "Quero minha paz",
};

export type BridgeCopy = {
  eyebrow: string;
  headline: string;
  bridge: string;
  cta: string;
};

export function getBridgeCopy(archetype: ArchetypeData, desire?: string): BridgeCopy {
  const beat = (desire && DESIRE_BEAT[desire]) || DESIRE_BEAT_FALLBACK;
  const cta = (desire && DESIRE_CTA[desire]) || beat.cta;
  const quote = (desire && DESIRE_QUOTE[desire]) || null;

  return {
    eyebrow: `O caminho do padr\u00e3o ${archetype.name}`,
    headline: beat.title,
    bridge: quote
      ? `Montei o caminho de 7 dias pro padr\u00e3o ${archetype.name}, focado em ${quote}`
      : `Montei o caminho de 7 dias pro padr\u00e3o ${archetype.name}.`,
    cta,
  };
}

export function computeArchetype(
  answers: Record<string, string>,
): { scores: Record<Archetype, number>; archetype: Archetype } {
  const scores: Record<Archetype, number> = {
    vigilante: 0,
    sobrecarga: 0,
    culposa: 0,
    antecipatoria: 0,
  };
  for (const q of QUESTIONS) {
    const val = answers[q.key];
    if (!val) continue;
    const opt = q.options.find((o) => o.value === val);
    if (!opt?.scores) continue;
    for (const [k, v] of Object.entries(opt.scores)) {
      scores[k as Archetype] += v ?? 0;
    }
  }
  // Tie-break determinístico: ordem de prioridade fixa em caso de empate.
  const priority: Archetype[] = ["vigilante", "sobrecarga", "culposa", "antecipatoria"];
  const archetype = priority.reduce((best, k) =>
    scores[k] > scores[best] ? k : best,
  priority[0]);
  return { scores, archetype };
}

// ---- Consistency checks (dev only) ----
if (import.meta.env?.DEV) {
  // 1) Apenas a Q2 ("risco") pode ter opções marcadas como risk
  QUESTIONS.forEach((q, i) => {
    const hasRisk = q.options.some((o) => o.risk);
    if (hasRisk && q.key !== "risco") {
      console.warn(`[quiz] risk flag fora da Q2 (índice ${i}, key=${q.key})`);
    }
  });
  // 2) Q2 deve existir e ser a segunda pergunta
  if (QUESTIONS[1]?.key !== "risco") {
    console.warn("[quiz] esperada Q2 com key='risco'");
  }
  // 3) Todas as opções não-risk devem ter scores definidos (exceto Q1 contexto e Q7 desejo)
  const noScoreKeys = new Set(["situacao", "desejo"]);
  QUESTIONS.forEach((q) => {
    if (noScoreKeys.has(q.key) || q.key === "risco") return;
    q.options.forEach((o) => {
      if (!o.risk && (!o.scores || Object.keys(o.scores).length === 0)) {
        console.warn(`[quiz] opção sem scores: ${q.key}/${o.value}`);
      }
    });
  });
}

// ── G1-v2: Reações da guia por opção (voz feminina, não fórmula) ──

const GUIDE_REACTIONS: Record<string, Record<string, string>> = {
  sintoma: {
    madrugada: "3h da manhã… eu sei exatamente o que é isso. Anotei 🤍",
    tensao: "Esse cansaço que dormir não resolve. Eu ouvi 🤍",
    estomago: "O corpo fala o que a boca segura. Anotei 🤍",
    peito: "Esse aperto tem explicação — já chego nela 🤍",
    todos: "Tudo ao mesmo tempo… você está carregando muito. Anotei 🤍",
  },
  comportamento: {
    checagem: "Checar é o seu jeito de proteger. Entendi 🤍",
    "aceitar-mais": "Dizer não parece egoísmo pra você, né? Anotei 🤍",
    oracao: "Você ora… e não passa. Isso tem nome — já te mostro 🤍",
    cenarios: "Sua mente ensaia a dor antes da hora. Eu vi 🤍",
  },
  frase: {
    soltar: "\u201CSe eu soltar…\u201D — quanta coisa você segura sozinha. 🤍",
    "nao-parar": "\u201CTem gente dependendo de mim.\u201D Eu sei o peso dessa frase 🤍",
    insuficiente: "\u201CNunca sou suficiente.\u201D Essa dói até de ler. Obrigada pela coragem 🤍",
    pior: "\u201CE se acontecer o pior?\u201D Vamos desarmar esse alarme juntas 🤍",
  },
  espiritual: {
    "mente-nao-desliga": "Orar com a mente ligada é exaustivo. Entendi 🤍",
    "sirvo-muito": "Servir tanto e sentir tão pouco… anotei 🤍",
    "perdao-constante": "Pedir perdão o tempo todo cansa a alma. Eu ouvi 🤍",
    "medo-abandono": "Esse medo não é falta de fé. Já te explico 🤍",
  },
  risco: {
    funcionando: "Eu ouvi. E \u2018funcionando\u2019 às vezes é o jeito mais cansado de existir.",
    dificil: "Obrigada por ser honesta. Seguimos juntas, no seu ritmo.",
    sombrios: "Obrigada pela coragem de marcar isso. Aqui ninguém te julga.",
    crise: "Eu ouvi você. Vamos com calma — uma pergunta de cada vez.",
  },
};

const GUIDE_REACTIONS_GENERIC: Record<string, string> = {
  situacao: "Entendi seu contexto. Isso muda como eu leio todo o resto 🤍",
  desejo: "É exatamente pra isso que o seu resultado aponta 🤍",
};

/** Retorna a reação da guia + duração em ms.
 *  Duração: 3.5s padrão, 4.5s pra frase (a mais pesada). */
export function getGuideReaction(questionKey: string, value: string): { text: string; durationMs: number } {
  const strip = (s: string) => s.replace(/\s*🤍\s*$/, "").trim();
  const perOption = GUIDE_REACTIONS[questionKey]?.[value];
  if (perOption) {
    return { text: strip(perOption), durationMs: questionKey === "frase" ? 4500 : 3500 };
  }
  const generic = GUIDE_REACTIONS_GENERIC[questionKey];
  if (generic) {
    return { text: strip(generic), durationMs: 3500 };
  }
  return { text: strip(CONFIRMATIONS[Math.floor(Math.random() * CONFIRMATIONS.length)]), durationMs: 3500 };
}

// G4-v2: Estatísticas reais por sintoma (base ~70 leads jun/2026)
export const SYMPTOM_STATS: Record<string, string> = {
  todos: "4 em cada 10 mulheres que fazem esse diagnóstico marcam \u2018tudo isso\u2019. Você não está exagerando.",
  tensao: "3 em cada 10 sentem esse mesmo cansaço no corpo. Você não está sozinha.",
  madrugada: "2 em cada 10 acordam nesse mesmo horário. Não é coincidência.",
  peito: "Você não é a única — e o que você sente tem padrão e tem caminho.",
  estomago: "Você não é a única — e o que você sente tem padrão e tem caminho.",
};

/** Retorna a fala da guia ANTES da pergunta, considerando respostas anteriores. */
export function getTransition(qIndex: number, answers: Record<string, string>): string | null {
  const q = QUESTIONS[qIndex];
  if (!q) return null;
  if (q.transitionFrom) {
    const ans = answers[q.transitionFrom.questionKey];
    if (ans && q.transitionFrom.map[ans]) return q.transitionFrom.map[ans];
  }
  return q.transition ?? null;
}

// Oferta Neurofé (design 2026-07-02) — dormente até a Fase 2 fiar na OfferScreen nova.
export const NEUROFE_OFFER = {
  anchorCents: 22800,       // "de" R$228 (âncora do value stack; preço "por" continua vindo do DB)
  guaranteeDays: 15,
  installments: 10,
  installmentCents: 560,    // 10× de R$5,60 (com juros — confirmado pelo dono)
  valueStack: [
    { label: "Volume I + II · 14 sessões guiadas", cents: 12700 },
    { label: "E-book · Dormir Melhor Hoje", cents: 3700 },
    { label: "E-book · 30 Devocionais com Jesus", cents: 3700 },
    { label: "Louvores do Reino · 148 em Salmos", cents: 2700 },
  ],
  metodo: "O caminho que mudou a minha vida — e a de centenas de mulheres que precisavam de alívio. E sim, é possível: com a técnica certa e a constância, <b>a mente muda</b>. Ela aprende novos hábitos, novas rotinas de paz — é a renovação da mente que Paulo já testificava:",
  volumes: [
    { titulo: "Volume I — Despertar", subtitulo: "7 Manhãs de Renovação da Mente" },
    { titulo: "Volume II — Repouso", subtitulo: "7 Noites de Selagem Profunda" },
  ],
} as const;