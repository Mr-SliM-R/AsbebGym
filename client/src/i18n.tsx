import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "fr";

type TranslationParams = Record<string, string | number>;

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslationParams) => string;
};

const storageKey = "gym-rival-language";

const fr: Record<string, string> = {
  Abs: "Abdos",
  "Abs Machine": "Machine a abdos",
  "Add Set": "Ajouter une serie",
  Advanced: "Avance",
  "All": "Tous",
  "All training": "Tout entrainement",
  "Back": "Dos",
  "Back Monster": "Monstre du dos",
  "Back volume plus curls.": "Volume dos avec curls.",
  "Back to exercises": "Retour aux exercices",
  "Badges Earned": "Badges gagnes",
  "Best PRs": "Meilleurs RP",
  Beginner: "Debutant",
  "Bench Press": "Developpe couche",
  Biceps: "Biceps",
  Bronze: "Bronze",
  "Burn 1000 calories": "Bruler 1000 calories",
  "Browse exercises by muscle group, equipment, and difficulty.": "Parcours les exercices par groupe musculaire, materiel et difficulte.",
  "Calories": "Calories",
  Cardio: "Cardio",
  Chest: "Pectoraux",
  "Chest Warrior": "Guerrier des pecs",
  "Challenge progress updates from saved workouts.": "Les defis se mettent a jour avec les entrainements sauvegardes.",
  Challenges: "Defis",
  "Change photo": "Changer la photo",
  "Choose User": "Choisir un utilisateur",
  "Clean and Press": "Clean and Press",
  "Common Mistakes": "Erreurs courantes",
  "Complete 100 push-ups total": "Completer 100 pompes au total",
  "Complete 4 workouts this week": "Completer 4 entrainements cette semaine",
  "Complete abs workout 3 times": "Faire les abdos 3 fois",
  "Complete at least one set before saving.": "Complete au moins une serie avant de sauvegarder.",
  "Complete exercise": "Exercice termine",
  "Complete four workouts in one week.": "Complete quatre entrainements en une semaine.",
  "Complete multiple leg sessions.": "Complete plusieurs seances jambes.",
  "Complete workout": "Entrainement termine",
  "Complete your first saved workout.": "Complete ton premier entrainement sauvegarde.",
  Completed: "Termine",
  "Current streak": "Serie actuelle",
  Dashboard: "Tableau de bord",
  Detail: "Details",
  Diamond: "Diamant",
  "Estimated calories from completed exercises count toward this.": "Les calories estimees des exercices termines comptent pour ce defi.",
  "Exercise Library": "Bibliotheque d'exercices",
  "Exercise notes": "Notes de l'exercice",
  Exercises: "Exercices",
  "Favorite focus": "Focus favori",
  "Finish four saved workouts before the week ends.": "Termine quatre entrainements sauvegardes avant la fin de la semaine.",
  "Finish repeated core sessions.": "Termine plusieurs seances de gainage et abdos.",
  "First Workout": "Premier entrainement",
  "Full Body": "Corps complet",
  Gold: "Or",
  "Heavy chest day felt solid.": "Grosse seance pecs solide.",
  "In progress": "En cours",
  "Intermediate": "Intermediaire",
  "Invalid profile picture.": "Photo de profil invalide.",
  "Keep the pressure on with points, ranks, badges, and streaks.": "Garde la pression avec points, rangs, badges et series.",
  Leaderboard: "Classement",
  Legs: "Jambes",
  "Leg Beast": "Bete des jambes",
  Legend: "Legende",
  "Lean muscle gain": "Prise de muscle propre",
  "Loading": "Chargement",
  "Loading challenges": "Chargement des defis",
  "Loading dashboard": "Chargement du tableau de bord",
  "Loading exercise": "Chargement de l'exercice",
  "Loading exercises": "Chargement des exercices",
  "Loading leaderboard": "Chargement du classement",
  "Loading profile": "Chargement du profil",
  "Loading tracker": "Chargement du tracker",
  "Log a personal record.": "Enregistre un record personnel.",
  "Log sets, reps, weight, notes, and personal records.": "Enregistre series, reps, poids, notes et records personnels.",
  "Log out": "Se deconnecter",
  "Login failed.": "Connexion impossible.",
  Loop: "Boucle",
  "Max Rank": "Rang max",
  Master: "Maitre",
  "Media": "Media",
  "No badges yet.": "Pas encore de badges.",
  "No exercises selected": "Aucun exercice selectionne",
  "No personal records yet.": "Pas encore de records personnels.",
  "No PR yet": "Pas encore de RP",
  "No saved workouts yet.": "Aucun entrainement sauvegarde.",
  "No workouts saved yet.": "Aucun entrainement sauvegarde.",
  "Only Slim, Adel, and Saber can log in.": "Seuls Slim, Adel et Saber peuvent se connecter.",
  "Only the fixed rivals can enter.": "Seuls les rivaux fixes peuvent entrer.",
  "Original motion": "Mouvement original",
  "Personal record": "Record personnel",
  "Personal Record King": "Roi des records perso",
  "Personal Records": "Records personnels",
  Platinum: "Platine",
  "Please choose an image file.": "Choisis un fichier image.",
  "Pick exercises from the list to build this session.": "Choisis des exercices dans la liste pour construire cette seance.",
  Points: "Points",
  "Power and athleticism": "Puissance et athleticisme",
  Profile: "Profil",
  "Profile photo updated.": "Photo de profil mise a jour.",
  Rank: "Rang",
  "Recent Workouts": "Entrainements recents",
  Reps: "Reps",
  "Recommended reps": "Reps recommandees",
  "Recommended sets": "Series recommandees",
  "Remove exercise": "Retirer l'exercice",
  "Rival Comparison": "Comparaison des rivaux",
  "Saved workout": "Entrainement sauvegarde",
  "Save Workout": "Sauvegarder",
  Saving: "Sauvegarde",
  "Search exercises": "Chercher des exercices",
  "Selected exercises": "exercices selectionnes",
  "Set": "Serie",
  Sets: "Series",
  Shoulders: "Epaules",
  Silver: "Argent",
  "Slim vs Adel vs Saber": "Slim vs Adel vs Saber",
  "Stack serious chest volume.": "Accumule un gros volume pecs.",
  Start: "Demarrer",
  "Start strong today and make the board move.": "Commence fort aujourd'hui et fais bouger le classement.",
  "Start Exercise": "Demarrer l'exercice",
  Streak: "Serie",
  Streaks: "Series",
  "Step-by-step Instructions": "Instructions etape par etape",
  "Suggested exercises based on your profile focus.": "Exercices proposes selon ton focus de profil.",
  "Strength and conditioning": "Force et condition physique",
  "The next completed set matters.": "La prochaine serie terminee compte.",
  "Top rank reached": "Rang maximal atteint",
  "Total points": "Points totaux",
  "Total points decide the current rivalry order.": "Les points totaux determinent l'ordre de la rivalite.",
  Tracker: "Tracker",
  Training: "Entrainement",
  "Train abs in three separate saved workouts.": "Travaille les abdos dans trois entrainements sauvegardes separes.",
  "Train five days in a row.": "Entraine-toi cinq jours d'affilee.",
  "Train legs twice this week": "Entrainer les jambes deux fois cette semaine",
  "Triceps": "Triceps",
  "Two-player arena": "Arene des rivaux",
  "Upload a square image under 1.5 MB.": "Ajoute une image carree de moins de 1,5 Mo.",
  "Upload failed.": "Echec de l'envoi.",
  "Upload photo": "Ajouter une photo",
  User: "Utilisateur",
  "User not found.": "Utilisateur introuvable.",
  "Weekly": "Semaine",
  "Weekly challenge completed": "Defi hebdo termine",
  "Weekly points": "Points semaine",
  "Weekly Progress": "Progression semaine",
  "Weekly Challenges": "Defis hebdo",
  "Weight kg": "Poids kg",
  "Today's Workout": "Entrainement du jour",
  "Workout History": "Historique des entrainements",
  "Workout notes": "Notes de l'entrainement",
  "Workout saved": "Entrainement sauvegarde",
  "Workout could not be saved.": "Impossible de sauvegarder l'entrainement.",
  "Workout Session": "Seance d'entrainement",
  "Workout saved: +{points} points, {calories} estimated calories.":
    "Entrainement sauvegarde : +{points} points, {calories} calories estimees.",
  "Workout Tracker": "Tracker d'entrainement",
  Workouts: "Entrainements",
  "Workouts completed": "Entrainements termines",
  "You are ahead by {points} points. Protect the lead with one clean session.":
    "Tu es devant de {points} points. Protege l'avance avec une seance propre.",
  "{name} is ahead by {points} points. A focused workout closes the gap fast.":
    "{name} est devant de {points} points. Une seance ciblee peut vite reduire l'ecart.",
  "You are tied. The next completed set matters.": "Vous etes a egalite. La prochaine serie terminee compte.",
  "{points} points to {rank}": "{points} points avant {rank}",
  "days": "jours",
  "focus": "focus",
  "kg": "kg",
  "pts": "pts",
  "workouts": "entrainements"
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function readStoredLanguage(): Language {
  return localStorage.getItem(storageKey) === "fr" ? "fr" : "en";
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template;

  return Object.entries(params).reduce(
    (current, [key, value]) => current.split(`{${key}}`).join(String(value)),
    template
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage());

  useEffect(() => {
    document.documentElement.lang = language === "fr" ? "fr" : "en";
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => {
        setLanguageState(nextLanguage);
        localStorage.setItem(storageKey, nextLanguage);
      },
      t: (key, params) => interpolate(language === "fr" ? fr[key] ?? key : key, params)
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return value;
}
