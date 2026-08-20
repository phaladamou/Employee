# WORKLOG — Employee

## Mission : Analyse des 5 problèmes les plus importants de `src/agent`

### Contexte
Analysé en profondeur l'architecture du dossier `src/agent` du projet employee-main, en particulier les fichiers : `loop.ts`, `policy-engine.ts`, `tools.ts`, `system-prompt.ts`, `spend-tracker.ts`, `injection-defenses.ts`, `loop-detector.ts`, `context.ts`.

---

## 5 Problèmes les plus importants + Corrections proposées

### Problème 1 : Absence de limites strictes de coût par tour d'exécution
**Fichier** : `loop.ts` / `spend-tracker.ts`
**Gravité** : Critique
**Description** : La boucle ReAct ne vérifie pas le coût d'inférence cumulé **avant** chaque itération. Un agent dans une boucle de raisonnement peut dépenser tout son budget de crédits en quelques centaines de tours sans garde-fou actif. Le `spend-tracker` enregistre les dépenses *a posteriori* mais ne sert pas de circuit-breaker proactif.

**Correction** : Ajouter une vérification `if (spendTracker.estimateCentsSince(lastCheck) > MAX_TOUR_COST_CENTS)` au début de chaque itération de la boucle, qui force un arrêt propre (persist de l'état, pause de la boucle) dès que le plafond est dépassé. Rendre le plafond configurable dynamiquement selon le budget restant.

---

### Problème 2 : Réponses du modèle non sanitisées avant exécution des outils
**Fichier** : `tools.ts` / `injection-defenses.ts`
**Gravité** : Élevé
**Description** : Les arguments extraits de la réponse JSON du modèle sont validés par schéma, mais les **chaînes de caractères** (ex. commandes shell, chemins de fichiers) passent directement à l'exécution sans assainissement sémantique. Un modèle compromis (ou une injection par le contenu d'un fichier lu) peut faire passer des payloads malveillants (ex. `; rm -rf`, `& cmd`).

**Correction** : Ajouter une couche `sanitizeToolInput(tool, args)` dans `tools.ts` qui applique, selon la catégorie de l'outil, un profonde validation : pour `exec`, interdire les opérateurs de chaînage (`;`, `&&`, `|`) sauf cas explicitement autorisés ; pour `file`, restreindre les chemins à un périmètre défini. Journaliser chaque entrée assainie.

---

### Problème 3 : Détection de boucle trop tardive (pas de "déjà vu")
**Fichier** : `loop-detector.ts`
**Gravité** : Moyen
**Description** : Le détecteur de boucles repose sur des seuils de répétition (mêmes actions N fois de suite), mais ne détecte pas les **cycles longs** (ex. séquences récurrentes de 5-6 actions différentes qui se répètent). Un agent peut ainsi tourner en rond pendant des heures sans être arrêté, gaspillant des crédits.

**Correction** : Implémenter une signature d'état de **hachage glissant** : calculer un hash de la séquence des N dernières actions (N=8). Si le même hash réapparaît 3 fois dans une fenêtre de 50 actions, déclencher l'alerte de boucle et proposer au parent une intervention. Ceci capture les cycles de toute longueur.

---

### Problème 4 : Aucun fallback en cas d'échec du modèle d'inférence
**Fichier** : `loop.ts`
**Gravité** : Élevé
**Description** : La boucle utilise un seul modèle d'inférence (ex. `deepseek-chat`). Si l'API renvoie une erreur persistante, un timeout, ou un quota dépassé, l'agent reste bloqué dans un retry infini ou un échec définitif. Aucun modèle de secours n'est configuré, et la boucle ne bascule pas automatiquement vers un fournisseur alternatif.

**Correction** : Ajouter un mécanisme de **failover multi-modèles** : configurer une liste ordonnée de modèles (primaire ? secondaire ? tertiaire). En cas d'erreur HTTP 5xx, de timeout ou de `quota_exceeded`, basculer automatiquement vers le modèle suivant après 2 tentatives, et notifier le parent de la bascule. Mémoriser le modèle dégradé pour le prochain cycle.

---

### Problème 5 : Persistance insuffisante des décisions de la policy-engine
**Fichier** : `policy-engine.ts`
**Gravité** : Moyen
**Description** : Le moteur de politiques journalise chaque décision en base de données, mais ne **réutilise pas** l'historique des décisions pour apprendre ou s'adapter. Exemple : si une action de type A est refusée 50 fois, la politique pourrait le signaler comme schéma problématique. Aujourd'hui, chaque décision est traitée isolément, sans vue d'ensemble.

**Correction** : Ajouter une analyse agrégée : exposer une requête SQL qui compte les refus par règle et par outil sur les dernières 24h. Si une règle génère plus de X refus par heure, lever un signal (log + notification au parent) pour qu'une règle plus stricte ou un contournement soit envisagé. Ceci transforme la policy-engine en système apprenant.

---

## Récapitulatif (tableau)

| # | Problème | Fichier | Gravité | Correction |
|---|----------|---------|---------|------------|
| 1 | Pas de plafond de coût par tour | loop.ts / spend-tracker.ts | Critique | Circuit-breaker `MAX_TOUR_COST_CENTS` |
| 2 | Arguments non sanitisés | tools.ts | Élevé | `sanitizeToolInput()` par catégorie |
| 3 | Détection de boucle tardive | loop-detector.ts | Moyen | Hachage glissant de la séquence d'actions |
| 4 | Aucun failover de modèle | loop.ts | Élevé | Liste de modèles + bascule auto |
| 5 | Décisions non agrégées | policy-engine.ts | Moyen | Analyse SQL des refus / règles |

---

## Conclusion
Ces 5 correctifs rendraient l'agent nettement plus robuste, économe et sûr :
- **Garde-fou budgétaire** (P1) : évite la mort par épuisement des crédits,
- **Assainissement** (P2) : protège contre les injections et le sabotage,
- **Anti-boucle avancé** (P3) : élimine les cycles longs silencieux,
- **Résilience modèle** (P4) : garantit la continuité de service,
- **Policy apprenante** (P5) : améliore la sécurité par l'analyse des schémas.

Les priorités d'implémentation recommandées : P1 (critique) ? P4 (élevé) ? P2 (élevé) ? P3 (moyen) ? P5 (moyen).

