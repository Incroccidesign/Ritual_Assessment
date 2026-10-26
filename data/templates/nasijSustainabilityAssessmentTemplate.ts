import type {
  ElementType,
  ExplorationOptionGroup,
  ExplorationResponseMode,
  PlanningReportSectionConfig,
  ProfilingField,
  ProfilingFieldType
} from "@/types/activity";
import type { Assessment } from "@/types/assessment";

type TemplateProfilingField = Omit<ProfilingField, "id">;

type BaseTemplateActivity = {
  key: string;
  title: string;
  prompt: string;
};

type TemplateProfilingActivity = BaseTemplateActivity & {
  type: "profiling";
  fields: TemplateProfilingField[];
};

type TemplateExplorationActivity = BaseTemplateActivity & {
  type: "exploration";
  itemType: ElementType;
  responseMode: ExplorationResponseMode;
  options: string[];
  optionGroups?: ExplorationOptionGroup[];
  optionGroupAssignments?: Record<string, string>;
  allowOther?: boolean;
  maxSelections?: number;
};

type TemplatePrioritizationActivity = BaseTemplateActivity & {
  type: "prioritization";
  sourceKey: string;
};

type TemplateFramingActivity = BaseTemplateActivity & {
  type: "framing";
  sourceKey?: string;
  maxLength: number;
  questions: Array<{
    title: string;
    prompt: string;
    placeholder?: string;
    required?: boolean;
  }>;
};

type TemplatePlanningReportActivity = BaseTemplateActivity & {
  type: "planning_report";
  reportTitle: string;
  reportSubtitle: string;
  sections: Array<Omit<PlanningReportSectionConfig, "items"> & {
    items?: Array<{
      sourceKey: string;
      title: string;
      visible: boolean;
    }>;
  }>;
};

export type AssessmentTemplateActivity =
  | TemplateProfilingActivity
  | TemplateExplorationActivity
  | TemplatePrioritizationActivity
  | TemplateFramingActivity
  | TemplatePlanningReportActivity;

export type AssessmentTemplate = {
  pickerTitle: string;
  pickerDescription: string;
  pickerBadge: string;
  title: string;
  description: string;
  estimatedDuration?: string;
  language: Assessment["language"];
  status: Assessment["status"];
  activities: AssessmentTemplateActivity[];
};

const nasijEstimatedDurations = {
  it: "Tempo stimato di compilazione: circa 25�35 minuti.",
  en: "Estimated completion time: around 35�45 minutes.",
  fr: "Temps estim� de r�ponse : environ 25�35 minutes."
};

const governorates = [
  "Ariana",
  "B�ja",
  "Ben Arous",
  "Bizerte",
  "Gab�s",
  "Gafsa",
  "Jendouba",
  "Kairouan",
  "Kasserine",
  "K�bili",
  "Kef",
  "Mahdia",
  "Manouba",
  "M�denine",
  "Monastir",
  "Nabeul",
  "Sfax",
  "Sidi Bouzid",
  "Siliana",
  "Sousse",
  "Tataouine",
  "Tozeur",
  "Tunis",
  "Zaghouan"
];

const italianRespondentRoles = [
  "Artigiano",
  "Proprietario/a d'impresa",
  "Fondatore / fondatrice",
  "Direttore generale",
  "Responsabile delle operazioni",
  "Responsabile di produzione",
  "Responsabile qualit�",
  "Responsabile tecnico",
  "Responsabile innovazione",
  "Responsabile sostenibilit�",
  "Responsabile HR / formazione",
  "Product manager",
  "Sviluppatore prodotto",
  "Designer",
  "Modellista",
  "Operatore macchina / tecnico",
  "Responsabile commerciale",
  "Responsabile marketing / comunicazione",
  "Personale amministrativo",
  "Consulente esterno"
];

const frenchRespondentRoles = [
  "Artisan",
  "Propri�taire d'entreprise",
  "Fondateur / fondatrice",
  "Directeur g�n�ral",
  "Responsable des op�rations",
  "Responsable de production",
  "Responsable qualit�",
  "Responsable technique",
  "Responsable innovation",
  "Responsable durabilit�",
  "Responsable RH / formation",
  "Chef de produit",
  "D�veloppeur produit",
  "Designer",
  "Mod�liste",
  "Op�rateur machine / technicien",
  "Responsable commercial",
  "Responsable marketing / communication",
  "Personnel administratif",
  "Consultant externe"
];

const italianOrganizationTypes = [
  "Cooperativa",
  "Associazione",
  "Impresa individuale � 1 dipendenti",
  "Microazienda � 2-4 dipendenti",
  "Azienda di piccole dimensioni � 5-19 dipendenti",
  "Azienda di medie dimensioni � 20-99 dipendenti",
  "Azienda di grandi dimensioni � 100 o pi� dipendenti",
  "Start-up"
];

const frenchOrganizationTypes = [
  "Coop�rative",
  "Association",
  "Entreprise individuelle � 1 employ�",
  "Microentreprise � 2-4 employ�s",
  "Petite entreprise � 5-19 employ�s",
  "Entreprise moyenne � 20-99 employ�s",
  "Grande entreprise � 100 employ�s ou plus",
  "Start-up"
];

