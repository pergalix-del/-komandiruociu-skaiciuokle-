// Komandiruotės skaičiuoklės nustatymai (savarankiška versija).
// Pakeitę failą GitHub svetainėje (pieštuko ženklas → Commit changes), po minutės perkraukite skaičiuoklę.
window.KS_CONFIG = {
  // TomTom API raktai: ['pagrindinės paskyros raktas', 'kitos (atsarginės) paskyros raktas'].
  // Kai pagrindinio rakto mėnesio limitas baigiasi, skaičiuoklė pati pereina prie antrojo, o kitą mėnesį grįžta.
  // Palikus '' – kiekvienas darbuotojas raktą galės įrašyti pats skaičiuoklėje (išsaugomas tik jo naršyklėje).
  tomtomKeys: ['', ''],

  // Kur skaityti kuro kainas ir nutarimo dydžius. Tuščia – tiesiai iš šios GitHub saugyklos (kai puslapis
  // atidaromas iš github.io) arba iš aplanko data/ šalia puslapio.
  dataUrl: '',

  // Saugyklos šaka, kurioje kasdieniai scenarijai įrašo duomenis.
  branch: 'main'
};
