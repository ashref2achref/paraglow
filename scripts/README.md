# Maintenance de la base de données SQLite

Pour optimiser et réduire la taille physique du fichier de base de données `dev.db` après d'importantes suppressions (comme le vidage de la corbeille ou la purge de logs), vous devez exécuter la commande `VACUUM`.

## Commande manuelle

Pour lancer la commande `VACUUM` directement sur la base de données SQLite en production ou en développement, exécutez la commande suivante depuis votre terminal :

```bash
sqlite3 dev.db "VACUUM;"
```

*Note : Il est fortement recommandé d'effectuer une sauvegarde par copie physique de `dev.db` avant de lancer la commande `VACUUM`.*