const activityAreasIt = [
  "Tessitura",
  "Filatura",
  "Tintura",
  "Finissaggio",
  "Confezione",
  "Maglieria",
  "Distribuzione / commercio",
  "Formazione",
  "Ricerca",
  "Supporto tecnico / consulenza"
];

const activityAreasFr = [
  "Tissage",
  "Filature",
  "Teinture",
  "Finition",
  "Confection",
  "Tricotage",
  "Distribution / commerce",
  "Formation",
  "Recherche",
  "Soutien technique / conseil"
];

const currentDifficultiesIt = [
  "Organizzazione interna dei processi poco efficiente",
  "Macchinari, impianti o tecnologie non adeguati",
  "Consumi energetici elevati nei processi produttivi",
  "Consumi idrici elevati",
  "Costi produttivi difficili da controllare",
  "Sprechi, rilavorazioni o difetti di produzione",
  "Difficolt� nella gestione degli scarti tessili",
  "Mancanza di dati su consumi, costi, scarti, sicurezza o impatti",
  "Difficolt� nel garantire sicurezza e condizioni di lavoro adeguate",
  "Carichi di lavoro, fatica fisica o rischi operativi elevati",
  "Difficolt� a favorire l'inclusione di lavoratrici e lavoratori con esigenze specifiche",
  "Difficolt� a garantire continuit� e stabilit� dei contratti di lavoro",
  "Bisogno di formazione tecnica del personale",
  "Bisogno di formazione su sicurezza, qualit� o sostenibilit�",
  "Difficolt� nel trattenere o attrarre lavoratori qualificati",
  "Comunicazione interna poco efficace tra ruoli, reparti o livelli decisionali",
  "Difficolt� nel rispondere a richieste di sostenibilit� da parte di clienti o mercati",
  "Difficolt� nel prepararsi a standard, certificazioni o audit ambientali e sociali",
  "Difficolt� nel valorizzare pratiche sostenibili gi� esistenti"
];

const currentDifficultiesFr = [
  "Organisation interne des processus peu efficace",
  "Machines, installations ou technologies inad�quates",
  "Consommations �nerg�tiques �lev�es dans les processus de production",
  "Consommations d'eau �lev�es",
  "Co�ts de production difficiles � contr�ler",
  "Gaspillages, reprises ou d�fauts de production",
  "Difficult�s dans la gestion des d�chets textiles",
  "Manque de donn�es sur les consommations, les co�ts, les d�chets, la s�curit� ou les impacts",
  "Difficult�s � garantir la s�curit� et des conditions de travail ad�quates",
  "Charges de travail, fatigue physique ou risques op�rationnels �lev�s",
  "Difficult� � favoriser l'inclusion des travailleuses et travailleurs ayant des besoins sp�cifiques",
  "Difficult� � garantir la continuit� et la stabilit� des contrats de travail",
  "Besoin de formation technique du personnel",
  "Besoin de formation sur la s�curit�, la qualit� ou la durabilit�",
  "Difficult�s � retenir ou attirer des travailleurs qualifi�s",
  "Communication interne peu efficace entre r�les, d�partements ou niveaux d�cisionnels",
  "Difficult�s � r�pondre aux demandes de durabilit� des clients ou des march�s",
  "Difficult�s � se pr�parer aux standards, certifications ou audits environnementaux et sociaux",
  "Difficult�s � valoriser les pratiques durables d�j� existantes"
];

const urgentAreasIt = [
  "Produzione",
  "Qualit�",
  "Manutenzione",
  "Logistica / magazzino",
  "Acquisti / fornitori",
  "Commerciale / clienti",
  "Amministrazione / gestione",
  "Risorse umane / formazione",
  "Direzione / management",
  "Tutta l'organizzazione"
];

const urgentAreasFr = [
  "Production",
  "Qualit�",
  "Maintenance",
  "Logistique / entrep�t",
  "Achats / fournisseurs",
  "Commercial / clients",
  "Administration / gestion",
  "Ressources humaines / formation",
  "Direction / management",
  "Toute l'organisation"
];

const impactedProfilesIt = [
  "Propriet� / direzione",
  "Responsabili di produzione o tecnici",
  "Responsabili qualit� o sostenibilit�",
  "Responsabili HR / formazione",
  "Operatori e operatrici di produzione",
  "Tecnici di macchina / manutenzione",
  "Personale commerciale o amministrativo",
  "Consulenti o partner esterni",
  "Tutta l'organizzazione"
];

const impactedProfilesFr = [
  "Propri�t� / direction",
  "Responsables de production ou techniques",
  "Responsables qualit� ou durabilit�",
  "Responsables RH / formation",
  "Op�rateurs et op�ratrices de production",
  "Techniciens machine / maintenance",
  "Personnel commercial ou administratif",
  "Consultants ou partenaires externes",
  "Toute l'organisation"
];

const effectsIt = [
  "Aumento dei costi",
  "Riduzione della produttivit�",
  "Ritardi nelle consegne",
  "Problemi di qualit�",
  "Aumento di sprechi, scarti o rilavorazioni",
  "Aumento di consumi o impatti ambientali",
  "Rischi per sicurezza o salute",
  "Peggioramento delle condizioni di lavoro",
  "Difficolt� nel motivare, formare o trattenere il personale",
  "Difficolt� con clienti, mercati o certificazioni"
];

