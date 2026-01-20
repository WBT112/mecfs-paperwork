# Datenschutzerklärung (Deutschland)

_Stand: 19. Januar 2026_

Diese Datenschutzerklärung informiert über Art, Umfang und Zweck der Verarbeitung personenbezogener Daten beim Aufruf und bei der Nutzung der Webanwendung **mecfs-paperwork**.

> **Wichtiger Hinweis (offline-first):** Inhalte, die du in der Anwendung eingibst, werden standardmäßig **nur lokal in deinem Browser** gespeichert (z. B. im IndexedDB-/LocalStorage-Speicher) und **nicht an den Betreiber übertragen**.

---

## 1. Verantwortlicher

Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:

**Tobias Greifzu** (Privatperson)

Erfurter Str. 31E |
98693 Ilmenau |
Deutschland

E-Mail: info **(at)** mecfs-paperwork.de

## 2. Grundprinzipien

- **Kein Backend:** Der Betrieb erfolgt als statische Webanwendung (SPA) auf einem NGINX-Webserver.
- **Keine Telemetrie/Analytics:** Es werden keine Tracking- oder Analyse-Dienste eingebunden.
- **Keine Cookies durch die Anwendung:** Die Anwendung setzt keine Cookies zu Tracking- oder Marketingzwecken.

## 3. Hosting und Server-Logfiles

### 3.1 Bereitstellung über Webhosting (NGINX)

Beim Aufruf der Website verarbeitet der Hosting-Anbieter **(1blu)** technisch notwendige Verbindungsdaten (Server-Logfiles), um die Website auszuliefern sowie Stabilität und Sicherheit zu gewährleisten.

**Typische Logfile-Daten:**

- IP-Adresse
- Datum und Uhrzeit der Anfrage
- angeforderte Ressource (URL/Pfad)
- HTTP-Statuscode
- übertragene Datenmenge
- Referrer (falls vom Browser übermittelt)
- Browser-/Betriebssystem-Informationen (User-Agent)

### 3.2 Hosting-Anbieter / Auftragsverarbeitung

**1blu GmbH**, Riedemannweg 60, 13627 Berlin, Deutschland.

Der Hosting-Anbieter verarbeitet personenbezogene Daten (insbesondere Server-Logfiles) als **Auftragsverarbeiter** auf Grundlage eines **Vertrags über die Auftragsverarbeitung gemäß Art. 28 DSGVO**.

### 3.3 Rechtsgrundlage

Die Verarbeitung von Server-Logfiles erfolgt auf Grundlage von **Art. 6 Abs. 1 lit. f DSGVO** (berechtigtes Interesse an der sicheren und störungsfreien Bereitstellung der Website).

### 3.4 Speicherdauer / Log-Rotation / IP-Pseudonymisierung

Server-Logfiles werden vom Hosting-Anbieter nur so lange gespeichert, wie es für Betrieb und IT-Sicherheit erforderlich ist.

Zur Datenminimierung und Pseudonymisierung werden u. a. folgende Maßnahmen beschrieben:

- IP-Adressen werden nur **vollständig** erfasst, soweit dies für den ordnungsgemäßen Serverbetrieb erforderlich ist (z. B. Abwehr von Angriffen / Missbrauchserkennung).
- Logdateien mit **unverfälschten** IP-Adressen werden automatisiert **rotiert**.
- Bei länger gespeicherten IP-Adressen (z. B. für Statistikzwecke) erfolgt eine **Unkenntlichmachung** (Maskierung) eines Oktetts (IPv4) bzw. eines Hextetts (IPv6), sodass keine eindeutige Zuordnung zu einer Person mehr möglich ist.

### 3.5 Verarbeitung innerhalb EU/EWR und Drittlandtransfers

Die vertraglich vereinbarten Leistungen werden **ausschließlich in der EU bzw. im EWR** erbracht.  
Eine Verlagerung der Dienstleistung oder von Teilarbeiten in ein **Drittland** erfolgt nur auf dokumentierte Weisung und nur, wenn die Voraussetzungen der **Art. 44 ff. DSGVO** erfüllt sind.

### 3.6 Unterauftragsverarbeiter (Subunternehmer)

Der Hosting-Anbieter setzt für bestimmte Leistungen (z. B. Server-/Netzwerkverwaltung, Support, IT-Beratung, Domainregistrierung) **Unterauftragsverarbeiter** ein. Im AV-Vertrag werden derzeit u. a. genannt:

- **1blu business GmbH**, Riedemannweg 60, 13627 Berlin, Deutschland
- **Greatnet.de GmbH**, Riedemannweg 60, 13627 Berlin, Deutschland
- **OMCnet Internet Service GmbH**, Ernst-Abbe-Straße 10, 25451 Quickborn, Deutschland

Änderungen (Hinzuziehung/Ersetzung) von Unterauftragnehmern werden vorab angekündigt; es besteht eine Widerspruchsmöglichkeit aus sachlichem Grund.

### 3.7 Technische und organisatorische Maßnahmen (TOM)

Der Hosting-Anbieter setzt technische und organisatorische Maßnahmen nach **Art. 32 DSGVO** ein. Dazu zählen zusammengefasst u. a.:

- **Zutritts- und Zugangskontrollen** (z. B. gesicherter Rechenzentrumszugang, personalisierte Accounts, rollenbasierte Berechtigungen, Protokollierung)
- **Verschlüsselung/gesicherte Übertragung** für administrative Zugriffe (z. B. VPN/SSH) und, wo möglich, Verschlüsselung (z. B. PGP für E-Mail)
- **Integrität & Nachvollziehbarkeit** (Protokollierung zentraler Vorgänge, Versionierung für essentielle Systeme)
- **Verfügbarkeit & Resilienz** (Backup-/Recovery-Konzept, tägliche Backups, RAID, USV/Notstrom, redundante Netzanbindung)
- **Regelmäßige Überprüfung/Evaluation** der Wirksamkeit der TOM (mindestens jährlich) und Aktualisierung nach Stand der Technik
- **Dokumentierte Datenträgervernichtung** durch zertifizierte Dienstleister

