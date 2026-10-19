import { en } from "@/lib/live/locales/en";

// The live setup has its own dictionary; the rest of the live experience retains
// its existing language support until those screens are translated separately.
export const frSetup = {
  ...en,
  common: { ...en.common, loading: "Chargement…", sessionNotFound: "Rituel introuvable", optional: "Facultatif", close: "Fermer" },
  home: { ...en.home, invalidRitualFile: "Fichier de rituel invalide", unableToLoadRitualFile: "Impossible de charger ce fichier" },
  activities: {
    innesco: { ...en.activities.innesco, name: "Déclencheur", setupDescription: "Commencez par une réponse courte.", defaultPrompt: "En un mot : avec quelle énergie arrivez-vous aujourd'hui ?" },
    traccia: { ...en.activities.traccia, name: "Émergence", setupDescription: "Recueillez et regroupez les contributions.", defaultPrompt: "Quelle difficulté ou opportunité mérite notre attention ?" },
    focus: { ...en.activities.focus, name: "Focus", setupDescription: "Approfondissez une question ensemble.", defaultPrompt: "Quelle question devons-nous garder au centre ?" },
    priorita: { ...en.activities.priorita, name: "Priorité", setupDescription: "Votez pour ce qui compte le plus.", defaultPrompt: "Choisissez les éléments les plus importants." },
    patto: { ...en.activities.patto, name: "Pacte", setupDescription: "Formulez une proposition et vérifiez l'accord.", defaultPrompt: "Exprimez votre niveau d'accord avec le pacte final." }
  },
  setup: {
    ...en.setup,
    title: "Rituel collectif", defaultTitle: "Rituel de décision", addActivity: "Ajouter une activité",
    activityAddedSingular: "{count} activité ajoutée", activitiesAddedPlural: "{count} activités ajoutées",
    sections: { ritualSettings: "Informations du rituel", participants: "Participants", activities: "Activités", activityConfiguration: "Configuration des activités" },
    customRolePlaceholder: "Ajouter un rôle", addRole: "Ajouter", contextHint: "Facultatif. Choisissez un contexte pour suggérer des rôles.",
    rolesHintWithoutContext: "Ajoutez les rôles manuellement", rolesHintWithContext: "Modifiez ou ajoutez des rôles",
    estimatedTotalDuration: "Durée totale estimée :", configureActivity: "Configurer l'activité", collapseActivity: "Réduire", needsSetup: "À configurer", durationOff: "Désactivé", noContextSelected: "Sans contexte",
    responseVisibilityTitle: "Visibilité des réponses", responseVisibilityHint: "Choisissez quand afficher les réponses sur l'écran partagé.",
    liveTitle: "Afficher les réponses en direct", liveHelper: "Les réponses apparaissent dès leur envoi.", collectThenRevealTitle: "Recueillir puis révéler", collectThenRevealHelper: "Les réponses restent masquées jusqu'à leur révélation.",
    surfaceInputTypesTitle: "Types de contributions", surfaceInputTypesHint: "Définissez les catégories pour recueillir les réponses.", surfaceInputTypesRecommendation: "Recommandé : 2 à 4 catégories. Maximum : 6.", surfaceAddCategory: "+ Ajouter un type", surfaceCategoryNamePlaceholder: "Nom de la catégorie", surfaceColorLabel: "Couleur", surfaceMaxCategories: "Vous pouvez ajouter jusqu'à 6 catégories.", surfaceKeepOne: "Conservez au moins une catégorie.",
    participantDetailsTitle: "Informations des participants", participantDetailsHint: "Choisissez les informations demandées avant de rejoindre le rituel.", nicknameOnlyTitle: "Pseudonyme uniquement", nicknameOnlyHint: "Demandez uniquement un nom court.", identifiedParticipationTitle: "Participation identifiée", identifiedParticipationHint: "Recueillez le prénom, le nom, l'organisation et le contact. Seul le nom affiché apparaît pendant les activités.",
    labels: { ritualName: "Nom du rituel", activity: "Ajouter des activités", howToUse: "Mode d'emploi", instruction: "Question ou consigne", context: "Contexte", roles: "Rôles des participants", facilitatorName: "Nom du facilitateur", duration: "Durée", durationAriaLabel: "Durée en minutes", numberOfVotes: "Nombre de votes", priorityWhat: "Que faut-il prioriser ?", prioritySourceActivity: "Réponses d'une activité précédente", priorityItemsManual: "Saisie manuelle", finalStatement: "Proposition de pacte", facilitatorNote: "Note du facilitateur", pactStatementMode: "Mode du pacte" },
    timerTitle: "Durée de l'activité", timerHint: "Définissez une durée si vous souhaitez utiliser un minuteur.", timerToggleLabel: "Utiliser un minuteur", priorityPreviousActivity: "Réponses d'une activité précédente", priorityManualInput: "Saisie manuelle", priorityPreviousHint: "Choisissez une activité dont les réponses seront soumises au vote.", priorityManualHint: "Ajoutez les éléments à soumettre au vote.", priorityManualPlaceholder: "Saisir un élément", priorityVotesHint: "Choisissez le nombre de votes par participant.", priorityVotesHelper: "Prévoyez plus de votes lorsqu'il y a beaucoup d'options.", priorityVotePerParticipantSingular: "vote par participant", priorityVotePerParticipantPlural: "votes par participant", priorityVotesAriaLabel: "Nombre de votes par participant", increasePriorityVotes: "Augmenter le nombre de votes", decreasePriorityVotes: "Réduire le nombre de votes", noPreviousActivities: "Ajoutez d'abord une activité Déclencheur, Émergence ou Focus.",
    pactStatementModeHint: "Choisissez quand préparer la proposition.", pactBuildLiveTitle: "Proposition rédigée pendant le rituel", pactBuildLiveHint: "Rédigez la proposition à partir des contributions recueillies.", pactPredefinedTitle: "Proposition préparée", pactPredefinedHint: "Rédigez une proposition à présenter au groupe.", facilitatorNoteHint: "Ajoutez une note pour préparer la proposition.", facilitatorNotePlaceholder: "Ex. Transformer les priorités en engagement commun.", pactProposalPlaceholder: "Ex. Nous nous engageons à définir une prochaine étape commune.",
    saveRitualFile: "Enregistrer le fichier du rituel", saveRitualFileHelp: "Enregistrez la configuration pour la réutiliser.", saveChanges: "Enregistrer les modifications", changesSaved: "Modifications enregistrées.", editUnavailableTitle: "Le rituel est déjà en cours", editUnavailableBody: "Les activités ne peuvent plus être modifiées après le démarrage.", backToDashboard: "Retour aux rituels", openLobby: "Ouvrir le lobby",
    contexts: [
      { id: "healthcare", label: "Santé", roles: ["Médecin", "Infirmier", "Coordinateur", "Aide-soignant", "Personnel administratif", "Responsable qualité", "Chercheur", "Facilitateur", "Patient", "Aidant"] },
      { id: "university", label: "Université", roles: ["Enseignant", "Chercheur", "Étudiant", "Tuteur", "Personnel administratif", "Coordinateur", "Facilitateur", "Partenaire externe"] },
      { id: "school", label: "École et éducation", roles: ["Enseignant", "Élève", "Directeur", "Éducateur", "Parent", "Facilitateur"] },
      { id: "public-sector", label: "Secteur public", roles: ["Agent public", "Directeur", "Responsable innovation", "Responsable participation", "Designer de services", "Facilitateur", "Représentant institutionnel", "Citoyen", "Représentant associatif"] },
      { id: "tech-teams", label: "Équipes techniques", roles: ["Développeur", "Responsable technique", "Designer UX/UI", "Designer produit", "Responsable produit", "Chercheur", "Scrum master", "Coach agile"] },
      { id: "product-teams", label: "Équipes produit", roles: ["Responsable produit", "Designer produit", "Chercheur UX", "Designer de services", "Designer de contenu", "Partie prenante", "Marketing", "Commercial", "Support client"] },
      { id: "hr", label: "RH et organisation interne", roles: ["Responsable RH", "Partenaire RH", "Responsable d'équipe", "Employé", "Responsable du changement", "Facilitateur"] },
      { id: "learning", label: "Formation professionnelle", roles: ["Formateur", "Participant", "Mentor", "Coordinateur", "Concepteur pédagogique"] },
      { id: "consulting", label: "Conseil et facilitation", roles: ["Consultant", "Facilitateur", "Client", "Partie prenante", "Designer", "Chercheur"] },
      { id: "research", label: "Recherche qualitative et participative", roles: ["Chercheur", "Participant", "Observateur", "Facilitateur", "Représentant de la communauté"] },
      { id: "nonprofit", label: "Associations et organisations à but non lucratif", roles: ["Coordinateur de projet", "Bénévole", "Intervenant", "Bénéficiaire", "Partenaire", "Facilitateur"] },
      { id: "events", label: "Événements et conférences", roles: ["Modérateur", "Intervenant", "Participant", "Organisateur"] },
      { id: "communities", label: "Communautés et innovation", roles: ["Fondateur", "Mentor", "Responsable innovation", "Partenaire", "Chercheur", "Investisseur", "Facilitateur"] },
      { id: "cx", label: "Expérience client et services", roles: ["Support client", "Responsable des opérations", "Designer de services", "Responsable de compte", "Utilisateur", "Responsable produit"] }
    ]
  }
};