const effectsFr = [
  "Augmentation des co�ts",
  "R�duction de la productivit�",
  "Retards de livraison",
  "Probl�mes de qualit�",
  "Augmentation des gaspillages, d�chets ou reprises",
  "Augmentation des consommations ou impacts environnementaux",
  "Risques pour la s�curit� ou la sant�",
  "D�gradation des conditions de travail",
  "Difficult�s � motiver, former ou retenir le personnel",
  "Difficult�s avec les clients, les march�s ou les certifications"
];

function profilingField(
  label: string,
  fieldType: ProfilingFieldType,
  options?: string[],
  allowOther = false
): TemplateProfilingField {
  return {
    label,
    fieldType,
    required: true,
    allowOther,
    ...(options ? { options } : {})
  };
}

function exploration(
  key: string,
  title: string,
  prompt: string,
  options: string[],
  allowOther = true,
  maxSelections?: number,
  optionGroups?: ExplorationOptionGroup[],
  optionGroupAssignments?: Record<string, string>
): TemplateExplorationActivity {
  return {
    key,
    type: "exploration",
    title,
    prompt,
    itemType: "criticalities",
    responseMode: "open_list",
    allowOther,
    maxSelections,
    options,
    ...(optionGroups ? { optionGroups } : {}),
    ...(optionGroupAssignments ? { optionGroupAssignments } : {})
  };
}

function groupedChallengeOptions(
  socialOptions: string[],
  environmentalOptions: string[],
  socialLabel: string,
  environmentalLabel: string
) {
  const optionGroups = [
    { id: "social-personnel", label: socialLabel, orderIndex: 0 },
    { id: "environmental-processes", label: environmentalLabel, orderIndex: 1 }
  ];
  const options = [...socialOptions, ...environmentalOptions];
  const optionGroupAssignments: Record<string, string> = {};
  socialOptions.forEach((_, index) => {
    optionGroupAssignments[String(index)] = optionGroups[0].id;
  });
  environmentalOptions.forEach((_, index) => {
    optionGroupAssignments[String(socialOptions.length + index)] = optionGroups[1].id;
  });

  return { options, optionGroups, optionGroupAssignments };
}

function groupedOptionBlocks(blocks: Array<{ id: string; label: string; options: string[] }>) {
  const optionGroups = blocks.map((block, index) => ({ id: block.id, label: block.label, orderIndex: index }));
  const options = blocks.flatMap((block) => block.options);
  const optionGroupAssignments: Record<string, string> = {};
  let optionIndex = 0;
  blocks.forEach((block) => {
    block.options.forEach(() => {
      optionGroupAssignments[String(optionIndex)] = block.id;
      optionIndex += 1;
    });
  });

  return { options, optionGroups, optionGroupAssignments };
}

const currentDifficultyGroupsIt = groupedOptionBlocks([
  {
    id: "processes-resources-impacts",
    label: "Processi, risorse e impatti",
    options: currentDifficultiesIt.slice(0, 8)
  },
  {
    id: "work-skills-organization",
    label: "Lavoro, competenze e organizzazione",
    options: currentDifficultiesIt.slice(8, 16)
  },
  {
    id: "markets-standards-value",
    label: "Mercati, standard e valorizzazione",
    options: currentDifficultiesIt.slice(16)
  }
]);

const currentDifficultyGroupsFr = groupedOptionBlocks([
  {
    id: "processes-resources-impacts",
    label: "Processus, ressources et impacts",
    options: currentDifficultiesFr.slice(0, 8)
  },
  {
    id: "work-skills-organization",
    label: "Travail, comp�tences et organisation",
    options: currentDifficultiesFr.slice(8, 16)
  },
  {
    id: "markets-standards-value",
    label: "March�s, standards et valorisation",
    options: currentDifficultiesFr.slice(16)
  }
]);

const shortChallengeGroupsIt = groupedChallengeOptions(
  [
    "Migliorare la regolarit� e la stabilit� dei rapporti di lavoro",
    "Garantire retribuzioni eque e pagamenti regolari",
    "Migliorare l'organizzazione degli orari e la conciliazione tra lavoro e vita familiare",
    "Formare il personale su competenze tecniche specifiche",
    "Formare il personale su sostenibilit�, qualit� o innovazione",
    "Migliorare la sicurezza e le condizioni di lavoro"
  ],
  [
    "Ridurre i consumi energetici nei processi produttivi",
    "Ridurre i consumi idrici",
    "Migliorare la gestione degli scarti tessili",
    "Valorizzare gli scarti di produzione",
    "Ridurre sprechi, rilavorazioni e difetti di produzione",
    "Raccogliere dati su consumi, costi, scarti e impatti",
    "Migliorare l'organizzazione interna dei processi",
    "Individuare materiali o fornitori pi� sostenibili",
    "Rispondere alle richieste di sostenibilit� dei clienti",
    "Prepararsi a standard, certificazioni o audit",
    "Comunicare meglio le pratiche sostenibili gi� esistenti",
    "Migliorare la tracciabilit� dei prodotti o dei processi"
  ],
  "Ambito sociale e del personale",
  "Ambito ambientale e dei processi"
);

