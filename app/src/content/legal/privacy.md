# Datenschutzerklärung (Deutschland)

_Stand: 16. Januar 2026_

Diese Datenschutzerklärung informiert über Art, Umfang und Zweck der Verarbeitung personenbezogener Daten beim Aufruf und bei der Nutzung der Webanwendung **mecfs-paperwork**.

> **Wichtiger Hinweis (offline-first):** Inhalte, die du in der Anwendung eingibst, werden standardmäßig **nur lokal in deinem Browser** gespeichert (z. B. im IndexedDB-/LocalStorage-Speicher) und **nicht an den Betreiber übertragen**.

---

## 1. Verantwortlicher

Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:

**[[Vollständiger Name]]** (Privatperson)

[[Anschrift]]

E-Mail: deine-mail(at)beispiel.de

> Wenn du diese Anwendung öffentlich betreibst, ersetze die Platzhalter vollständig.

## 2. Grundprinzipien

- **Kein Backend:** Der Betrieb erfolgt als statische Webanwendung (SPA) auf einem NGINX-Webserver.
- **Keine Telemetrie/Analytics:** Es werden keine Tracking- oder Analyse-Dienste eingebunden.
- **Keine Cookies durch die Anwendung:** Die Anwendung setzt keine Cookies zu Tracking- oder Marketingzwecken.

## 3. Hosting und Server-Logfiles

### 3.1 Bereitstellung über Webhosting (NGINX)

Beim Aufruf der Website verarbeitet der Hosting-Anbieter technisch notwendige Verbindungsdaten (Server-Logfiles), um die Website auszuliefern sowie Stabilität und Sicherheit zu gewährleisten.

**Typische Logfile-Daten (können je nach Hosting variieren):**

- IP-Adresse
- Datum und Uhrzeit der Anfrage
- angeforderte Ressource (URL/Pfad)
- HTTP-Statuscode
- übertragene Datenmenge
- Referrer (falls vom Browser übermittelt)
- Browser-/Betriebssystem-Informationen (User-Agent)

### 3.2 Hosting-Anbieter / Auftragsverarbeitung

Geplantes Hosting: **1blu** (1blu AG / 1blu GmbH, je nach Vertrag). Der Hosting-Anbieter verarbeitet die Logfile-Daten als **Auftragsverarbeiter**.

### 3.3 Rechtsgrundlage

Die Verarbeitung von Server-Logfiles erfolgt auf Grundlage von **Art. 6 Abs. 1 lit. f DSGVO** (berechtigtes Interesse an der sicheren und störungsfreien Bereitstellung der Website).

### 3.4 Speicherdauer

Server-Logfiles werden vom Hosting-Anbieter nur so lange gespeichert, wie es für Betrieb und IT-Sicherheit erforderlich ist. Die genaue Dauer hängt vom Hosting-Produkt und den Einstellungen beim Anbieter ab.

**Orientierungswert (1blu):** Nach den Datenschutzhinweisen von 1blu können IP-Adressen zur Nachverfolgung von Angriffen/Fehlern gespeichert werden; Auswertungen zur Webstatistik können mit anonymisierter IP erfolgen und werden typischerweise für einen begrenzten Zeitraum vorgehalten (Details bitte im konkreten Hosting-Vertrag bzw. den 1blu-Hinweisen prüfen).

---

## 4. Lokale Verarbeitung innerhalb der Anwendung (Offline-first)

### 4.1 Welche Daten verarbeitet die Anwendung lokal?

Die Anwendung unterstützt dich beim Ausfüllen von Anträgen/Formularen. Die von dir eingegebenen Inhalte (Formulardaten) können personenbezogene Daten enthalten und – je nach Nutzung – auch **Gesundheitsdaten**. Diese Inhalte werden:

- **nur lokal in deinem Browser gespeichert** (IndexedDB)
- optional als **lokale Snapshots/Versionen** auf deinem Gerät abgelegt,
- **nicht** an den Betreiber übertragen,
- **nicht** an Dritte übermittelt.

Zusätzlich speichert die Anwendung technische Präferenzen lokal (z. B. Spracheinstellung `mecfs-paperwork.locale` sowie pro Formpack die zuletzt aktive Record-ID `mecfs-paperwork.activeRecordId.<formpackId>` in `localStorage`).

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

Wir setzen technische und organisatorische Maßnahmen ein, um die Anwendung und den Betrieb zu sichern (z. B. aktuelle Server-Software, Transportverschlüsselung per HTTPS, restriktive Security-Header im NGINX-Setup). Bitte beachte, dass die Datensicherheit auch von deinem Endgerät, Browser und deiner eigenen Handhabung (insbesondere bei Exporten) abhängt.

---

## 11. Änderungen dieser Datenschutzerklärung

Diese Datenschutzerklärung kann angepasst werden, wenn sich Funktionen oder der Betrieb ändern (z. B. neue Exportformate, zusätzliche UI-Funktionen, Hosting-Wechsel). Das Datum oben wird dann aktualisiert.