Weitere Details können im Vertrag über die Auftragsverarbeitung (inkl. Anlagen) eingesehen werden.

### 3.8 Datenschutzbeauftragter des Hosting-Anbieters

Kontakt laut AV-Vertrag:  
**1blu GmbH – Datenschutzbeauftragter**, Riedemannweg 60, 13627 Berlin, Deutschland

---

## 4. Lokale Verarbeitung innerhalb der Anwendung (Offline-first)

### 4.1 Welche Daten verarbeitet die Anwendung lokal?

Die Anwendung unterstützt dich beim Ausfüllen von Anträgen/Formularen. Die von dir eingegebenen Inhalte (Formulardaten) können personenbezogene Daten enthalten und – je nach Nutzung – auch **Gesundheitsdaten**. Diese Inhalte werden:

- **nur lokal in deinem Browser gespeichert** (IndexedDB)
- optional als **lokale Snapshots/Versionen** auf deinem Gerät abgelegt,
- **nicht** an den Betreiber übertragen,
- **nicht** an Dritte übermittelt.

Zusätzlich speichert die Anwendung technische Präferenzen lokal (z. B. die zuletzte gewählte Spracheinstellung).

### 4.2 Rechtsgrundlage

Die lokale Verarbeitung erfolgt zur Bereitstellung der von dir angeforderten Funktionen der Anwendung und damit auf Grundlage von **Art. 6 Abs. 1 lit. b DSGVO** (Nutzungsverhältnis) bzw. hilfsweise **Art. 6 Abs. 1 lit. f DSGVO** (berechtigtes Interesse an der Bereitstellung eines offline-first Tools).

### 4.3 Speicherdauer und Löschung

Die lokal gespeicherten Daten verbleiben in deinem Browser, bis du sie löschst (z. B. durch Browser-Funktion „Website-Daten löschen“ oder über künftige Löschfunktionen der App).

---

## 5. Import/Export (JSON/DOCX)

Die Anwendung kann Inhalte in Dateien exportieren (z. B. JSON oder DOCX). Die Datei-Erstellung erfolgt **client-seitig** in deinem Browser. Der Betreiber erhält dabei keine Kopie.

**Hinweis:** Wenn du exportierte Dateien weitergibst oder in Cloud-Speichern ablegst, liegt die weitere Verarbeitung in deiner Verantwortung.

---

## 6. Kontaktaufnahme / Feedback (E-Mail)

Wenn die Anwendung eine Feedback-Funktion per `mailto:` anbietet, öffnet sie dein lokales E-Mail-Programm mit einer vorbefüllten Nachricht. Dabei gilt:

- Das Versenden erfolgt über deinen E-Mail-Anbieter.
- Der Betreiber erhält die Daten erst, wenn du die E-Mail tatsächlich absendest.
- Bitte sende **keine** sensiblen Daten (insbesondere keine Gesundheitsdaten) per E-Mail.

**Rechtsgrundlage** für die Verarbeitung eingehender E-Mails ist **Art. 6 Abs. 1 lit. b DSGVO** (Bearbeitung deiner Anfrage) bzw. **Art. 6 Abs. 1 lit. f DSGVO**.

**Speicherdauer:** E-Mails werden nur so lange gespeichert, wie es zur Bearbeitung erforderlich ist; gesetzliche Aufbewahrungsfristen bleiben unberührt.

---

## 7. Externe Links (z. B. GitHub, Sponsoring)

Die Anwendung kann Links zu externen Seiten enthalten (z. B. Repository auf GitHub oder Sponsoring-Seiten). Beim Anklicken verlässt du diese Anwendung; es gelten dann die Datenschutzbestimmungen des jeweiligen Anbieters.

---

## 8. Cookies, Tracking und Drittinhalte

- Es werden **keine Tracking-Cookies** gesetzt.
- Es werden **keine Analyse- oder Telemetrie-Dienste** eingebunden.
- Es werden keine externen Schriftarten, CDNs oder Third-Party-Skripte aus der Anwendung heraus geladen (sofern du die App unverändert betreibst).

---

## 9. Deine Rechte

Du hast – soweit personenbezogene Daten durch den Betreiber verarbeitet werden (z. B. Server-Logfiles, E-Mail) – insbesondere folgende Rechte:

- Auskunft (Art. 15 DSGVO)
- Berichtigung (Art. 16 DSGVO)
- Löschung (Art. 17 DSGVO)
- Einschränkung der Verarbeitung (Art. 18 DSGVO)
- Datenübertragbarkeit (Art. 20 DSGVO)
- Widerspruch gegen Verarbeitung auf Basis berechtigter Interessen (Art. 21 DSGVO)
- Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)

---

## 10. Datensicherheit

Ich setze technische und organisatorische Maßnahmen ein, um die Anwendung und den Betrieb zu sichern (z. B. aktuelle Server-Software, Transportverschlüsselung per HTTPS, restriktive Security-Header im NGINX-Setup). Bitte beachte, dass die Datensicherheit auch von deinem Endgerät, Browser und deiner eigenen Handhabung (insbesondere bei Exporten) abhängt.

---

## 11. Änderungen dieser Datenschutzerklärung

Diese Datenschutzerklärung kann angepasst werden, wenn sich Funktionen oder der Betrieb ändern (z. B. neue Exportformate, zusätzliche UI-Funktionen, Hosting-Wechsel). Das Datum oben wird dann aktualisiert.