const shortChallengeGroupsFr = groupedChallengeOptions(
  [
    "Am�liorer la r�gularit� et la stabilit� des relations de travail",
    "Garantir des r�mun�rations �quitables et des paiements r�guliers",
    "Am�liorer l'organisation des horaires et l'�quilibre entre travail et vie familiale",
    "Former le personnel � des comp�tences techniques sp�cifiques",
    "Former le personnel � la durabilit�, � la qualit� ou � l'innovation",
    "Am�liorer la s�curit� et les conditions de travail"
  ],
  [
    "R�duire les consommations �nerg�tiques dans les processus de production",
    "R�duire les consommations d'eau",
    "Am�liorer la gestion des d�chets textiles",
    "Valoriser les d�chets de production",
    "R�duire les gaspillages, reprises et d�fauts de production",
    "Collecter des donn�es sur les consommations, les co�ts, les d�chets et les impacts",
    "Am�liorer l'organisation interne des processus",
    "Identifier des mat�riaux ou fournisseurs plus durables",
    "R�pondre aux demandes de durabilit� des clients",
    "Se pr�parer aux standards, certifications ou audits",
    "Mieux communiquer les pratiques durables d�j� existantes",
    "Am�liorer la tra�abilit� des produits ou des processus"
  ],
  "Domaine social et du personnel",
  "Domaine environnemental et des processus"
);

function prioritization(key: string, title: string, prompt: string, sourceKey: string): TemplatePrioritizationActivity {
  return {
    key,
    type: "prioritization",
    title,
    prompt,
    sourceKey
  };
}

function framing(
  key: string,
  title: string,
  prompt: string,
  sourceKey: string | undefined,
  questions: TemplateFramingActivity["questions"]
): TemplateFramingActivity {
  return {
    key,
    type: "framing",
    title,
    prompt,
    sourceKey,
    maxLength: 2500,
    questions
  };
}

function planningReport(locale: "it" | "fr"): TemplatePlanningReportActivity {
  const isItalian = locale === "it";
  const item = (sourceKey: string, title: string) => ({ sourceKey, title, visible: true });
  return {
    key: "planning-report",
    type: "planning_report",
    title: isItalian ? "Restituzione e report finale" : "Restitution et rapport final",
    prompt: isItalian
      ? "Rivedi la sintesi delle tue risposte e scarica il report finale dell'assessment NASIJ."
      : "Consultez la synth�se de vos r�ponses et t�l�chargez le rapport final de l'assessment NASIJ.",
    reportTitle: isItalian ? "Report assessment NASIJ" : "Rapport d'assessment NASIJ",
    reportSubtitle: isItalian
      ? "Sintesi strutturata delle risposte, delle priorit�, dei punti di forza e dei contributi emersi durante l'assessment."
      : "Synth�se structur�e des r�ponses, des priorit�s, des points forts et des contributions issues de l'assessment.",
    sections: [
      {
        key: "profile",
        title: isItalian ? "Profilo organizzazione" : "Profil de l'organisation",
        visible: true,
        items: [item("profiling", isItalian ? "Profilazione" : "Profilage")]
      },
      {
        key: "current-context",
        title: isItalian ? "Criticit� attuali e contesto operativo" : "Difficult�s actuelles et contexte op�rationnel",
        visible: true,
        items: [
          item("current-difficulties", isItalian ? "Criticit� principali" : "Difficult�s principales"),
          item("urgent-difficulty", isItalian ? "Criticit� pi� urgente" : "Difficult� la plus urgente"),
          item("urgent-area", isItalian ? "Area principale" : "Domaine principal"),
          item("impacted-profiles", isItalian ? "Profili coinvolti o impattati" : "Profils impliqu�s ou impact�s"),
          item("urgent-effects", isItalian ? "Effetti della criticit�" : "Effets de la difficult�"),
          item("urgent-note", isItalian ? "Nota aperta" : "Note ouverte")
        ]
      },
      {
        key: "short-term",
        title: isItalian ? "Breve termine" : "Court terme",
        visible: true,
        items: [
          item("short-objective", isItalian ? "Obiettivo principale a breve termine" : "Objectif principal � court terme"),
          item("short-challenges", isItalian ? "Challenge operative" : "D�fis op�rationnels"),
          item("short-priorities", isItalian ? "Priorit� a breve termine" : "Priorit�s � court terme"),
          item("short-needs-framing", isItalian ? "Framing dei bisogni a breve termine" : "Cadrage des besoins � court terme")
        ]
      },
      {
        key: "medium-long-term",
        title: isItalian ? "Medio-lungo termine" : "Moyen-long terme",
        visible: true,
        items: [
          item("medium-objective", isItalian ? "Obiettivo principale a medio-lungo termine" : "Objectif principal � moyen-long terme")
        ]
      },
      {
        key: "strengths-impact",
        title: isItalian ? "Punti di forza e impatto sul territorio" : "Points forts et impact sur le territoire",
        visible: true,
        items: [
          item("elements-to-value", isItalian ? "Punti di forza e impatto sul territorio" : "Points forts et impact sur le territoire")
        ]
      },
      {
        key: "network-contribution",
        title: isItalian ? "Risorse e contributi per il network NASIJ" : "Ressources et contributions pour le r�seau NASIJ",
        visible: true,
        items: [
          item("network-resources", isItalian ? "Risorse e contributi per il network NASIJ" : "Ressources et contributions pour le r�seau NASIJ")
        ]
      }
    ]
  };
}

function buildItalianTemplate(): AssessmentTemplate {
  return {
    pickerTitle: "NASIJ � Assessment sostenibilit�",
    pickerDescription:
      "Questa valutazione aiuta a identificare le difficolt� attuali, gli obiettivi prioritari, i bisogni di accompagnamento e le risorse che ogni organizzazione pu� mettere a disposizione del network NASIJ. Permette inoltre di raccogliere i punti di forza dell�organizzazione e il suo potenziale impatto sul territorio.\n\nQuesto questionario � sviluppato dal Service Design Lab dell�Universit� degli Studi di Firenze � DIDA, in collaborazione con Fondazione PIN, nell�ambito del progetto NASIJ � AID 12833.",
    pickerBadge: "IT",
    title: "Valutazione degli obiettivi, delle criticit�, delle sfide e delle opportunit� di collaborazione NASIJ",
    description:
      "Questa valutazione aiuta a identificare le difficolt� attuali, gli obiettivi prioritari, i bisogni di accompagnamento e le risorse che ogni organizzazione pu� mettere a disposizione del network NASIJ. Permette inoltre di raccogliere i punti di forza dell�organizzazione e il suo potenziale impatto sul territorio.\n\nQuesto questionario � sviluppato dal Service Design Lab dell�Universit� degli Studi di Firenze � DIDA, in collaborazione con Fondazione PIN, nell�ambito del progetto NASIJ � AID 12833.",
    estimatedDuration: nasijEstimatedDurations.it,
    language: "it",
    status: "draft",
    activities: [
      {
        key: "profiling",
        type: "profiling",
        title: "1. Profilazione",
        prompt:
          "Questa sezione raccoglie informazioni di base sul rispondente e sulla sua organizzazione. Il questionario dovrebbe essere compilato preferibilmente da una persona con una visione complessiva dell'organizzazione, dei processi produttivi, delle condizioni di lavoro e delle priorit� di sviluppo.",
        fields: [
          profilingField("Nome dell'organizzazione", "text"),
          profilingField("Area geografica / Governatorato", "select", governorates),
          profilingField("Ruolo del rispondente", "select", italianRespondentRoles, true),
          profilingField("Modalit� di compilazione", "select", [
            "Una sola persona",
            "Pi� persone della stessa area/reparto",
            "Pi� persone di aree/reparti diversi",
            "Con il supporto di un consulente esterno"
          ], true),
          profilingField("Tipo di organizzazione", "select", italianOrganizationTypes),
          profilingField("Ambito principale di attivit�", "select", activityAreasIt, true)
        ]
      },
      exploration(
        "current-difficulties",
        "2. Criticit� attuali e contesto operativo",
        "2.1 Quali sono le principali difficolt� che la vostra organizzazione sta affrontando attualmente? Selezionare una o pi� criticit� rilevanti. Se necessario, aggiungere una criticit� specifica non presente nell'elenco.",
        currentDifficultyGroupsIt.options,
        true,
        undefined,
        currentDifficultyGroupsIt.optionGroups,
        currentDifficultyGroupsIt.optionGroupAssignments
      ),
      prioritization(
        "urgent-difficulty",
        "2.2 Criticit� pi� urgente",
        "Tra le criticit� indicate, quale dovrebbe essere affrontata con maggiore urgenza? Ordinare mettendo in alto la criticit� prioritaria.",
        "current-difficulties"
      ),
      exploration(
        "urgent-area",
        "2.3 Area principale della criticit� pi� urgente",
        "In quale area si manifesta principalmente questa criticit� urgente? Selezionare l'area in cui la criticit� urgente � pi� evidente o produce gli effetti principali.",
        urgentAreasIt,
        true,
        1
      ),
      exploration(
        "impacted-profiles",
        "2.4 Profili coinvolti o impattati",
        "Quali profili sono maggiormente coinvolti o impattati dalla criticit� pi� urgente? Selezionare uno o pi� profili coinvolti o direttamente impattati.",
        impactedProfilesIt
      ),
      exploration(
        "urgent-effects",
        "2.5 Effetti della criticit� pi� urgente",
        "Quali effetti produce questa criticit� sulla vostra organizzazione? Selezionare gli effetti pi� rilevanti.",
        effectsIt
      ),
      framing(
        "urgent-note",
        "2.6 Nota aperta sulla criticit�",
        "Campo facoltativo. � possibile lasciare la risposta vuota.",
        "urgent-difficulty",
        [
          {
            title: "Nota aperta sulla criticit�",
            prompt:
              "Volete aggiungere informazioni utili per comprendere meglio questa criticit�? Potete descrivere da quanto tempo � presente, perch� � diventata rilevante, quali ostacoli impediscono di affrontarla o quali tentativi sono gi� stati fatti.",
            required: false
          }
        ]
      ),
      framing(
        "short-objective",
        "3. Obiettivo principale a breve termine",
        "Identificare un obiettivo principale che l'organizzazione intende raggiungere nei prossimi 6-12 mesi.",
        "urgent-difficulty",
        [
          {
            title: "Obiettivo principale",
            prompt:
              "Pensate ai prossimi 6-12 mesi. Qual � l'obiettivo principale di sostenibilit�, miglioramento o sviluppo che la vostra organizzazione vorrebbe raggiungere? Indicare un solo obiettivo principale."
          }
        ]
      ),
      exploration(
        "short-challenges",
        "4. Challenge e priorit� a breve termine",
        "4.1 Su quali challenge operative dovrebbe lavorare la vostra organizzazione per raggiungere l'obiettivo a breve termine indicato? Selezionare una o pi� challenge operative rilevanti, almeno una per ogni ambito (sociale e ambientale). Se necessario, aggiungere una challenge specifica non presente nell'elenco.",
        shortChallengeGroupsIt.options,
        true,
        undefined,
        shortChallengeGroupsIt.optionGroups,
        shortChallengeGroupsIt.optionGroupAssignments
      ),
      prioritization(
        "short-priorities",
        "4.2 Priorit� a breve termine",
        "Ordinare le challenge selezionate dalla priorit� pi� alta alla priorit� pi� bassa, considerando urgenza, fattibilit� e impatto su produzione, ambiente, sicurezza e condizioni di lavoro.",
        "short-challenges"
      ),
      framing(
        "short-needs-framing",
        "5. Framing dei bisogni a breve termine",
        "Questa sezione serve a trasformare l'obiettivo e le challenge a breve termine in bisogni operativi, azioni possibili e forme di supporto.",
        "short-priorities",
        [
          {
            title: "Supporto immediato",
            prompt:
              "Quale tipo di supporto aiuterebbe la vostra organizzazione a raggiungere l'obiettivo a breve termine e ad affrontare le challenge pi� urgenti?"
          },
          {
            title: "Risorse pratiche",
            prompt: "Quali strumenti, conoscenze, formazioni o supporto tecnico sarebbero utili nei prossimi 6-12 mesi?"
          },
          {
            title: "Primo passo",
            prompt: "Quale potrebbe essere un primo passo realistico per iniziare a lavorare su questo obiettivo?"
          }
        ]
      ),
      framing(
        "medium-objective",
        "6. Obiettivo principale a medio-lungo termine",
        "Identificare un obiettivo principale che l'organizzazione intende raggiungere o preparare nei prossimi 1-5 anni o pi�.",
        undefined,
        [
          {
            title: "Obiettivo principale",
            prompt:
              "Pensate ai prossimi 1-5 anni o pi�. Qual � l'obiettivo principale di sostenibilit�, miglioramento, sviluppo o trasformazione che potrebbe diventare pi� rilevante per la vostra organizzazione, il vostro settore o il vostro territorio?"
          }
        ]
      ),
      framing(
        "elements-to-value",
        "7. Punti di forza e impatto sul territorio",
        "Questa sezione serve a identificare i principali punti di forza dell'organizzazione, gli aspetti da valorizzare e il contributo positivo che pu� generare sul territorio, sulla comunit� locale e sul network NASIJ.",
        undefined,
        [
          {
            title: "Punti di forza e impatto sul territorio",
            prompt:
              "Quali sono i principali punti di forza della vostra azienda, organizzazione o attivit�? Quali elementi pensate debbano essere riconosciuti, rafforzati o comunicati meglio? Che tipo di impatto positivo pensate di poter generare sul territorio o sulla comunit� locale?",
            placeholder:
              "Potete fare riferimento, ad esempio, a competenze artigianali, know-how tecnico, qualit� dei prodotti, capacit� produttiva, radicamento territoriale, relazioni locali, pratiche sostenibili gi� esistenti, cultura del lavoro, innovazione, identit� aziendale, potenziale di collaborazione, opportunit� occupazionali, trasmissione di competenze, inclusione sociale o contributo allo sviluppo della comunit� locale."
          }
        ]
      ),
      framing(
        "network-resources",
        "8. Risorse e contributi per il network NASIJ",
        "Questa sezione serve a identificare cosa ogni organizzazione potrebbe condividere o mettere a disposizione delle altre realt� del network NASIJ, indipendentemente dagli obiettivi o dalle challenge indicate nelle sezioni precedenti.",
        undefined,
        [
          {
            title: "Risorse e contributi",
            prompt:
              "Quali risorse, competenze, esperienze, strumenti, conoscenze, spazi, servizi o opportunit� la vostra organizzazione potrebbe mettere a disposizione delle altre aziende o dei soggetti del network NASIJ?",
            placeholder:
              "Potete indicare, ad esempio, competenze tecniche, esperienze produttive, conoscenze locali, capacit� formative, disponibilit� a collaborare, accesso a macchinari, spazi, contatti, buone pratiche, casi studio o altre risorse utili."
          }
        ]
      ),
      planningReport("it")
    ]
  };
}

function buildFrenchTemplate(): AssessmentTemplate {
  return {
    pickerTitle: "NASIJ � Assessment durabilit�",
    pickerDescription:
      "Cette �valuation aide � identifier les difficult�s actuelles, les objectifs prioritaires, les besoins d�accompagnement et les ressources que chaque organisation peut mettre � disposition du r�seau NASIJ. Elle permet �galement de recueillir les points forts de l�organisation et son impact potentiel sur le territoire.\n\nCe questionnaire est d�velopp� par le Service Design Lab de l�Universit� de Florence � DIDA, en collaboration avec la Fondazione PIN, dans le cadre du projet NASIJ � AID 12833.",
    pickerBadge: "FR",
    title: "�valuation des objectifs, des difficult�s, des d�fis et des opportunit�s de collaboration NASIJ",
    description:
      "Cette �valuation aide � identifier les difficult�s actuelles, les objectifs prioritaires, les besoins d�accompagnement et les ressources que chaque organisation peut mettre � disposition du r�seau NASIJ. Elle permet �galement de recueillir les points forts de l�organisation et son impact potentiel sur le territoire.\n\nCe questionnaire est d�velopp� par le Service Design Lab de l�Universit� de Florence � DIDA, en collaboration avec la Fondazione PIN, dans le cadre du projet NASIJ � AID 12833.",
    estimatedDuration: nasijEstimatedDurations.fr,
    language: "fr",
    status: "draft",
    activities: [
      {
        key: "profiling",
        type: "profiling",
        title: "1. Profilage",
        prompt:
          "Cette section recueille des informations de base sur le r�pondant et son organisation. Le questionnaire devrait �tre rempli de pr�f�rence par une personne ayant une vision globale de l'organisation, des processus de production, des conditions de travail et des priorit�s de d�veloppement.",
        fields: [
          profilingField("Nom de l'organisation", "text"),
          profilingField("Zone g�ographique / Gouvernorat", "select", governorates),
          profilingField("R�le du r�pondant", "select", frenchRespondentRoles, true),
          profilingField("Mode de remplissage", "select", [
            "Une seule personne",
            "Plusieurs personnes du m�me service",
            "Plusieurs personnes de services diff�rents",
            "Avec le soutien d'un consultant externe"
          ], true),
          profilingField("Type d'organisation", "select", frenchOrganizationTypes),
          profilingField("Domaine principal d'activit�", "select", activityAreasFr, true)
        ]
      },
      exploration(
        "current-difficulties",
        "2. Difficult�s actuelles et contexte op�rationnel",
        "2.1 Quelles sont les principales difficult�s que votre organisation rencontre actuellement ? S�lectionner une ou plusieurs difficult�s pertinentes. Si n�cessaire, ajouter une difficult� sp�cifique qui n'est pas pr�sente dans la liste.",
        currentDifficultyGroupsFr.options,
        true,
        undefined,
        currentDifficultyGroupsFr.optionGroups,
        currentDifficultyGroupsFr.optionGroupAssignments
      ),
      prioritization(
        "urgent-difficulty",
        "2.2 Difficult� la plus urgente",
        "Parmi les difficult�s indiqu�es, laquelle devrait �tre trait�e avec le plus d'urgence ? Classer en pla�ant en haut la difficult� prioritaire.",
        "current-difficulties"
      ),
      exploration(
        "urgent-area",
        "2.3 Domaine principal de la difficult� la plus urgente",
        "Dans quel domaine cette difficult� urgente se manifeste-t-elle principalement ? S�lectionnez le domaine dans lequel cette difficult� est la plus marqu�e ou a les cons�quences les plus importantes.",
        urgentAreasFr,
        true,
        1
      ),
      exploration(
        "impacted-profiles",
        "2.4 Profils impliqu�s ou impact�s",
        "Quels profils sont les plus impliqu�s ou impact�s par la difficult� la plus urgente ? S�lectionner un ou plusieurs profils impliqu�s ou directement impact�s.",
        impactedProfilesFr
      ),
      exploration(
        "urgent-effects",
        "2.5 Effets de la difficult� la plus urgente",
        "Quels effets cette difficult� produit-elle sur votre organisation ? S�lectionner les effets les plus pertinents.",
        effectsFr
      ),
      framing(
        "urgent-note",
        "2.6 Note ouverte sur la difficult�",
        "Champ facultatif. Il est possible de laisser la r�ponse vide.",
        "urgent-difficulty",
        [
          {
            title: "Note ouverte sur la difficult�",
            prompt:
              "Souhaitez-vous ajouter des informations utiles pour mieux comprendre cette difficult� ? Vous pouvez d�crire depuis combien de temps elle est pr�sente, pourquoi elle est devenue pertinente, quels obstacles emp�chent de l'aborder ou quelles tentatives ont d�j� �t� faites.",
            required: false
          }
        ]
      ),
      framing(
        "short-objective",
        "3. Objectif principal � court terme",
        "Identifier un objectif principal que l'organisation souhaite atteindre dans les 6 � 12 prochains mois.",
        "urgent-difficulty",
        [
          {
            title: "Objectif principal",
            prompt:
              "Pensez aux 6 � 12 prochains mois. Quel est l'objectif principal de durabilit�, d'am�lioration ou de d�veloppement que votre organisation souhaiterait atteindre ? Indiquer un seul objectif principal."
          }
        ]
      ),
      exploration(
        "short-challenges",
        "4. D�fis et priorit�s � court terme",
        "4.1 Sur quels d�fis op�rationnels votre organisation devrait-elle travailler pour atteindre l'objectif � court terme indiqu� ? S�lectionner un ou plusieurs d�fis op�rationnels pertinents, au moins un pour chaque domaine (social et environnemental). Si n�cessaire, ajouter un d�fi sp�cifique qui n'est pas pr�sent dans la liste.",
        shortChallengeGroupsFr.options,
        true,
        undefined,
        shortChallengeGroupsFr.optionGroups,
        shortChallengeGroupsFr.optionGroupAssignments
      ),
      prioritization(
        "short-priorities",
        "4.2 Priorit�s � court terme",
        "Classer les d�fis s�lectionn�s de la priorit� la plus �lev�e � la priorit� la plus basse, en tenant compte de l'urgence, de la faisabilit� et de l'impact sur la production, l'environnement, la s�curit� et les conditions de travail.",
        "short-challenges"
      ),
      framing(
        "short-needs-framing",
        "5. Cadrage des besoins � court terme",
        "Cette section sert � transformer l'objectif et les d�fis � court terme en besoins op�rationnels, actions possibles et formes de soutien.",
        "short-priorities",
        [
          {
            title: "Soutien imm�diat",
            prompt:
              "Quel type de soutien aiderait votre organisation � atteindre l'objectif � court terme et � traiter les d�fis les plus urgents ?"
          },
          {
            title: "Ressources pratiques",
            prompt: "Quels outils, connaissances, formations ou soutiens techniques seraient utiles dans les 6 � 12 prochains mois ?"
          },
          {
            title: "Premier pas",
            prompt: "Quel pourrait �tre un premier pas r�aliste pour commencer � travailler sur cet objectif ?"
          }
        ]
      ),
      framing(
        "medium-objective",
        "6. Objectif principal � moyen-long terme",
        "Identifier un objectif principal que l'organisation souhaite atteindre ou pr�parer dans les 1 � 5 prochaines ann�es ou plus.",
        undefined,
        [
          {
            title: "Objectif principal",
            prompt:
              "Pensez aux 1 � 5 prochaines ann�es ou plus. Quel est l'objectif principal de durabilit�, d'am�lioration, de d�veloppement ou de transformation qui pourrait devenir le plus pertinent pour votre organisation, votre secteur ou votre territoire ?"
          }
        ]
      ),
      framing(
        "elements-to-value",
        "7. Points forts et impact sur le territoire",
        "Cette section sert � identifier les principaux points forts de l'organisation, les aspects � valoriser et la contribution positive qu'elle peut g�n�rer sur le territoire, la communaut� locale et le r�seau NASIJ.",
        undefined,
        [
          {
            title: "Points forts et impact sur le territoire",
            prompt:
              "Quels sont les principaux points forts de votre entreprise, organisation ou activit� ? Quels �l�ments pensez-vous devoir �tre reconnus, renforc�s ou mieux communiqu�s ? Quel type d'impact positif pensez-vous pouvoir g�n�rer sur le territoire ou la communaut� locale ?",
            placeholder:
              "Vous pouvez faire r�f�rence, par exemple, aux comp�tences artisanales, au savoir-faire technique, � la qualit� des produits, � la capacit� productive, � l'ancrage territorial, aux relations locales, aux pratiques durables d�j� existantes, � la culture du travail, � l'innovation, � l'identit� d'entreprise, au potentiel de collaboration, aux opportunit�s d'emploi, � la transmission de comp�tences, � l'inclusion sociale ou � la contribution au d�veloppement de la communaut� locale."
          }
        ]
      ),
      framing(
        "network-resources",
        "8. Ressources et contributions pour le r�seau NASIJ",
        "Cette section sert � identifier ce que chaque organisation pourrait partager ou mettre � disposition des autres r�alit�s du r�seau NASIJ, ind�pendamment des objectifs ou des d�fis indiqu�s dans les sections pr�c�dentes.",
        undefined,
        [
          {
            title: "Ressources et contributions",
            prompt:
              "Quelles ressources, comp�tences, exp�riences, outils, connaissances, espaces, services ou opportunit�s votre organisation pourrait-elle mettre � disposition des autres entreprises ou acteurs du r�seau NASIJ ?",
            placeholder:
              "Vous pouvez indiquer, par exemple, des comp�tences techniques, des exp�riences productives, des connaissances locales, des capacit�s de formation, une disponibilit� � collaborer, un acc�s � des machines, des espaces, des contacts, de bonnes pratiques, des cas d'�tude ou d'autres ressources utiles."
          }
        ]
      ),
      planningReport("fr")
    ]
  };
}

export const nasijAssessmentTemplates = {
  it: buildItalianTemplate(),
  fr: buildFrenchTemplate()
};

export const nasijDefaultAssessmentTemplates = [
  nasijAssessmentTemplates.it,
  nasijAssessmentTemplates.fr
];

export const nasijSustainabilityAssessmentTemplate: AssessmentTemplate = nasijAssessmentTemplates.fr;
